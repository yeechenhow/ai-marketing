"use client";

import { STEP_CATALOG } from "@/lib/workflows/node-catalog";
import type { WorkflowStepType } from "@/lib/workflows/types";
import {
  Clock,
  GitBranch,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  Split,
  Tag,
  Webhook,
  X,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  clock: Clock,
  sparkles: Sparkles,
  "message-square": MessageSquare,
  mail: Mail,
  phone: Phone,
  tag: Tag,
  "git-branch": GitBranch,
  webhook: Webhook,
  split: Split,
};

export function StepPickerPanel({
  onSelect,
  onClose,
}: {
  onSelect: (stepType: WorkflowStepType) => void;
  onClose: () => void;
}) {
  const steps = STEP_CATALOG.filter((s) => s.stepType !== "trigger");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">Add workflow step</h3>
            <p className="text-xs text-slate-500">Choose what happens next in this funnel</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid max-h-[60vh] gap-2 overflow-y-auto p-4 sm:grid-cols-2">
          {steps.map((step) => {
            const Icon = ICONS[step.icon] ?? Sparkles;
            return (
              <button
                key={step.stepType}
                type="button"
                onClick={() => onSelect(step.stepType)}
                className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.defaultSubtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
