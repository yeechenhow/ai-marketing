"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveFunnelStages } from "@/lib/actions/funnel-stages";
import { cn } from "@/lib/utils";

type EditorStage = {
  id?: string;
  name: string;
  probability: number;
  color: string;
};

const STAGE_COLORS = [
  "#64748b",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#f97316",
  "#10b981",
  "#ef4444",
];

const PRESETS: Record<string, EditorStage[]> = {
  Simple: [
    { name: "To Do", probability: 0.2, color: "#64748b" },
    { name: "In Progress", probability: 0.5, color: "#3b82f6" },
    { name: "Done", probability: 1, color: "#10b981" },
  ],
  B2B: [
    { name: "New Lead", probability: 0.1, color: "#64748b" },
    { name: "Contacted", probability: 0.2, color: "#3b82f6" },
    { name: "Qualified", probability: 0.4, color: "#6366f1" },
    { name: "Proposal", probability: 0.6, color: "#8b5cf6" },
    { name: "Negotiation", probability: 0.8, color: "#f59e0b" },
    { name: "Won", probability: 1, color: "#10b981" },
  ],
  "E-commerce": [
    { name: "Cart", probability: 0.2, color: "#64748b" },
    { name: "Checkout Started", probability: 0.4, color: "#3b82f6" },
    { name: "Payment Pending", probability: 0.7, color: "#f59e0b" },
    { name: "Paid", probability: 1, color: "#10b981" },
  ],
};

function withDefaultColor(stage: { id: string; name: string; probability: number; color: string | null }, index: number): EditorStage {
  return {
    id: stage.id,
    name: stage.name,
    probability: stage.probability,
    color: stage.color ?? STAGE_COLORS[index % STAGE_COLORS.length]!,
  };
}

export function FunnelStageEditor({
  funnelId,
  stages: initialStages,
}: {
  funnelId: string;
  stages: { id: string; name: string; probability: number; color: string | null }[];
}) {
  const router = useRouter();
  const [stages, setStages] = useState<EditorStage[]>(
    initialStages.map((s, i) => withDefaultColor(s, i)),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function update(index: number, patch: Partial<EditorStage>) {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function move(index: number, direction: -1 | 1) {
    setStages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      {
        name: "",
        probability: prev.length > 0 ? 1 : 0.1,
        color: STAGE_COLORS[prev.length % STAGE_COLORS.length]!,
      },
    ]);
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  function applyPreset(name: keyof typeof PRESETS) {
    setStages(PRESETS[name]!.map((s) => ({ ...s })));
    setMessage(null);
  }

  const hasEmptyName = stages.some((s) => !s.name.trim());
  const canSave = stages.length > 0 && !hasEmptyName && !pending;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveFunnelStages(
        funnelId,
        stages.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          probability: s.probability,
          color: s.color,
        })),
      );
      if (result.ok) {
        setMessage({ type: "ok", text: "Stages saved." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Could not save stages" });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Pipeline stages</CardTitle>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs text-slate-400">Quick fill:</span>
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((name) => (
            <Button
              key={name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          These columns define this funnel&apos;s kanban board. Each funnel can have its own
          stages.
        </p>

        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id ?? `new-${index}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              <span className="w-5 shrink-0 text-center text-xs font-medium text-slate-400">
                {index + 1}
              </span>

              <ColorPicker
                value={stage.color}
                onChange={(color) => update(index, { color })}
              />

              <Input
                value={stage.name}
                placeholder="Stage name"
                onChange={(e) => update(index, { name: e.target.value })}
                className="h-9 flex-1"
              />

              <div className="flex shrink-0 items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(stage.probability * 100)}
                  onChange={(e) =>
                    update(index, {
                      probability: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100,
                    })
                  }
                  className="h-9 w-16 text-right"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === stages.length - 1}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStage(index)}
                  disabled={stages.length <= 1}
                  className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove stage"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addStage}>
          <Plus className="h-4 w-4" />
          Add stage
        </Button>

        <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {hasEmptyName && (
            <span className="text-xs text-amber-600">Every stage needs a name.</span>
          )}
          {message && (
            <span
              className={cn(
                "text-xs",
                message.type === "ok" ? "text-emerald-600" : "text-red-600",
              )}
            >
              {message.text}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-6 w-6 rounded-full border border-slate-300"
        style={{ backgroundColor: value }}
        aria-label="Pick color"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 grid grid-cols-5 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {STAGE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                className={cn(
                  "h-6 w-6 rounded-full border",
                  value === color ? "border-slate-900" : "border-transparent",
                )}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
