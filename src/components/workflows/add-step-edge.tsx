"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Plus } from "lucide-react";

export function AddStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const sourceId = (data as { sourceId?: string; branchLabel?: string } | undefined)?.sourceId ?? id.split("_")[1];
  const branchLabel = (data as { branchLabel?: string } | undefined)?.branchLabel ?? "default";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: branchLabel === "yes" ? "#10b981" : branchLabel === "no" ? "#ef4444" : "#cbd5e1",
          strokeWidth: 2,
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute flex flex-col items-center gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {branchLabel !== "default" && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                branchLabel === "yes"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {branchLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("workflow:add-step", {
                  detail: { afterNodeId: sourceId, branchLabel },
                }),
              );
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-indigo-200 bg-white text-indigo-600 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 hover:shadow"
            aria-label="Add step"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
