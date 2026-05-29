import { db } from "@/lib/db";
import type { WorkflowStepConfig } from "./types";

export type WorkflowWaitEvent = "link_clicked" | "replied";

export type EnrollmentWaitContext = {
  waitingFor?: WorkflowWaitEvent;
  waitStartedAt?: string;
  waitNodeId?: string;
  eventReceived?: boolean;
  conditionWaiting?: boolean;
  conditionNodeId?: string;
};

const DEFAULT_WAIT_TIMEOUT_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function parseEnrollmentWaitContext(raw: unknown): EnrollmentWaitContext {
  if (!raw || typeof raw !== "object") return {};
  const ctx = raw as EnrollmentWaitContext;
  return {
    waitingFor: ctx.waitingFor,
    waitStartedAt: ctx.waitStartedAt,
    waitNodeId: ctx.waitNodeId,
    eventReceived: ctx.eventReceived,
    conditionWaiting: ctx.conditionWaiting,
    conditionNodeId: ctx.conditionNodeId,
  };
}

export function resolveWaitTimeoutSeconds(config: WorkflowStepConfig): number {
  const value = config.waitTimeoutSeconds;
  if (typeof value === "number" && value > 0) return value;
  return DEFAULT_WAIT_TIMEOUT_SECONDS;
}

export function waitEventFromConditionPreset(preset: string): WorkflowWaitEvent | null {
  if (preset === "link_clicked" || preset === "replied") return preset;
  return null;
}

export async function checkWaitEvent(
  prospectId: string,
  event: WorkflowWaitEvent,
  since?: Date | null,
): Promise<boolean> {
  switch (event) {
    case "link_clicked":
      return checkLinkClicked(prospectId, since);
    case "replied":
      return checkReplied(prospectId, since);
    default:
      return false;
  }
}

async function checkLinkClicked(prospectId: string, since?: Date | null): Promise<boolean> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: { tags: true },
  });
  if (!prospect) return false;

  if ((prospect.tags ?? []).some((t) => t.toLowerCase().includes("link-click"))) {
    return true;
  }

  const clickActivity = await db.activity.findFirst({
    where: {
      prospectId,
      ...(since ? { createdAt: { gte: since } } : {}),
      OR: [
        { title: { contains: "link", mode: "insensitive" } },
        { type: "VISIT" },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return Boolean(clickActivity);
}

async function checkReplied(prospectId: string, since?: Date | null): Promise<boolean> {
  const inbound = await db.message.findFirst({
    where: {
      direction: "INBOUND",
      conversation: { prospectId },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return Boolean(inbound);
}

export function computeWaitDeadline(timeoutSeconds: number): Date {
  if (timeoutSeconds <= 0) {
    return new Date("2099-01-01T00:00:00.000Z");
  }
  return new Date(Date.now() + timeoutSeconds * 1000);
}
