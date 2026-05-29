"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Clock,
  GitBranch,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Sparkles,
  Tag,
  Webhook,
  Zap,
  Split,
} from "lucide-react";
import type { WorkflowNodeData, WorkflowStepType } from "@/lib/workflows/types";
import { cn } from "@/lib/utils";

const ICONS: Record<WorkflowStepType, React.ComponentType<{ className?: string }>> = {
  trigger: Zap,
  wait: Clock,
  ai_reply: Sparkles,
  sms: MessageSquare,
  email: Mail,
  human_call: Phone,
  add_tag: Tag,
  move_stage: GitBranch,
  webhook: Webhook,
  condition: Split,
};

const ICON_COLORS: Record<WorkflowStepType, string> = {
  trigger: "bg-amber-100 text-amber-700",
  wait: "bg-slate-100 text-slate-600",
  ai_reply: "bg-violet-100 text-violet-700",
  sms: "bg-blue-100 text-blue-700",
  email: "bg-sky-100 text-sky-700",
  human_call: "bg-orange-100 text-orange-700",
  add_tag: "bg-emerald-100 text-emerald-700",
  move_stage: "bg-indigo-100 text-indigo-700",
  webhook: "bg-rose-100 text-rose-700",
  condition: "bg-fuchsia-100 text-fuchsia-700",
};

function WorkflowStepNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const Icon = ICONS[nodeData.stepType] ?? Zap;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "w-[320px] rounded-xl border bg-white shadow-sm transition-shadow",
        selected ? "border-indigo-400 shadow-md ring-2 ring-indigo-100" : "border-slate-200",
        nodeData.stepType === "trigger" && "border-amber-200",
      )}
    >
      {nodeData.stepType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo-500"
        />
      )}

      <div className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            ICON_COLORS[nodeData.stepType],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{nodeData.label}</p>
          {nodeData.subtitle && (
            <p className="truncate text-xs text-slate-500">{nodeData.subtitle}</p>
          )}
        </div>

        {nodeData.stepType !== "trigger" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Step actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setMenuOpen(false);
                      window.dispatchEvent(
                        new CustomEvent("workflow:edit-node", {
                          detail: { stepType: nodeData.stepType },
                        }),
                      );
                    }}
                  >
                    Edit step
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setMenuOpen(false);
                      window.dispatchEvent(
                        new CustomEvent("workflow:delete-node", { detail: { nodeId: id } }),
                      );
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {nodeData.stepType === "condition" ? (
        <>
          <div className="flex justify-between border-t border-slate-100 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide">
            <span className="text-emerald-600">Yes</span>
            <span className="text-red-600">No</span>
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: "28%" }}
            className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: "72%" }}
            className="!h-2.5 !w-2.5 !border-2 !border-white !bg-red-500"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo-500"
        />
      )}
    </div>
  );
}

export const WorkflowStepNode = memo(WorkflowStepNodeComponent);
