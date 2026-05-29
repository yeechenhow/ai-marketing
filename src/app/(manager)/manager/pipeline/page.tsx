import { requireManagerSession } from "@/lib/manager";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/shell";
import { PipelinePageView } from "@/components/pipeline/pipeline-page-view";
import { loadPipelineBoard } from "@/lib/pipeline/load-pipeline-board";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";

export default async function ManagerPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ funnelId?: string }>;
}) {
  const { organization } = await requireManagerSession();
  const { funnelId } = await searchParams;
  const board = await loadPipelineBoard(organization.id, funnelId);

  if (!board) {
    return (
      <PageHeader title="Team Pipeline" description="No funnels configured for this organization." />
    );
  }

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading board…</p>}>
      <PipelinePageView
        title="Team Pipeline"
        description={`${board.funnelName} · ${FUNNEL_CHANNEL_LABELS[board.channelType]} — full team view`}
        board={board}
        prospectHrefPrefix="/dashboard/prospects"
        showAssignee
      />
    </Suspense>
  );
}
