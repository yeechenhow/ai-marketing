import type { Edge, Node } from "@xyflow/react";
import type { FunnelChannel } from "@/generated/prisma/client";

export type WorkflowStepType =
  | "trigger"
  | "wait"
  | "ai_reply"
  | "sms"
  | "email"
  | "human_call"
  | "add_tag"
  | "move_stage"
  | "webhook"
  | "condition";

export type WorkflowEdgeBranchLabel = "default" | "yes" | "no";

export type WorkflowEdgeData = {
  sourceId?: string;
  branchLabel?: WorkflowEdgeBranchLabel;
};

export type WorkflowStepConfig = {
  waitSeconds?: number;
  waitMode?: "delay" | "event";
  waitEvent?: "link_clicked" | "replied";
  waitTimeoutSeconds?: number;
  tag?: string;
  aiModel?: string;
  prompt?: string;
  message?: string;
  stageName?: string;
  assignTo?: string;
  url?: string;
  conditionPreset?: string;
  conditionField?: string;
  conditionValue?: string;
  conditionMode?: "instant" | "wait";
};

export type WorkflowNodeData = {
  stepType: WorkflowStepType;
  label: string;
  subtitle?: string;
  config: WorkflowStepConfig;
};

export type WorkflowGraph = {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  viewport?: { x: number; y: number; zoom: number };
};

export type WorkflowStepSummary = {
  id: string;
  stepType: WorkflowStepType;
  label: string;
  subtitle?: string;
  config: WorkflowStepConfig;
};

export const FUNNEL_CHANNEL_LABELS: Record<FunnelChannel, string> = {
  GENERIC: "Generic",
  FACEBOOK: "Facebook Campaign",
  YOUTUBE: "YouTube",
  PROMOTION_URL: "Promotion URL",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "Email",
  INSTAGRAM: "Instagram",
};

export const AI_MODEL_OPTIONS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "gemini-pro", label: "Gemini Pro" },
  { value: "deepseek-chat", label: "DeepSeek Chat" },
];
