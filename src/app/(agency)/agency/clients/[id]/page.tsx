import { requireAgencySession, loadClientHealthMetrics } from "@/lib/agency";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloneTemplateForm } from "@/components/agency/clone-template-form";
import { SwitchClientButton } from "@/components/agency/switch-client-button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function AgencyClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { agency } = await requireAgencySession();
  const { id } = await params;

  const client = await db.organization.findFirst({
    where: { id, agencyId: agency.id },
  });
  if (!client) notFound();

  const clients = await loadClientHealthMetrics(agency.id);
  const metrics = clients.find((c) => c.id === id);

  const [funnels, workflows, templateFunnels] = await Promise.all([
    db.funnel.findMany({
      where: { organizationId: id },
      include: { _count: { select: { stages: true, workflows: true } } },
      orderBy: { name: "asc" },
    }),
    db.workflow.findMany({
      where: { organizationId: id },
      orderBy: { updatedAt: "desc" },
    }),
    db.funnel.findMany({
      where: { organizationId: agency.id },
      include: { _count: { select: { workflows: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={client.name}
        description={`Client workspace · ${client.slug}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/agency/clients">All clients</Link>
            </Button>
            <SwitchClientButton organizationId={id} redirectTo="/org" label="Open admin" />
            <SwitchClientButton
              organizationId={id}
              redirectTo="/dashboard/pipeline"
              label="Open pipeline"
            />
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Badge variant="secondary">{client.plan}</Badge>
        <Badge variant={client.isActive ? "success" : "destructive"}>
          {client.isActive ? "Active" : "Suspended"}
        </Badge>
      </div>

      {metrics && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Prospects" value={metrics.prospects} />
          <StatCard label="Open deals" value={metrics.openDeals} />
          <StatCard
            label="Pipeline value"
            value={`$${metrics.pipelineValue.toLocaleString()}`}
          />
          <StatCard
            label="Last activity"
            value={formatDistanceToNow(metrics.lastActivityAt, { addSuffix: true })}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CloneTemplateForm clientOrgId={id} templateFunnels={templateFunnels} />

        <Card>
          <CardHeader>
            <CardTitle>Funnels in client org</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnels.length === 0 ? (
              <p className="text-sm text-slate-500">No funnels yet — clone a template above.</p>
            ) : (
              funnels.map((funnel) => (
                <div
                  key={funnel.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{funnel.name}</p>
                    <p className="text-xs text-slate-500">
                      {funnel.channelType} · {funnel._count.stages} stages ·{" "}
                      {funnel._count.workflows} workflows
                    </p>
                  </div>
                  {funnel.isDefault && <Badge variant="secondary">Default</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflows.length === 0 ? (
              <p className="text-sm text-slate-500">No workflows in this client org yet.</p>
            ) : (
              workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <span className="font-medium">{workflow.name}</span>
                  <Badge variant={workflow.isActive ? "success" : "secondary"}>
                    {workflow.isActive ? "Active" : "Draft"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
