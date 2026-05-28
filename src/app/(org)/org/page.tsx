import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIFECYCLE_STAGE_COLORS, LIFECYCLE_STAGE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function OrgOverviewPage() {
  const { organization } = await requireOrgSession();
  const orgId = organization.id;

  const [
    memberCount,
    prospectCount,
    openOpportunities,
    activeCampaigns,
    aiAgentCount,
    channelCount,
    stageBreakdown,
    recentMembers,
    topProspects,
  ] = await Promise.all([
    db.organizationMember.count({ where: { organizationId: orgId, isActive: true } }),
    db.prospect.count({ where: { organizationId: orgId } }),
    db.opportunity.count({
      where: { status: "OPEN", prospect: { organizationId: orgId } },
    }),
    db.campaign.count({ where: { organizationId: orgId, status: { not: "archived" } } }),
    db.aIAgent.count({ where: { organizationId: orgId, isActive: true } }),
    db.channelConnection.count({ where: { organizationId: orgId, isActive: true } }),
    db.prospect.groupBy({
      by: ["lifecycleStage"],
      where: { organizationId: orgId },
      _count: true,
    }),
    db.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { user: true, team: true },
      orderBy: { joinedAt: "desc" },
      take: 5,
    }),
    db.prospect.findMany({
      where: { organizationId: orgId },
      include: { leadScore: true, assignedTo: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const pipelineValue = await db.opportunity.aggregate({
    where: { status: "OPEN", prospect: { organizationId: orgId } },
    _sum: { value: true },
  });

  return (
    <div>
      <PageHeader
        title={organization.name}
        description={`${organization.plan} plan · Business overview and team performance`}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Team Members" value={memberCount} />
        <StatCard label="Total Prospects" value={prospectCount} />
        <StatCard
          label="Pipeline Value"
          value={`$${(pipelineValue._sum.value ?? 0).toLocaleString()}`}
          hint={`${openOpportunities} open opportunities`}
        />
        <StatCard
          label="Active Channels"
          value={channelCount}
          hint={`${aiAgentCount} AI agents`}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Campaigns" value={activeCampaigns} />
        <StatCard
          label="Qualified+ Leads"
          value={stageBreakdown
            .filter((s) => ["QUALIFIED", "PROPOSAL", "NEGOTIATION"].includes(s.lifecycleStage))
            .reduce((sum, s) => sum + s._count, 0)}
        />
        <StatCard label="Plan" value={organization.plan} hint="Subscription tier" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Prospect Pipeline</CardTitle>
            <Link href="/org/pipelines" className="text-sm text-emerald-600 hover:underline">
              Manage pipelines
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {stageBreakdown.map((s) => (
                <div
                  key={s.lifecycleStage}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                >
                  <Badge className={LIFECYCLE_STAGE_COLORS[s.lifecycleStage]}>
                    {LIFECYCLE_STAGE_LABELS[s.lifecycleStage]}
                  </Badge>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{s._count}</p>
                </div>
              ))}
              {stageBreakdown.length === 0 && (
                <p className="text-sm text-slate-500">No prospects yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team</CardTitle>
            <Link href="/org/team" className="text-sm text-emerald-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {m.user.name ?? m.user.email}
                  </p>
                  <p className="text-xs text-slate-500">{m.team?.name ?? "No team"}</p>
                </div>
                <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Prospects</CardTitle>
          <Link href="/org/prospects" className="text-sm text-emerald-600 hover:underline">
            View all prospects
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {topProspects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {prospectDisplayName(p.firstName, p.lastName, p.email, p.phone, p.whatsappName, p.whatsappPhone)}
                </p>
                <p className="text-xs text-slate-500">
                  {p.assignedTo?.name ?? "Unassigned"} ·{" "}
                  {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.leadScore && (
                  <span className="text-xs font-medium text-emerald-600">
                    {Math.round(p.leadScore.conversionProb * 100)}%
                  </span>
                )}
                <Badge className={LIFECYCLE_STAGE_COLORS[p.lifecycleStage]}>
                  {LIFECYCLE_STAGE_LABELS[p.lifecycleStage]}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/org/prospects/${p.id}`}>Customer 360</Link>
                </Button>
              </div>
            </div>
          ))}
          {topProspects.length === 0 && (
            <p className="text-sm text-slate-500">No prospects in CRM yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
