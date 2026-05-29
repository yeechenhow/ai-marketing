import { db } from "@/lib/db";
import type { FunnelChannel } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { parseWorkflowGraph, findNextNodeId } from "@/lib/workflows/layout";
import { resolveConditionPreset } from "@/lib/workflows/condition-presets";
import type { WorkflowGraph, WorkflowNodeData } from "@/lib/workflows/types";
import { sendChannelMessage, type SendChannel } from "@/lib/workflows/channels";
import { evaluateSendCompliance } from "@/lib/workflows/compliance";
import { resolveAiConfig } from "@/lib/ai/settings";
import { completeChatText } from "@/lib/ai/client";
import {
  checkWaitEvent,
  computeWaitDeadline,
  parseEnrollmentWaitContext,
  resolveWaitTimeoutSeconds,
  waitEventFromConditionPreset,
  type EnrollmentWaitContext,
  type WorkflowWaitEvent,
} from "@/lib/workflows/wait-events";

const MAX_STEPS_PER_TICK = 25;
const DEFAULT_WAIT_SECONDS = 30;

type GraphNode = WorkflowGraph["nodes"][number];

type StepOutcome =
  | {
      outcome: "done";
      status: "SUCCESS" | "SKIPPED" | "FAILED";
      detail: string;
      simulated?: boolean;
    }
  | { outcome: "retry"; retryAt: Date; detail: string }
  | { outcome: "stop"; status: "SUCCESS" | "FAILED"; detail: string }
  | { outcome: "branch"; branch: "yes" | "no"; detail: string };

// ─── Enrollment ──────────────────────────────────────────────────────────────

export async function enrollProspectInWorkflow(input: {
  organizationId: string;
  workflowId: string;
  prospectId: string;
  campaignId?: string;
}): Promise<{ enrolled: boolean; reason?: string; enrollmentId?: string }> {
  const workflow = await db.workflow.findFirst({
    where: { id: input.workflowId, organizationId: input.organizationId },
  });
  if (!workflow) return { enrolled: false, reason: "Workflow not found" };

  const graph = parseWorkflowGraph(workflow.graph);
  if (!graph || graph.nodes.length === 0) {
    return { enrolled: false, reason: "Workflow has no steps" };
  }

  const startNode = findStartNode(graph);
  if (!startNode) return { enrolled: false, reason: "Workflow has no entry node" };

  const existing = await db.workflowEnrollment.findUnique({
    where: { workflowId_prospectId: { workflowId: input.workflowId, prospectId: input.prospectId } },
  });
  if (existing) {
    return { enrolled: false, reason: "Already enrolled", enrollmentId: existing.id };
  }

  const enrollment = await db.workflowEnrollment.create({
    data: {
      organizationId: input.organizationId,
      workflowId: input.workflowId,
      prospectId: input.prospectId,
      campaignId: input.campaignId,
      status: "ACTIVE",
      currentNodeId: startNode.id,
      nextRunAt: new Date(),
    },
  });

  return { enrolled: true, enrollmentId: enrollment.id };
}

/** Enroll a prospect into the workflow attached to a campaign (if active). */
export async function enrollFromCampaign(input: {
  organizationId: string;
  prospectId: string;
  campaignId?: string | null;
}): Promise<void> {
  if (!input.campaignId) return;

  const campaign = await db.campaign.findFirst({
    where: { id: input.campaignId, organizationId: input.organizationId },
    select: { workflowId: true, workflow: { select: { isActive: true } } },
  });

  if (!campaign?.workflowId || !campaign.workflow?.isActive) return;

  try {
    await enrollProspectInWorkflow({
      organizationId: input.organizationId,
      workflowId: campaign.workflowId,
      prospectId: input.prospectId,
      campaignId: input.campaignId,
    });
  } catch (error) {
    console.error("[workflow enrollFromCampaign]", error);
  }
}

// ─── Tick / runner ─────────────────────────────────────────────────────────

export async function runWorkflowTick(limit = 50): Promise<{
  processed: number;
  completed: number;
  failed: number;
}> {
  const now = new Date();
  const due = await db.workflowEnrollment.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    orderBy: { nextRunAt: "asc" },
    take: limit,
    include: { workflow: true },
  });

  let completed = 0;
  let failed = 0;

  for (const enrollment of due) {
    try {
      const result = await processEnrollment(enrollment.id);
      if (result === "completed") completed++;
      if (result === "failed") failed++;
    } catch (error) {
      failed++;
      await db.workflowEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "FAILED",
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  return { processed: due.length, completed, failed };
}

/** Wake enrollments parked on an event wait (link click, reply, etc.). */
export async function resumeWorkflowsForProspect(input: {
  prospectId: string;
  event: WorkflowWaitEvent;
}): Promise<{ resumed: number }> {
  const enrollments = await db.workflowEnrollment.findMany({
    where: {
      prospectId: input.prospectId,
      status: "ACTIVE",
    },
  });

  let resumed = 0;
  const now = new Date();

  for (const enrollment of enrollments) {
    const ctx = parseEnrollmentWaitContext(enrollment.context);
    const waitingForEvent =
      ctx.waitingFor === input.event ||
      (ctx.conditionWaiting && ctx.waitingFor === input.event);

    if (!waitingForEvent) continue;

    await db.workflowEnrollment.update({
      where: { id: enrollment.id },
      data: {
        nextRunAt: now,
        context: {
          ...ctx,
          eventReceived: true,
        } satisfies EnrollmentWaitContext as Prisma.InputJsonValue,
      },
    });
    resumed++;
  }

  return { resumed };
}

async function processEnrollment(
  enrollmentId: string,
): Promise<"completed" | "waiting" | "failed"> {
  const enrollment = await db.workflowEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { workflow: true },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") return "waiting";

  const graph = parseWorkflowGraph(enrollment.workflow.graph);
  if (!graph) {
    await db.workflowEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "FAILED", lastError: "Workflow graph is invalid" },
    });
    return "failed";
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const defaultChannel = mapFunnelChannelToSend(enrollment.workflow.channelType);
  let currentId: string | null = enrollment.currentNodeId ?? findStartNode(graph)?.id ?? null;
  let waitContext = parseEnrollmentWaitContext(enrollment.context);

  for (let step = 0; step < MAX_STEPS_PER_TICK; step++) {
    if (!currentId) {
      await completeEnrollment(enrollmentId);
      return "completed";
    }

    const node = nodeById.get(currentId);
    if (!node) {
      await completeEnrollment(enrollmentId);
      return "completed";
    }

    const stepType = node.data.stepType;

    if (stepType === "trigger") {
      const nextId = findNextNodeId(graph, node.id);
      if (!nextId) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      currentId = nextId;
      const nextNode = nodeById.get(nextId);
      if (!nextNode) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      const advanced = await advance(enrollmentId, nextNode, nextNode.data.config);
      if (advanced === "wait") return "waiting";
      continue;
    }

    if (stepType === "wait") {
      const waitOutcome = await handleWaitStep({
        enrollmentId,
        enrollment,
        node,
        waitContext,
      });
      if (waitOutcome === "waiting") return "waiting";
      waitContext = {};

      const nextId = findNextNodeId(graph, node.id);
      if (!nextId) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      currentId = nextId;
      const nextNode = nodeById.get(nextId);
      if (!nextNode) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      const advanced = await advance(enrollmentId, nextNode, nextNode.data.config);
      if (advanced === "wait") return "waiting";
      continue;
    }

    // Branch nodes evaluate and route without separate execution log semantics.
    if (stepType === "condition") {
      const conditionMode = node.data.config.conditionMode ?? "instant";
      const preset = resolveConditionPreset(node.data.config);
      const waitEvent = waitEventFromConditionPreset(preset);

      if (
        waitContext.conditionWaiting &&
        waitContext.conditionNodeId === node.id &&
        waitEvent
      ) {
        const since = waitContext.waitStartedAt ? new Date(waitContext.waitStartedAt) : null;
        const timedOut =
          enrollment.nextRunAt !== null && enrollment.nextRunAt <= new Date();

        if (
          !waitContext.eventReceived &&
          !timedOut &&
          !(await checkWaitEvent(enrollment.prospectId, waitEvent, since))
        ) {
          return "waiting";
        }

        await clearEnrollmentWait(enrollmentId);
        waitContext = {};
      } else if (conditionMode === "wait" && waitEvent) {
        const since = null;
        const passed = await checkWaitEvent(enrollment.prospectId, waitEvent, since);
        if (!passed) {
          const timeoutSeconds = resolveWaitTimeoutSeconds(node.data.config);
          await db.workflowEnrollment.update({
            where: { id: enrollmentId },
            data: {
              currentNodeId: node.id,
              nextRunAt: computeWaitDeadline(timeoutSeconds),
              context: {
                waitingFor: waitEvent,
                waitStartedAt: new Date().toISOString(),
                conditionNodeId: node.id,
                conditionWaiting: true,
              } satisfies EnrollmentWaitContext as Prisma.InputJsonValue,
            },
          });
          return "waiting";
        }
      }

      const branchResult = await evaluateBranchNode(enrollment.prospectId, node);
      await db.workflowStepExecution.create({
        data: {
          enrollmentId,
          nodeId: node.id,
          stepType,
          status: "SUCCESS",
          detail: branchResult.detail.slice(0, 1000),
        },
      });

      const nextId = findNextNodeId(graph, node.id, branchResult.branch);
      if (!nextId) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      currentId = nextId;
      const nextNode = nodeById.get(nextId);
      if (!nextNode) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      const advanced = await advance(enrollmentId, nextNode, nextNode.data.config);
      if (advanced === "wait") return "waiting";
      continue;
    }

    // Action nodes.
    const result = await executeNode(
      enrollment.organizationId,
      enrollment.prospectId,
      node,
      defaultChannel,
    );
    await db.workflowStepExecution.create({
      data: {
        enrollmentId,
        nodeId: node.id,
        stepType,
        status:
          result.outcome === "retry"
            ? "PENDING"
            : result.outcome === "stop"
              ? result.status
              : result.outcome === "done"
                ? result.status
                : "SUCCESS",
        detail: result.detail.slice(0, 1000),
        simulated: "simulated" in result ? Boolean(result.simulated) : false,
      },
    });

    if (result.outcome === "retry") {
      await db.workflowEnrollment.update({
        where: { id: enrollmentId },
        data: { currentNodeId: node.id, nextRunAt: result.retryAt },
      });
      return "waiting";
    }

    if (result.outcome === "stop") {
      await db.workflowEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: result.status === "FAILED" ? "FAILED" : "COMPLETED",
          completedAt: new Date(),
          nextRunAt: null,
          lastError: result.status === "FAILED" ? result.detail : null,
        },
      });
      return result.status === "FAILED" ? "failed" : "completed";
    }

    if (result.outcome === "branch") {
      const nextId = findNextNodeId(graph, node.id, result.branch);
      if (!nextId) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      currentId = nextId;
      const nextNode = nodeById.get(nextId);
      if (!nextNode) {
        await completeEnrollment(enrollmentId);
        return "completed";
      }
      const advanced = await advance(enrollmentId, nextNode, nextNode.data.config);
      if (advanced === "wait") return "waiting";
      continue;
    }

    const nextId = findNextNodeId(graph, node.id);
    if (!nextId) {
      await completeEnrollment(enrollmentId);
      return "completed";
    }
    currentId = nextId;
    const nextNode = nodeById.get(nextId);
    if (!nextNode) {
      await completeEnrollment(enrollmentId);
      return "completed";
    }
    const advanced = await advance(enrollmentId, nextNode, nextNode.data.config);
    if (advanced === "wait") return "waiting";
  }

  // Hit the per-tick cap — persist position and continue next tick.
  await db.workflowEnrollment.update({
    where: { id: enrollmentId },
    data: { currentNodeId: currentId, nextRunAt: new Date() },
  });
  return "waiting";
}

/**
 * Persists the new current node. If the node is a time wait, schedules the delay
 * and signals the caller to stop processing this tick.
 */
async function advance(
  enrollmentId: string,
  node: GraphNode,
  _config?: WorkflowNodeData["config"],
): Promise<"wait" | "continue"> {
  if (node.data.stepType === "wait") {
    const config = node.data.config ?? {};
    if ((config.waitMode ?? "delay") === "event") {
      await db.workflowEnrollment.update({
        where: { id: enrollmentId },
        data: { currentNodeId: node.id },
      });
      return "continue";
    }
    const seconds = config.waitSeconds ?? DEFAULT_WAIT_SECONDS;
    const nextRunAt = new Date(Date.now() + seconds * 1000);
    await db.workflowEnrollment.update({
      where: { id: enrollmentId },
      data: { currentNodeId: node.id, nextRunAt, context: Prisma.DbNull },
    });
    return "wait";
  }

  await db.workflowEnrollment.update({
    where: { id: enrollmentId },
    data: { currentNodeId: node.id, nextRunAt: new Date() },
  });
  return "continue";
}

async function handleWaitStep(input: {
  enrollmentId: string;
  enrollment: {
    prospectId: string;
    nextRunAt: Date | null;
    context: Prisma.JsonValue | null;
  };
  node: GraphNode;
  waitContext: EnrollmentWaitContext;
}): Promise<"waiting" | "done"> {
  const config = input.node.data.config ?? {};
  const mode = config.waitMode ?? "delay";

  if (mode === "event") {
    const event = config.waitEvent ?? "replied";
    const ctx = input.waitContext;
    const since = ctx.waitStartedAt ? new Date(ctx.waitStartedAt) : null;
    const now = new Date();
    const timedOut = input.enrollment.nextRunAt !== null && input.enrollment.nextRunAt <= now;

    if (ctx.eventReceived && ctx.waitNodeId === input.node.id) {
      await db.workflowStepExecution.create({
        data: {
          enrollmentId: input.enrollmentId,
          nodeId: input.node.id,
          stepType: "wait",
          status: "SUCCESS",
          detail: `Event received: ${event}`,
        },
      });
      await clearEnrollmentWait(input.enrollmentId);
      return "done";
    }

    if (await checkWaitEvent(input.enrollment.prospectId, event, since)) {
      await db.workflowStepExecution.create({
        data: {
          enrollmentId: input.enrollmentId,
          nodeId: input.node.id,
          stepType: "wait",
          status: "SUCCESS",
          detail: `Event detected: ${event}`,
        },
      });
      await clearEnrollmentWait(input.enrollmentId);
      return "done";
    }

    if (timedOut) {
      await db.workflowStepExecution.create({
        data: {
          enrollmentId: input.enrollmentId,
          nodeId: input.node.id,
          stepType: "wait",
          status: "SUCCESS",
          detail: `Timed out waiting for ${event}`,
        },
      });
      await clearEnrollmentWait(input.enrollmentId);
      return "done";
    }

    if (ctx.waitingFor !== event || ctx.waitNodeId !== input.node.id) {
      const timeoutSeconds = resolveWaitTimeoutSeconds(config);
      await db.workflowEnrollment.update({
        where: { id: input.enrollmentId },
        data: {
          currentNodeId: input.node.id,
          nextRunAt: computeWaitDeadline(timeoutSeconds),
          context: {
            waitingFor: event,
            waitStartedAt: now.toISOString(),
            waitNodeId: input.node.id,
          } satisfies EnrollmentWaitContext as Prisma.InputJsonValue,
        },
      });
    }
    return "waiting";
  }

  // Time delay — only advance once nextRunAt has elapsed.
  if (
    input.enrollment.nextRunAt &&
    input.enrollment.nextRunAt > new Date()
  ) {
    return "waiting";
  }

  await db.workflowStepExecution.create({
    data: {
      enrollmentId: input.enrollmentId,
      nodeId: input.node.id,
      stepType: "wait",
      status: "SUCCESS",
      detail: `Waited ${config.waitSeconds ?? DEFAULT_WAIT_SECONDS}s`,
    },
  });
  return "done";
}

async function clearEnrollmentWait(enrollmentId: string) {
  await db.workflowEnrollment.update({
    where: { id: enrollmentId },
    data: { context: Prisma.DbNull },
  });
}

async function completeEnrollment(enrollmentId: string) {
  await db.workflowEnrollment.update({
    where: { id: enrollmentId },
    data: { status: "COMPLETED", completedAt: new Date(), nextRunAt: null },
  });
}

// ─── Step executors ──────────────────────────────────────────────────────────

async function executeNode(
  organizationId: string,
  prospectId: string,
  node: GraphNode,
  defaultChannel: SendChannel,
): Promise<StepOutcome> {
  const data = node.data;
  const config = data.config ?? {};

  switch (data.stepType) {
    case "ai_reply": {
      const compliance = await evaluateSendCompliance(organizationId, prospectId);
      if (compliance.action === "skip") {
        return { outcome: "done", status: "SKIPPED", detail: compliance.reason };
      }
      if (compliance.action === "delay") {
        return { outcome: "retry", retryAt: compliance.until, detail: compliance.reason };
      }
      const body = await generateAiReply(organizationId, prospectId, config.prompt);
      const res = await sendChannelMessage({
        organizationId,
        prospectId,
        channel: defaultChannel,
        body,
      });
      return { outcome: "done", status: "SUCCESS", detail: res.detail, simulated: res.simulated };
    }

    case "sms":
    case "email": {
      const compliance = await evaluateSendCompliance(organizationId, prospectId);
      if (compliance.action === "skip") {
        return { outcome: "done", status: "SKIPPED", detail: compliance.reason };
      }
      if (compliance.action === "delay") {
        return { outcome: "retry", retryAt: compliance.until, detail: compliance.reason };
      }
      const body = await renderTemplate(prospectId, config.message ?? data.label);
      const res = await sendChannelMessage({
        organizationId,
        prospectId,
        channel: data.stepType === "sms" ? "SMS" : "EMAIL",
        body,
      });
      return { outcome: "done", status: "SUCCESS", detail: res.detail, simulated: res.simulated };
    }

    case "human_call": {
      const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
      await db.task.create({
        data: {
          prospectId,
          assigneeId: prospect?.assignedToId ?? null,
          title: data.label || "Call customer",
          description: config.assignTo
            ? `Workflow task — assign: ${config.assignTo}`
            : data.subtitle,
          priority: "HIGH",
          status: "TODO",
          dueAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await db.activity.create({
        data: {
          prospectId,
          type: "TASK_CREATED",
          title: "Workflow created a call task",
          body: data.label,
          metadata: { source: "workflow" },
        },
      });
      return { outcome: "done", status: "SUCCESS", detail: "Created human call task" };
    }

    case "add_tag": {
      const tag = (config.tag ?? "").trim();
      if (!tag) return { outcome: "done", status: "SKIPPED", detail: "No tag configured" };
      const prospect = await db.prospect.findUnique({
        where: { id: prospectId },
        select: { tags: true },
      });
      const tags = new Set(prospect?.tags ?? []);
      tags.add(tag);
      await db.prospect.update({
        where: { id: prospectId },
        data: { tags: Array.from(tags) },
      });
      return { outcome: "done", status: "SUCCESS", detail: `Added tag: ${tag}` };
    }

    case "move_stage": {
      const stage = (config.stageName ?? "").trim().toUpperCase().replace(/\s+/g, "_");
      const valid = [
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "NURTURE",
        "PROPOSAL",
        "NEGOTIATION",
        "WON",
        "LOST",
        "DORMANT",
      ];
      if (!valid.includes(stage)) {
        return { outcome: "done", status: "SKIPPED", detail: `Unknown stage: ${config.stageName}` };
      }
      await db.prospect.update({
        where: { id: prospectId },
        data: { lifecycleStage: stage as never },
      });
      await db.activity.create({
        data: {
          prospectId,
          type: "STAGE_CHANGE",
          title: `Workflow moved stage → ${stage}`,
          metadata: { source: "workflow" },
        },
      });
      return { outcome: "done", status: "SUCCESS", detail: `Moved to ${stage}` };
    }

    case "webhook": {
      const url = (config.url ?? "").trim();
      if (!url) return { outcome: "done", status: "SKIPPED", detail: "No webhook URL" };
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "workflow.step", prospectId, organizationId }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        return { outcome: "done", status: "SUCCESS", detail: `Webhook POST ${res.status}` };
      } catch (error) {
        return {
          outcome: "done",
          status: "FAILED",
          detail: `Webhook failed: ${error instanceof Error ? error.message : "unknown"}`,
        };
      }
    }

    default:
      return { outcome: "done", status: "SKIPPED", detail: `No executor for ${data.stepType}` };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function findStartNode(graph: WorkflowGraph): GraphNode | undefined {
  const trigger = graph.nodes.find((n) => n.data.stepType === "trigger");
  if (trigger) return trigger;
  return [...graph.nodes].sort((a, b) => a.position.y - b.position.y)[0];
}

async function evaluateBranchNode(
  prospectId: string,
  node: GraphNode,
): Promise<{ branch: "yes" | "no"; detail: string }> {
  const config = node.data.config ?? {};
  const preset = resolveConditionPreset(config);
  const passed = await evaluateConditionPreset(prospectId, config);
  return {
    branch: passed ? "yes" : "no",
    detail: passed
      ? `Yes — ${preset.replace(/_/g, " ")} condition met`
      : `No — ${preset.replace(/_/g, " ")} condition not met`,
  };
}

async function evaluateConditionPreset(
  prospectId: string,
  config: WorkflowNodeData["config"],
): Promise<boolean> {
  const preset = resolveConditionPreset(config);

  switch (preset) {
    case "link_clicked":
      return checkWaitEvent(prospectId, "link_clicked");
    case "replied":
      return checkWaitEvent(prospectId, "replied");
    case "ai_qualified":
      return evaluateAiQualified(prospectId);
    case "tag":
      return evaluateCondition(prospectId, "tag", config.conditionValue);
    case "lifecycleStage":
      return evaluateCondition(prospectId, "lifecycleStage", config.conditionValue);
    default:
      return evaluateCondition(prospectId, config.conditionField, config.conditionValue);
  }
}

async function evaluateAiQualified(prospectId: string): Promise<boolean> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: { leadScore: true, personalityProfile: true },
  });
  if (!prospect) return false;

  if (prospect.leadScore && prospect.leadScore.conversionProb >= 0.55) {
    return true;
  }

  const readiness = prospect.personalityProfile?.dealReadiness;
  return readiness === "WARM" || readiness === "SALES_READY" || readiness === "CLOSE_NOW";
}

async function generateAiReply(
  organizationId: string,
  prospectId: string,
  prompt?: string,
): Promise<string> {
  const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
  const name = prospect?.firstName ?? prospect?.whatsappName ?? "there";
  const fallback = prompt
    ? prompt.replace(/\{\{\s*firstName\s*\}\}/gi, name)
    : `Hi ${name}, thanks for reaching out!`;

  try {
    const config = await resolveAiConfig(organizationId);
    if (!config) return fallback;
    const system =
      "You are a helpful sales assistant. Write a short, friendly reply (max 2 sentences). No preamble.";
    const user = `${prompt ?? "Write a warm follow-up message."}\n\nProspect first name: ${name}.`;
    const text = await completeChatText(config, system, user);
    return text.trim() || fallback;
  } catch (error) {
    console.error("[workflow ai_reply]", error);
    return fallback;
  }
}

async function renderTemplate(prospectId: string, template: string): Promise<string> {
  const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
  const first = prospect?.firstName ?? prospect?.whatsappName ?? "there";
  const last = prospect?.lastName ?? "";
  return template
    .replace(/\{\{\s*firstName\s*\}\}/gi, first)
    .replace(/\{\{\s*lastName\s*\}\}/gi, last)
    .replace(/\{\{\s*name\s*\}\}/gi, `${first} ${last}`.trim());
}

async function evaluateCondition(
  prospectId: string,
  field?: string,
  value?: string,
): Promise<boolean> {
  if (!field) return true;
  const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) return false;

  if (field === "tag") {
    return (prospect.tags ?? []).includes(value ?? "");
  }
  if (field === "lifecycleStage") {
    return prospect.lifecycleStage === (value ?? "").toUpperCase();
  }
  const raw = (prospect as unknown as Record<string, unknown>)[field];
  return String(raw ?? "").toLowerCase() === String(value ?? "").toLowerCase();
}

export function mapFunnelChannelToSend(channel: FunnelChannel): SendChannel {
  switch (channel) {
    case "SMS":
      return "SMS";
    case "EMAIL":
      return "EMAIL";
    case "FACEBOOK":
    case "INSTAGRAM":
      return "MESSENGER";
    default:
      return "WHATSAPP";
  }
}

export type { WorkflowNodeData };
export type WorkflowEnrollmentContext = Prisma.JsonValue;
