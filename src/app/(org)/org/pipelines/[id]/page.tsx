import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import { FunnelStageEditor } from "@/components/pipeline/funnel-stage-editor";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function FunnelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await requireOrgSession();
  const { id } = await params;

  const funnel = await db.funnel.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      stages: { orderBy: { order: "asc" } },
      workflows: { orderBy: { updatedAt: "desc" } },
      campaigns: { orderBy: { updatedAt: "desc" }, take: 5 },
      _count: { select: { opportunities: true, workflows: true, campaigns: true } },
    },
  });

  if (!funnel) notFound();

  return (
    <div>
      <PageHeader
        title={funnel.name}
        description={funnel.description ?? "Funnel pipeline & linked workflows"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/org/workflows/new?funnelId=${funnel.id}`}>Add workflow</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/org/pipelines">All pipelines</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="secondary">{FUNNEL_CHANNEL_LABELS[funnel.channelType]}</Badge>
        {funnel.isDefault && <Badge variant="success">Default funnel</Badge>}
        <Badge variant="secondary">{funnel._count.opportunities} opportunities</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelStageEditor funnelId={funnel.id} stages={funnel.stages} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Workflows</CardTitle>
            <Link
              href={`/org/workflows/new?funnelId=${funnel.id}`}
              className="text-xs text-indigo-600 hover:underline"
            >
              + New workflow
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.workflows.map((wf) => (
              <div
                key={wf.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <Link
                    href={`/org/workflows/${wf.id}`}
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    {wf.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {FUNNEL_CHANNEL_LABELS[wf.channelType]} ·{" "}
                    {formatDistanceToNow(wf.updatedAt, { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={wf.isActive ? "success" : "secondary"}>
                  {wf.isActive ? "Active" : "Draft"}
                </Badge>
              </div>
            ))}
            {funnel.workflows.length === 0 && (
              <p className="text-sm text-slate-500">
                No workflows linked yet. Each funnel can have different automation — AI reply,
                SMS, human call, etc.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {funnel.campaigns.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Linked campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {funnel.campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <Link href={`/org/campaigns/${c.id}`} className="text-indigo-600 hover:underline">
                  {c.name}
                </Link>
                <Badge variant="secondary">{c.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
