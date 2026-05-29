import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/shell";
import { PipelinePageView } from "@/components/pipeline/pipeline-page-view";
import { loadPipelineBoard } from "@/lib/pipeline/load-pipeline-board";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ funnelId?: string }>;
}) {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const { funnelId } = await searchParams;
  const board = await loadPipelineBoard(session.user.organizationId, funnelId);

  if (!board) {
    return (
      <PageHeader
        title="Pipeline"
        description="No funnels configured. Ask your org admin to create one under Pipelines."
      />
    );
  }

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading board…</p>}>
      <PipelinePageView
        title="Pipeline"
        description={`${board.funnelName} · ${FUNNEL_CHANNEL_LABELS[board.channelType]} — drag cards to update stage`}
        board={board}
        prospectHrefPrefix="/dashboard/prospects"
      />
    </Suspense>
  );
}
