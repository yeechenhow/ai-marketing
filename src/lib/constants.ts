import type { LifecycleStage, PlatformRole } from "@/generated/prisma/client";

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  NURTURE: "Nurture",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  DORMANT: "Dormant",
};

export const LIFECYCLE_STAGE_COLORS: Record<LifecycleStage, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-indigo-100 text-indigo-700",
  NURTURE: "bg-amber-100 text-amber-700",
  PROPOSAL: "bg-purple-100 text-purple-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
  DORMANT: "bg-gray-100 text-gray-600",
};

export const ROLE_LABELS: Record<PlatformRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Org Admin",
  MANAGER: "Manager",
  AGENT: "Agent",
  ANALYST: "Analyst",
};

export const DEFAULT_FUNNEL_STAGES = [
  { name: "New Lead", order: 0, probability: 0.1 },
  { name: "Contacted", order: 1, probability: 0.2 },
  { name: "Qualified", order: 2, probability: 0.4 },
  { name: "Proposal", order: 3, probability: 0.6 },
  { name: "Negotiation", order: 4, probability: 0.8 },
  { name: "Closed Won", order: 5, probability: 1.0 },
];
