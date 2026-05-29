import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function OrgWorkflowsPage() {
  const { organization } = await requireOrgSession();

  const workflows = await db.workflow.findMany({
    where: { organizationId: organization.id },
    include: {
      funnel: { select: { id: true, name: true } },
      _count: { select: { campaigns: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Visual automation builder — different steps, AI models, and channels per funnel"
        actions={
          <Button asChild>
            <Link href="/org/workflows/new">Create workflow</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workflows.map((wf) => (
          <Card key={wf.id} className="transition hover:border-indigo-200 hover:shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  <Link href={`/org/workflows/${wf.id}`} className="hover:text-indigo-600">
                    {wf.name}
                  </Link>
                </CardTitle>
                <Badge variant={wf.isActive ? "success" : "secondary"}>
                  {wf.isActive ? "Active" : "Draft"}
                </Badge>
              </div>
              {wf.description && (
                <p className="text-sm text-slate-500">{wf.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {FUNNEL_CHANNEL_LABELS[wf.channelType]}
                </Badge>
                {wf.funnel && (
                  <Badge variant="secondary">{wf.funnel.name}</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {Array.isArray(wf.steps) ? (wf.steps as unknown[]).length : 0} steps ·{" "}
                {wf._count.campaigns} campaigns · updated{" "}
                {formatDistanceToNow(wf.updatedAt, { addSuffix: true })}
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/org/workflows/${wf.id}`}>Open builder</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card className="mt-4">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No workflows yet. Create one to design Facebook, YouTube, or promotion URL funnels
            with AI replies, SMS, or human call steps.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
