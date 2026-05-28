import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { ToggleOrgStatusButton } from "@/components/admin/toggle-org-button";
import { updateOrganizationPlan } from "@/lib/actions/admin";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true, team: true },
        orderBy: { joinedAt: "asc" },
      },
      channelConnections: true,
      aiAgents: true,
      funnels: { include: { _count: { select: { opportunities: true } } } },
      _count: {
        select: {
          prospects: true,
          campaigns: true,
          workflows: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!org) notFound();

  const pipelineValue = await db.opportunity.aggregate({
    where: { status: "OPEN", prospect: { organizationId: org.id } },
    _sum: { value: true },
  });

  return (
    <div>
      <PageHeader
        title={org.name}
        description={`Tenant workspace · ${org.slug}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/organizations">Back to list</Link>
            </Button>
            <ToggleOrgStatusButton orgId={org.id} isActive={org.isActive} />
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Badge variant="secondary">{org.plan} plan</Badge>
        <Badge variant={org.isActive ? "success" : "destructive"}>
          {org.isActive ? "Active" : "Suspended"}
        </Badge>
        <span className="text-sm text-slate-500">
          Created {formatDistanceToNow(org.createdAt, { addSuffix: true })}
        </span>
        <form
          action={updateOrganizationPlan.bind(null, org.id)}
          className="ml-auto flex items-center gap-2"
        >
          <select
            name="plan"
            defaultValue={org.plan}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          >
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          <Button type="submit" variant="outline" size="sm">
            Update plan
          </Button>
        </form>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={org.members.length} />
        <StatCard label="Prospects" value={org._count.prospects} />
        <StatCard
          label="Pipeline Value"
          value={`$${(pipelineValue._sum.value ?? 0).toLocaleString()}`}
        />
        <StatCard label="Campaigns" value={org._count.campaigns} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {org.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{m.user.name ?? m.user.email}</p>
                  <p className="text-xs text-slate-500">{m.user.email}</p>
                </div>
                <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
              </div>
            ))}
            {org.members.length === 0 && (
              <p className="text-sm text-slate-500">No members.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {org.channelConnections.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.name}</span>
                <Badge variant={c.isActive ? "success" : "secondary"}>
                  {c.channel}
                </Badge>
              </div>
            ))}
            {org.channelConnections.length === 0 && (
              <p className="text-sm text-slate-500">No channels connected.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {org.aiAgents.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.name}</span>
                <Badge variant={a.isActive ? "success" : "secondary"}>
                  {a.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
            {org.aiAgents.length === 0 && (
              <p className="text-sm text-slate-500">No AI agents configured.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funnels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {org.funnels.map((f) => (
              <div key={f.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {f.name}
                  {f.isDefault && (
                    <Badge variant="secondary" className="ml-2">
                      Default
                    </Badge>
                  )}
                </span>
                <span className="text-xs text-slate-500">
                  {f._count.opportunities} opportunities
                </span>
              </div>
            ))}
            {org.funnels.length === 0 && (
              <p className="text-sm text-slate-500">No funnels.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-slate-500">Workflows</p>
            <p className="text-lg font-semibold">{org._count.workflows}</p>
          </div>
          <div>
            <p className="text-slate-500">Audit log entries</p>
            <p className="text-lg font-semibold">{org._count.auditLogs}</p>
          </div>
          <div>
            <p className="text-slate-500">Message credits (est.)</p>
            <p className="text-lg font-semibold">—</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
