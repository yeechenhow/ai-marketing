"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { GripVertical, Mail, Phone, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { moveOpportunityToStage } from "@/lib/actions/pipeline";
import { LIFECYCLE_STAGE_COLORS, LIFECYCLE_STAGE_LABELS } from "@/lib/constants";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import type { LifecycleStage } from "@/generated/prisma/client";
import type { PipelineBoardData, PipelineCardData } from "@/lib/pipeline/load-pipeline-board";
import { cn } from "@/lib/utils";

export function PipelineBoard({
  data,
  prospectHrefPrefix = "/dashboard/prospects",
  showAssignee = false,
  showProspectDetails = false,
}: {
  data: PipelineBoardData;
  prospectHrefPrefix?: string;
  showAssignee?: boolean;
  showProspectDetails?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [columns, setColumns] = useState(data.columns);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetStageId, setDropTargetStageId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function selectFunnel(funnelId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("funnelId", funnelId);
    router.push(`${pathname}?${params.toString()}`);
  }

  const handleDrop = useCallback(
    (targetStageId: string, card: PipelineCardData, fromStageId: string) => {
      if (fromStageId === targetStageId) return;

      setColumns((prev) => {
        const next = prev.map((col) => ({
          ...col,
          items: [...col.items],
        }));

        const fromCol = next.find((c) => c.stageId === fromStageId);
        const toCol = next.find((c) => c.stageId === targetStageId);
        if (!fromCol || !toCol) return prev;

        fromCol.items = fromCol.items.filter((i) => i.opportunityId !== card.opportunityId);
        toCol.items = [card, ...toCol.items.filter((i) => i.opportunityId !== card.opportunityId)];
        return next;
      });

      startTransition(async () => {
        const result = await moveOpportunityToStage(card.opportunityId, targetStageId);
        if (!result.ok) {
          setError(result.error ?? "Could not move card");
          setColumns(data.columns);
          return;
        }
        setError(null);
        router.refresh();
      });
    },
    [data.columns, router],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {data.funnels.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => selectFunnel(f.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition",
              f.id === data.funnelId
                ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {f.name}
            <span className="ml-1.5 text-xs opacity-70">
              ({FUNNEL_CHANNEL_LABELS[f.channelType]})
            </span>
          </button>
        ))}
        {pending && <span className="text-xs text-slate-500">Saving…</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <p className="text-xs text-slate-500">
        Drag cards between columns to update stage. Click a name to open the full profile.
      </p>

      <div className="-mx-8 border-t border-slate-200 px-8 pt-5">
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4 rounded-xl bg-slate-100/80 p-4">
        {columns.map((col) => (
          <div
            key={col.stageId}
            className={cn(
              "min-w-[300px] flex-shrink-0 rounded-xl border bg-slate-100/50 transition-colors",
              dropTargetStageId === col.stageId && draggingId
                ? "border-indigo-400 bg-indigo-50/50"
                : "border-slate-200",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTargetStageId(col.stageId);
            }}
            onDragLeave={() => setDropTargetStageId(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDropTargetStageId(null);
              setDraggingId(null);
              const payload = e.dataTransfer.getData("application/pipeline-card");
              if (!payload) return;
              try {
                const { card, fromStageId } = JSON.parse(payload) as {
                  card: PipelineCardData;
                  fromStageId: string;
                };
                handleDrop(col.stageId, card, fromStageId);
              } catch {
                setError("Invalid drag data");
              }
            }}
          >
            <div
              className="border-b border-slate-200 bg-white/80 p-4 rounded-t-xl border-t-4"
              style={{ borderTopColor: col.color ?? "#cbd5e1" }}
            >
              <h3 className="font-semibold text-slate-900">{col.stageName}</h3>
              <p className="text-xs text-slate-500">
                {col.items.length} · {Math.round(col.probability * 100)}% probability
              </p>
            </div>
            <div className="min-h-[120px] space-y-2 p-3">
              {col.items.map((item) => (
                <div
                  key={item.opportunityId}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(item.opportunityId);
                    e.dataTransfer.setData(
                      "application/pipeline-card",
                      JSON.stringify({ card: item, fromStageId: col.stageId }),
                    );
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTargetStageId(null);
                  }}
                  className={cn(
                    "cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing",
                    draggingId === item.opportunityId && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${prospectHrefPrefix}/${item.prospectId}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.prospectName}
                      </Link>
                      <p className="truncate text-sm text-slate-500">{item.title}</p>
                      {showAssignee && item.assigneeName && (
                        <p className="text-xs text-slate-400">{item.assigneeName}</p>
                      )}
                      {item.sourceDetail && (
                        <p className="mt-1 truncate text-xs text-slate-400">{item.sourceDetail}</p>
                      )}
                      {showProspectDetails && (
                        <PipelineCardExpandedDetails
                          item={item}
                          pipelineStageName={col.stageName}
                        />
                      )}
                      {item.value != null && (
                        <p className="mt-1 text-sm font-medium text-emerald-600">
                          ${item.value.toLocaleString()}
                        </p>
                      )}
                      {item.workflow && (
                        <div className="mt-2 space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="secondary" className="gap-1 text-[10px]">
                              <Workflow className="h-3 w-3" />
                              {item.workflow.workflowName}
                            </Badge>
                            {item.workflow.campaignName && (
                              <Badge variant="secondary" className="text-[10px]">
                                {item.workflow.campaignName}
                              </Badge>
                            )}
                          </div>
                          {item.workflow.currentStep && (
                            <p className="text-[11px] text-indigo-600">
                              Step: {item.workflow.currentStep}
                            </p>
                          )}
                          {item.workflow.nextRunAt && (
                            <p className="text-[10px] text-slate-400">
                              Next:{" "}
                              {formatDistanceToNow(new Date(item.workflow.nextRunAt), {
                                addSuffix: true,
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {col.items.length === 0 && (
                <p className="p-4 text-center text-xs text-slate-400">Drop here</p>
              )}
            </div>
          </div>
        ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineCardExpandedDetails({
  item,
  pipelineStageName,
}: {
  item: PipelineCardData;
  pipelineStageName: string;
}) {
  const lifecycle = item.lifecycleStage as LifecycleStage;
  const lifecycleLabel =
    LIFECYCLE_STAGE_LABELS[lifecycle] ?? item.lifecycleStage.replace(/_/g, " ");

  return (
    <div className="mt-2 space-y-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs">
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px]">
          Stage: {pipelineStageName}
        </Badge>
        <Badge className={`text-[10px] ${LIFECYCLE_STAGE_COLORS[lifecycle] ?? ""}`}>
          {lifecycleLabel}
        </Badge>
        {item.registrationCompletedAt && (
          <Badge variant="success" className="text-[10px]">
            Registered
          </Badge>
        )}
        {item.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>

      <PipelineCardContactSection item={item} />

      {(item.source || item.sourceDetail || item.location || item.occupation) && (
        <div className="space-y-0.5 text-slate-600">
          {item.source && (
            <DetailRow label="Source" value={item.source.replace(/_/g, " ")} />
          )}
          {item.sourceDetail && <DetailRow label="Campaign" value={item.sourceDetail} />}
          {item.location && <DetailRow label="Location" value={item.location} />}
          {item.occupation && <DetailRow label="Occupation" value={item.occupation} />}
        </div>
      )}

      {(item.lastTouchAt || item.nextTouchAt) && (
        <div className="space-y-0.5 text-slate-600">
          {item.lastTouchAt && (
            <DetailRow
              label="Last touch"
              value={formatDistanceToNow(new Date(item.lastTouchAt), { addSuffix: true })}
            />
          )}
          {item.nextTouchAt && (
            <DetailRow
              label="Next touch"
              value={formatDistanceToNow(new Date(item.nextTouchAt), { addSuffix: true })}
            />
          )}
        </div>
      )}

      {item.leadScore && (
        <div className="space-y-1">
          <p className="font-medium text-slate-700">Scores</p>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-600">
            <span>Conv. {Math.round(item.leadScore.conversionProb * 100)}%</span>
            <span>Intent {Math.round(item.leadScore.intentScore * 100)}%</span>
            <span>Engage {Math.round(item.leadScore.engagementScore * 100)}%</span>
          </div>
        </div>
      )}

      {item.behavior && (
        <div className="space-y-0.5 text-slate-600">
          <p className="font-medium text-slate-700">Behavior</p>
          {item.behavior.personaType && (
            <DetailRow label="Persona" value={item.behavior.personaType} />
          )}
          {item.behavior.decisionStyle && (
            <DetailRow label="Decision" value={item.behavior.decisionStyle} />
          )}
          {item.behavior.communicationPref && (
            <DetailRow label="Comms" value={item.behavior.communicationPref} />
          )}
          <DetailRow
            label="Readiness"
            value={item.behavior.dealReadiness.replace(/_/g, " ")}
          />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="shrink-0 text-slate-400">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function PipelineCardContactSection({ item }: { item: PipelineCardData }) {
  const hasContact = Boolean(item.email || item.phone || item.whatsappPhone);
  if (!hasContact) {
    return <p className="text-slate-400">No contact info on file</p>;
  }

  const whatsappDigits = item.whatsappPhone?.replace(/\D/g, "") ?? "";

  return (
    <div className="space-y-1 border-b border-slate-200 pb-2">
      <p className="font-medium text-slate-700">Contact</p>
      {item.email && (
        <a
          href={`mailto:${item.email}`}
          className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600"
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{item.email}</span>
        </a>
      )}
      {item.phone && (
        <a
          href={`tel:${item.phone.replace(/\s/g, "")}`}
          className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{item.phone}</span>
        </a>
      )}
      {item.whatsappPhone && whatsappDigits && (
        <a
          href={`https://wa.me/${whatsappDigits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-slate-700 hover:text-emerald-600"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3 w-3 shrink-0 text-emerald-500" />
          <span className="truncate">
            WhatsApp
            {item.whatsappName ? ` · ${item.whatsappName}` : ""} · {item.whatsappPhone}
          </span>
        </a>
      )}
    </div>
  );
}
