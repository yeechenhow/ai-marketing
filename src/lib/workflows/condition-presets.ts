import type { WorkflowStepConfig } from "./types";

export type ConditionPreset =
  | "link_clicked"
  | "replied"
  | "ai_qualified"
  | "tag"
  | "lifecycleStage"
  | "custom";

export const CONDITION_PRESETS: {
  value: ConditionPreset;
  label: string;
  description: string;
}[] = [
  {
    value: "link_clicked",
    label: "Link clicked",
    description: "Prospect clicked a tracked promotion link",
  },
  {
    value: "replied",
    label: "Replied",
    description: "Prospect sent an inbound message",
  },
  {
    value: "ai_qualified",
    label: "AI qualified",
    description: "Lead score / AI profile indicates sales-ready",
  },
  {
    value: "tag",
    label: "Has tag",
    description: "Prospect has a specific tag",
  },
  {
    value: "lifecycleStage",
    label: "Lifecycle stage",
    description: "Prospect lifecycle matches a value",
  },
  {
    value: "custom",
    label: "Custom field",
    description: "Match any prospect field value",
  },
];

export function conditionPresetSubtitle(preset: ConditionPreset, config: WorkflowStepConfig): string {
  switch (preset) {
    case "link_clicked":
      return "If promotion link was clicked";
    case "replied":
      return "If prospect replied to a message";
    case "ai_qualified":
      return "If AI score indicates qualified";
    case "tag":
      return config.conditionValue ? `If tag is "${config.conditionValue}"` : "If tag matches";
    case "lifecycleStage":
      return config.conditionValue
        ? `If stage is ${config.conditionValue.replace(/_/g, " ")}`
        : "If lifecycle stage matches";
    default:
      return config.conditionField
        ? `If ${config.conditionField} = ${config.conditionValue ?? "…"}`
        : "Branch by field value";
  }
}

export function resolveConditionPreset(config: WorkflowStepConfig): ConditionPreset {
  const preset = config.conditionPreset as ConditionPreset | undefined;
  if (preset && CONDITION_PRESETS.some((p) => p.value === preset)) {
    return preset;
  }
  if (config.conditionField === "tag") return "tag";
  if (config.conditionField === "lifecycleStage") return "lifecycleStage";
  return "custom";
}
