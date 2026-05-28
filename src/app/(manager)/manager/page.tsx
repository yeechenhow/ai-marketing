import { requireManagerSession, getTeamAgentIds } from "@/lib/manager";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function ManagerDashboardPage() {
  const { organization } = await requireManagerSession();
  const orgId = organization.id;

  const agentIds = await getTeamAgentIds(orgId);

  const [
    teamProspects,
    openOpportunities,
    openTasks,
    openConversations,
    wonThisMonth,
    agentMembers,
    recentActivities,
    topAgents,
  ] = await Promise.all([
    db.prospect.count({ where: { organizationId: orgId } }),
    db.opportunity.count({
      where: { status: "OPEN", prospect: { organizationId: orgId } },
    }),
    db.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
        assigneeId: { in: agentIds },
      },
    }),
    db.conversation.count({
      where: {
        organizationId: orgId,
        status: { in: ["OPEN", "PENDING", "ESCALATED"] },
      },
    }),
    db.prospect.count({
      where: {
        organizationId: orgId,
        lifecycleStage: "WON",
        updatedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }),
    db.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true, role: "AGENT" },
      include: {
        user: {
          include: { _count: { select: { assignedProspects: true, assignedTasks: true } } },
        },
      },
    }),
    db.activity.findMany({
      where: { prospect: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { prospect: true, user: true },
    }),
    db.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true, role: "AGENT" },
      include: {
        user: {
          include: {
            assignedProspects: {
              select: { lifecycleStage: true },
            },
          },
        },
      },
    }),
  ]);

  const pipelineValue = await db.opportunity.aggregate({
    where: { status: "OPEN", prospect: { organizationId: orgId } },
    _sum: { value: true },
  });

  const leaderboard = topAgents
    .map((m) => {
      const won = m.user.assignedProspects.filter((p) => p.lifecycleStage === "WON").length;
      const total = m.user.assignedProspects.length;
      return {
        id: m.userId,
        name: m.user.name ?? m.user.email,
        total,
        won,
        rate: total > 0 ? Math.round((won / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.won - a.won || b.rate - a.rate)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Team Dashboard"
        description="Monitor pipeline, conversion, and agent performance"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Team Prospects" value={teamProspects} />
        <StatCard
          label="Pipeline Value"
          value={`$${(pipelineValue._sum.value ?? 0).toLocaleString()}`}
          hint={`${openOpportunities} open deals`}
        />
        <StatCard label="Open Tasks" value={openTasks} hint="Team follow-ups" />
        <StatCard label="Won (30 days)" value={wonThisMonth} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard label="Active Agents" value={agentMembers.length} />
        <StatCard label="Active Conversations" value={openConversations} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leaderboard</CardTitle>
            <Link href="/manager/agents" className="text-sm text-amber-600 hover:underline">
              Full rankings
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.total} prospects</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">{a.won} won</p>
                  <p className="text-xs text-slate-500">{a.rate}% rate</p>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-sm text-slate-500">No agents on the team.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Agent Workload</CardTitle>
            <Link href="/manager/tasks" className="text-sm text-amber-600 hover:underline">
              View tasks
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{m.user.name ?? m.user.email}</span>
                <span className="text-slate-500">
                  {m.user._count.assignedProspects} leads · {m.user._count.assignedTasks} tasks
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Team Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivities.map((a) => (
            <div key={a.id} className="border-l-2 border-amber-200 pl-3">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-slate-500">
                {a.user?.name ?? "System"} ·{" "}
                {prospectDisplayName(a.prospect.firstName, a.prospect.lastName, a.prospect.email)}{" "}
                · {formatDistanceToNow(a.createdAt, { addSuffix: true })}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
