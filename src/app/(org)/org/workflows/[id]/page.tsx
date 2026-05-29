import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowBuilder } from "@/components/workflows/workflow-builder";
import { WorkflowToggleButton } from "@/components/workflows/workflow-toggle-button";
import { WorkflowTestPanel } from "@/components/workflows/workflow-test-panel";
import {
  createDefaultGraph,
  parseWorkflowGraph,
} from "@/lib/workflows/layout";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import { formatDistanceToNow } from "date-fns";

export default async function WorkflowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await requireOrgSession();
  const { id } = await params;

  const workflow = await db.workflow.findFirst({
    where: { id, organizationId: organization.id },
    include: { funnel: true },
  });

  if (!workflow) notFound();

  const [enrollmentCounts, recentExecutions] = await Promise.all([
    db.workflowEnrollment.groupBy({
      by: ["status"],
      where: { workflowId: workflow.id },
      _count: { _all: true },
    }),
    db.workflowStepExecution.findMany({
      where: { enrollment: { workflowId: workflow.id } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const countFor = (status: string) =>
    enrollmentCounts.find((c) => c.status === status)?._count._all ?? 0;

  const graph =
    parseWorkflowGraph(workflow.graph) ?? createDefaultGraph(workflow.channelType);

  return (
    <div className="-m-8 flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-slate-200 bg-white px-8 py-4">
        <PageHeader
          title={workflow.name}
          description={
            workflow.funnel
              ? `${workflow.funnel.name} · ${FUNNEL_CHANNEL_LABELS[workflow.channelType]}`
              : FUNNEL_CHANNEL_LABELS[workflow.channelType]
          }
          actions={
            <div className="flex items-center gap-2">
              <Badge variant={workflow.isActive ? "success" : "secondary"}>
                {workflow.isActive ? "Active" : "Draft"}
              </Badge>
              <WorkflowToggleButton workflowId={workflow.id} isActive={workflow.isActive} />
              <Button variant="outline" size="sm" asChild>
                <Link href="/org/workflows">Back to workflows</Link>
              </Button>
            </div>
          }
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-8 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="success">Active: {countFor("ACTIVE")}</Badge>
          <Badge variant="secondary">Completed: {countFor("COMPLETED")}</Badge>
          {countFor("FAILED") > 0 && (
            <Badge variant="destructive">Failed: {countFor("FAILED")}</Badge>
          )}
          {recentExecutions.length > 0 && (
            <span className="ml-2 text-slate-500">
              Last step: {recentExecutions[0].stepType} (
              {recentExecutions[0].status.toLowerCase()}
              {recentExecutions[0].simulated ? ", simulated" : ""}) ·{" "}
              {formatDistanceToNow(recentExecutions[0].createdAt, { addSuffix: true })}
            </span>
          )}
        </div>
        <WorkflowTestPanel workflowId={workflow.id} isActive={workflow.isActive} />
      </div>
      <div className="flex-1 p-4">
        <WorkflowBuilder
          workflowId={workflow.id}
          workflowName={workflow.name}
          channelType={workflow.channelType}
          initialGraph={graph}
        />
      </div>
    </div>
  );
}
