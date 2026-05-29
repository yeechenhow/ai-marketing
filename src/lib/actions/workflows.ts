"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessOrgPortal } from "@/lib/roles";
import type { FunnelChannel, Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createDefaultGraph,
  graphToSteps,
  parseWorkflowGraph,
} from "@/lib/workflows/layout";
import { TRIGGER_LABELS } from "@/lib/workflows/node-catalog";
import type { WorkflowGraph } from "@/lib/workflows/types";
import { enrollProspectInWorkflow, runWorkflowTick } from "@/lib/workflows/engine";

async function requireOrgAdmin() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  if (!canAccessOrgPortal(session.user)) throw new Error("Forbidden");
  return session;
}

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  funnelId: z.string().optional(),
  channelType: z.string(),
});

export async function createWorkflow(formData: FormData) {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const parsed = createWorkflowSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    funnelId: formData.get("funnelId") || undefined,
    channelType: formData.get("channelType") || "GENERIC",
  });

  const channelType = parsed.channelType as FunnelChannel;

  if (parsed.funnelId) {
    const funnel = await db.funnel.findFirst({
      where: { id: parsed.funnelId, organizationId: orgId },
    });
    if (!funnel) throw new Error("Funnel not found");
  }

  const graph = createDefaultGraph(channelType);

  const workflow = await db.workflow.create({
    data: {
      organizationId: orgId,
      funnelId: parsed.funnelId || null,
      name: parsed.name,
      description: parsed.description,
      channelType,
      trigger: { type: channelType, label: TRIGGER_LABELS[channelType] },
      steps: graphToSteps(graph),
      graph: graph as unknown as Prisma.InputJsonValue,
      isActive: false,
    },
  });

  revalidatePath("/org/workflows");
  if (parsed.funnelId) revalidatePath(`/org/pipelines/${parsed.funnelId}`);
  redirect(`/org/workflows/${workflow.id}`);
}

export async function saveWorkflowGraph(
  workflowId: string,
  graphJson: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  let graph: WorkflowGraph;
  try {
    graph = JSON.parse(graphJson) as WorkflowGraph;
  } catch {
    return { ok: false, error: "Invalid workflow graph" };
  }

  if (!parseWorkflowGraph(graph)) {
    return { ok: false, error: "Invalid graph structure" };
  }

  const workflow = await db.workflow.findFirst({
    where: { id: workflowId, organizationId: orgId },
  });
  if (!workflow) return { ok: false, error: "Workflow not found" };

  await db.workflow.update({
    where: { id: workflowId },
    data: {
      steps: graphToSteps(graph),
      graph: graph as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/org/workflows/${workflowId}`);
  return { ok: true };
}

export async function toggleWorkflowActive(workflowId: string, active: boolean) {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  await db.workflow.updateMany({
    where: { id: workflowId, organizationId: orgId },
    data: { isActive: active },
  });

  revalidatePath("/org/workflows");
  revalidatePath(`/org/workflows/${workflowId}`);
}

export async function deleteWorkflow(workflowId: string) {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  await db.workflow.deleteMany({
    where: { id: workflowId, organizationId: orgId },
  });

  revalidatePath("/org/workflows");
  redirect("/org/workflows");
}

/**
 * Test helper: enroll the most recently active prospect into this workflow so
 * the org admin can watch the automation run without waiting for a real lead.
 */
export async function testEnrollLatestProspect(
  workflowId: string,
): Promise<{ ok: boolean; message: string }> {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const prospect = await db.prospect.findFirst({
    where: { organizationId: orgId },
    orderBy: { lastTouchAt: "desc" },
  });
  if (!prospect) {
    return { ok: false, message: "No prospects yet — create one first." };
  }

  const result = await enrollProspectInWorkflow({
    organizationId: orgId,
    workflowId,
    prospectId: prospect.id,
  });

  revalidatePath(`/org/workflows/${workflowId}`);
  const who = prospect.firstName ?? prospect.whatsappName ?? prospect.phone ?? "prospect";
  return result.enrolled
    ? { ok: true, message: `Enrolled ${who}. Click "Process now" to run it.` }
    : { ok: false, message: result.reason ?? "Could not enroll" };
}

/** Runs one engine tick immediately (so admins can see steps execute now). */
export async function processWorkflowsNow(
  workflowId: string,
): Promise<{ ok: boolean; message: string }> {
  await requireOrgAdmin();
  const result = await runWorkflowTick();
  revalidatePath(`/org/workflows/${workflowId}`);
  return {
    ok: true,
    message: `Processed ${result.processed} enrollment(s): ${result.completed} completed, ${result.failed} failed.`,
  };
}
