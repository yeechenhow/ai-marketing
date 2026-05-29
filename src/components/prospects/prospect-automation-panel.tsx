import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveCurrentStepLabel } from "@/lib/pipeline/stage-mapping";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export async function ProspectAutomationPanel({
  prospectId,
  organizationId,
  workflowBuilderPrefix = "/org/workflows",
}: {
  prospectId: string;
  organizationId: string;
  workflowBuilderPrefix?: string;
}) {
  const enrollments = await db.workflowEnrollment.findMany({
    where: { prospectId, organizationId },
    include: {
      workflow: { select: { id: true, name: true, graph: true, isActive: true } },
      executions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const campaignIds = enrollments
    .map((e) => e.campaignId)
    .filter((id): id is string => !!id);

  const campaigns =
    campaignIds.length > 0
      ? await db.campaign.findMany({
          where: { id: { in: campaignIds } },
          select: { id: true, name: true },
        })
      : [];

  const campaignById = new Map(campaigns.map((c) => [c.id, c.name]));

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active automation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Not enrolled in any workflow yet. Link a campaign to a workflow, then run a test
          enrollment from the workflow builder.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active automation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {enrollments.map((enrollment) => {
          const currentStep = resolveCurrentStepLabel(
            enrollment.workflow.graph,
            enrollment.currentNodeId,
          );
          const campaignName = enrollment.campaignId
            ? campaignById.get(enrollment.campaignId)
            : null;

          return (
            <div
              key={enrollment.id}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`${workflowBuilderPrefix}/${enrollment.workflowId}`}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  {enrollment.workflow.name}
                </Link>
                <Badge
                  variant={
                    enrollment.status === "ACTIVE"
                      ? "success"
                      : enrollment.status === "FAILED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {enrollment.status.toLowerCase()}
                </Badge>
                {!enrollment.workflow.isActive && (
                  <Badge variant="warning">Workflow inactive</Badge>
                )}
              </div>
              {campaignName && (
                <p className="mt-1 text-xs text-slate-500">Campaign: {campaignName}</p>
              )}
              {currentStep && (
                <p className="mt-2 text-xs font-medium text-indigo-700">
                  Current step: {currentStep}
                </p>
              )}
              {enrollment.nextRunAt && enrollment.status === "ACTIVE" && (
                <p className="text-xs text-slate-500">
                  Next run {formatDistanceToNow(enrollment.nextRunAt, { addSuffix: true })}
                </p>
              )}
              {enrollment.lastError && (
                <p className="mt-1 text-xs text-red-600">{enrollment.lastError}</p>
              )}
              {enrollment.executions.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-2">
                  <p className="mb-1 text-xs font-medium uppercase text-slate-400">
                    Recent steps
                  </p>
                  <ul className="space-y-1">
                    {enrollment.executions.map((ex) => (
                      <li key={ex.id} className="text-xs text-slate-600">
                        {ex.stepType.replace(/_/g, " ")} — {ex.status.toLowerCase()}
                        {ex.detail ? `: ${ex.detail.slice(0, 60)}` : ""}
                        <span className="ml-1 text-slate-400">
                          ({formatDistanceToNow(ex.createdAt, { addSuffix: true })})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
