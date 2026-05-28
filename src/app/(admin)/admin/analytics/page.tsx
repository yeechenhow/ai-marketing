import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFECYCLE_STAGE_LABELS } from "@/lib/constants";

export default async function AdminAnalyticsPage() {
  const [
    orgCount,
    prospectCount,
    conversationCount,
    messageCount,
    wonCount,
    sourceBreakdown,
    stageBreakdown,
    orgProspectCounts,
  ] = await Promise.all([
    db.organization.count(),
    db.prospect.count(),
    db.conversation.count(),
    db.message.count(),
    db.prospect.count({ where: { lifecycleStage: "WON" } }),
    db.prospect.groupBy({ by: ["source"], _count: true }),
    db.prospect.groupBy({ by: ["lifecycleStage"], _count: true }),
    db.prospect.groupBy({
      by: ["organizationId"],
      _count: true,
      orderBy: { _count: { organizationId: "desc" } },
      take: 5,
    }),
  ]);

  const orgIds = orgProspectCounts.map((o) => o.organizationId);
  const orgs = await db.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true },
  });
  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

  const closeRate =
    prospectCount > 0 ? Math.round((wonCount / prospectCount) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Platform Analytics"
        description="Cross-tenant metrics, conversion, and usage trends"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={orgCount} />
        <StatCard label="Total Prospects" value={prospectCount} />
        <StatCard label="Conversations" value={conversationCount} />
        <StatCard label="Messages" value={messageCount} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard label="Platform Close Rate" value={`${closeRate}%`} hint="Won / total prospects" />
        <StatCard label="Won Deals" value={wonCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Tenants by Prospects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgProspectCounts.map((o) => (
              <div key={o.organizationId} className="flex justify-between text-sm">
                <span className="text-slate-700">
                  {orgMap[o.organizationId] ?? o.organizationId}
                </span>
                <span className="font-medium">{o._count}</span>
              </div>
            ))}
            {orgProspectCounts.length === 0 && (
              <p className="text-sm text-slate-500">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources (Platform)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceBreakdown.map((s) => (
              <div key={s.source} className="flex justify-between text-sm">
                <span className="capitalize text-slate-700">
                  {s.source.toLowerCase().replace("_", " ")}
                </span>
                <span className="font-medium">{s._count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lifecycle Stages (Platform)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stageBreakdown.map((s) => (
                <div
                  key={s.lifecycleStage}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center"
                >
                  <p className="text-xs text-slate-500">
                    {LIFECYCLE_STAGE_LABELS[s.lifecycleStage]}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{s._count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
