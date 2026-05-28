import { requireManagerSession } from "@/lib/manager";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFECYCLE_STAGE_LABELS } from "@/lib/constants";

export default async function ManagerReportsPage() {
  const { organization } = await requireManagerSession();
  const orgId = organization.id;

  const [total, won, lost, stageBreakdown, sourceBreakdown] = await Promise.all([
    db.prospect.count({ where: { organizationId: orgId } }),
    db.prospect.count({ where: { organizationId: orgId, lifecycleStage: "WON" } }),
    db.prospect.count({ where: { organizationId: orgId, lifecycleStage: "LOST" } }),
    db.prospect.groupBy({
      by: ["lifecycleStage"],
      where: { organizationId: orgId },
      _count: true,
    }),
    db.prospect.groupBy({
      by: ["source"],
      where: { organizationId: orgId },
      _count: true,
    }),
  ]);

  const closeRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Team Reports"
        description="Conversion metrics and source performance for your team"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Leads" value={total} />
        <StatCard label="Won" value={won} />
        <StatCard label="Lost" value={lost} />
        <StatCard label="Close Rate" value={`${closeRate}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageBreakdown.map((s) => (
              <div key={s.lifecycleStage} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {LIFECYCLE_STAGE_LABELS[s.lifecycleStage]}
                </span>
                <span className="font-medium">{s._count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceBreakdown.map((s) => (
              <div key={s.source} className="flex justify-between text-sm">
                <span className="capitalize text-slate-600">
                  {s.source.toLowerCase().replace("_", " ")}
                </span>
                <span className="font-medium">{s._count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
