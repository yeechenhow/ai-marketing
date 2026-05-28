import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFECYCLE_STAGE_LABELS } from "@/lib/constants";

export default async function OrgReportsPage() {
  const { organization } = await requireOrgSession();
  const orgId = organization.id;

  const [
    totalProspects,
    wonCount,
    lostCount,
    stageBreakdown,
    sourceBreakdown,
    memberStats,
  ] = await Promise.all([
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
    db.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true, role: "AGENT" },
      include: {
        user: {
          include: {
            _count: {
              select: { assignedProspects: true },
            },
          },
        },
      },
    }),
  ]);

  const closeRate =
    wonCount + lostCount > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Conversion, source performance, and agent metrics"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={totalProspects} />
        <StatCard label="Won" value={wonCount} />
        <StatCard label="Close Rate" value={`${closeRate}%`} hint="Won / (Won + Lost)" />
        <StatCard label="Active Agents" value={memberStats.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funnel Conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageBreakdown.map((s) => (
              <div key={s.lifecycleStage} className="flex items-center gap-3">
                <span className="w-28 text-sm text-slate-600">
                  {LIFECYCLE_STAGE_LABELS[s.lifecycleStage]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${totalProspects > 0 ? (s._count / totalProspects) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{s._count}</span>
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
              <div key={s.source} className="flex items-center justify-between">
                <span className="text-sm capitalize text-slate-600">
                  {s.source.toLowerCase().replace("_", " ")}
                </span>
                <span className="font-medium text-slate-900">{s._count}</span>
              </div>
            ))}
            {sourceBreakdown.length === 0 && (
              <p className="text-sm text-slate-500">No source data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Agent Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {memberStats.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  {m.user.name ?? m.user.email}
                </span>
                <span className="text-sm font-medium">
                  {m.user._count.assignedProspects} prospects assigned
                </span>
              </div>
            ))}
            {memberStats.length === 0 && (
              <p className="text-sm text-slate-500">No agents on the team.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
