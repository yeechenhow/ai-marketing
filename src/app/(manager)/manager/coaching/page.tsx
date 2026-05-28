import { requireManagerSession } from "@/lib/manager";
import { generateCoachingInsights } from "@/lib/coaching-insights";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ManagerCoachingPage() {
  const { organization } = await requireManagerSession();

  const [insights, agentsWithHighLoad, focusAreas] = await Promise.all([
    generateCoachingInsights(organization.id),
    db.organizationMember.findMany({
      where: { organizationId: organization.id, role: "AGENT", isActive: true },
      include: {
        user: { include: { _count: { select: { assignedProspects: true } } } },
      },
    }),
    db.prospect.groupBy({
      by: ["lifecycleStage"],
      where: { organizationId: organization.id },
      _count: true,
    }),
  ]);

  const overloaded = agentsWithHighLoad.filter(
    (a) => a.user._count.assignedProspects > 5,
  );

  const highPriority = insights.filter((i) => i.priority === "high");

  return (
    <div>
      <PageHeader
        title="Coaching Dashboard"
        description="Data-driven insights from your team's pipeline and activity"
      />

      {highPriority.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>{highPriority.length} high-priority insight{highPriority.length > 1 ? "s" : ""}</strong>{" "}
          detected from live team data. Review below and check{" "}
          <Link href="/manager/tasks" className="underline">
            Team Tasks
          </Link>
          .
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agents Needing Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overloaded.length > 0 ? (
              overloaded.map((a) => (
                <p key={a.id}>
                  <strong>{a.user.name ?? a.user.email}</strong> —{" "}
                  {a.user._count.assignedProspects} assigned prospects (consider rebalancing)
                </p>
              ))
            ) : (
              <p className="text-slate-500">Workload is balanced across the team.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {focusAreas.map((s) => (
              <div key={s.lifecycleStage} className="flex justify-between">
                <span className="capitalize text-slate-600">
                  {s.lifecycleStage.toLowerCase().replace("_", " ")}
                </span>
                <span className="font-medium">{s._count}</span>
              </div>
            ))}
            {focusAreas.length === 0 && (
              <p className="text-slate-500">No prospects in pipeline yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          AI Insights ({insights.length})
        </h2>
        <p className="text-sm text-slate-500">
          Generated from lead stages, task SLAs, agent performance, and channel data.
        </p>
        {insights.map((insight) => (
          <Card key={insight.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{insight.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{insight.body}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    insight.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : insight.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {insight.priority}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
