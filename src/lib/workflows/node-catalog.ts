import type { FunnelChannel } from "@/generated/prisma/client";
import type { WorkflowNodeData, WorkflowStepType } from "./types";

export type StepCatalogItem = {
  stepType: WorkflowStepType;
  label: string;
  defaultSubtitle: string;
  icon: string;
  channels?: FunnelChannel[];
};

export const STEP_CATALOG: StepCatalogItem[] = [
  {
    stepType: "trigger",
    label: "Entry trigger",
    defaultSubtitle: "When a prospect enters this funnel",
    icon: "zap",
  },
  {
    stepType: "wait",
    label: "Wait",
    defaultSubtitle: "Wait 30 seconds",
    icon: "clock",
  },
  {
    stepType: "ai_reply",
    label: "AI reply",
    defaultSubtitle: "ChatGPT respond",
    icon: "sparkles",
  },
  {
    stepType: "sms",
    label: "Send SMS",
    defaultSubtitle: "Reply through SMS",
    icon: "message-square",
  },
  {
    stepType: "email",
    label: "Send email",
    defaultSubtitle: "Automated email step",
    icon: "mail",
  },
  {
    stepType: "human_call",
    label: "Human call task",
    defaultSubtitle: "Assign agent to call customer",
    icon: "phone",
  },
  {
    stepType: "add_tag",
    label: "Add tag",
    defaultSubtitle: "Add tag: chatgpt respond",
    icon: "tag",
  },
  {
    stepType: "move_stage",
    label: "Move pipeline stage",
    defaultSubtitle: "Advance to next stage",
    icon: "git-branch",
  },
  {
    stepType: "webhook",
    label: "Webhook",
    defaultSubtitle: "POST to external URL",
    icon: "webhook",
  },
  {
    stepType: "condition",
    label: "Condition",
    defaultSubtitle: "Branch by field value",
    icon: "split",
  },
];

export const TRIGGER_LABELS: Record<FunnelChannel, string> = {
  GENERIC: "Manual / API entry",
  FACEBOOK: "Facebook lead form submitted",
  YOUTUBE: "YouTube link clicked",
  PROMOTION_URL: "Promotion URL visited",
  WHATSAPP: "WhatsApp message received",
  SMS: "SMS keyword received",
  EMAIL: "Email link clicked",
  INSTAGRAM: "Instagram DM received",
};

export function getStepCatalogItem(stepType: WorkflowStepType) {
  return STEP_CATALOG.find((s) => s.stepType === stepType);
}

export function buildDefaultNodeData(
  stepType: WorkflowStepType,
  channelType: FunnelChannel = "GENERIC",
): WorkflowNodeData {
  const item = getStepCatalogItem(stepType);
  if (!item) {
    return { stepType, label: stepType, config: {} };
  }

  const config: WorkflowNodeData["config"] = {};

  if (stepType === "wait") {
    config.waitSeconds = 30;
    config.waitMode = "delay";
  }
  if (stepType === "ai_reply") {
    config.aiModel = "gpt-4o-mini";
    config.prompt = "Respond helpfully to the prospect.";
  }
  if (stepType === "add_tag") {
    config.tag = "chatgpt respond";
  }
  if (stepType === "sms" || stepType === "email") {
    config.message = "Hi {{firstName}}, thanks for your interest!";
  }
  if (stepType === "human_call") {
    config.assignTo = "next available agent";
  }
  if (stepType === "condition") {
    config.conditionPreset = "replied";
  }

  const subtitle =
    stepType === "trigger"
      ? TRIGGER_LABELS[channelType]
      : stepType === "wait"
        ? "Wait 30 seconds"
        : stepType === "add_tag"
          ? `Add tag: ${config.tag}`
          : stepType === "ai_reply"
            ? `${config.aiModel} respond`
            : stepType === "condition"
              ? "If prospect replied to a message"
              : item.defaultSubtitle;

  return {
    stepType,
    label: stepType === "trigger" ? TRIGGER_LABELS[channelType] : item.label,
    subtitle,
    config,
  };
}
