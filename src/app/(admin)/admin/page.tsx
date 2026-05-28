import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function AdminOverviewPage() {
  const [
    orgCount,
    activeOrgs,
    userCount,
    prospectCount,
    channelCount,
    aiAgentCount,
    recentOrgs,
    recentAuditLogs,
    planBreakdown,
  ] = await Promise.all([
    db.organization.count(),
    db.organization.count({ where: { isActive: true } }),
    db.user.count(),
    db.prospect.count(),
    db.channelConnection.count({ where: { isActive: true } }),
    db.aIAgent.count({ where: { isActive: true } }),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { members: true, prospects: true } } },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { organization: true, user: true },
    }),
    db.organization.groupBy({
      by: ["plan"],
      _count: true,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        description="Monitor all tenants, usage, and platform health"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={orgCount} hint={`${activeOrgs} active`} />
        <StatCard label="Platform Users" value={userCount} />
        <StatCard label="Total Prospects" value={prospectCount} hint="Across all tenants" />
        <StatCard
          label="Active Channels"
          value={channelCount}
          hint={`${aiAgentCount} AI agents`}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {planBreakdown.map((p) => (
          <StatCard
            key={p.plan}
            label={`${p.plan} plan`}
            value={p._count}
            hint="Tenants"
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Organizations</CardTitle>
            <Link href="/admin/organizations" className="text-sm text-violet-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrgs.map((org) => (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-500">
                    {org._count.members} members · {org._count.prospects} prospects
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{org.plan}</Badge>
                  <Badge variant={org.isActive ? "success" : "destructive"}>
                    {org.isActive ? "Active" : "Suspended"}
                  </Badge>
                </div>
              </Link>
            ))}
            {recentOrgs.length === 0 && (
              <p className="text-sm text-slate-500">No organizations yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Audit Activity</CardTitle>
            <Link href="/admin/audit-logs" className="text-sm text-violet-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="border-l-2 border-violet-200 pl-3">
                <p className="text-sm font-medium text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-500">
                  {log.organization?.name ?? "Platform"} ·{" "}
                  {log.user?.name ?? log.user?.email ?? "System"} ·{" "}
                  {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                </p>
              </div>
            ))}
            {recentAuditLogs.length === 0 && (
              <p className="text-sm text-slate-500">No audit logs yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
