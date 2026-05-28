import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function OrgPipelinesPage() {
  const { organization } = await requireOrgSession();

  const funnels = await db.funnel.findMany({
    where: { organizationId: organization.id },
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { opportunities: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Pipeline Settings"
        description="Configure funnels, stages, and conversion probabilities"
        actions={
          <Button asChild>
            <Link href="/org/pipelines/new">Create Funnel</Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {funnels.map((funnel) => (
          <Card key={funnel.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {funnel.name}
                  {funnel.isDefault && (
                    <Badge variant="success">Default</Badge>
                  )}
                </CardTitle>
                {funnel.description && (
                  <p className="mt-1 text-sm text-slate-500">{funnel.description}</p>
                )}
              </div>
              <span className="text-sm text-slate-500">
                {funnel._count.opportunities} opportunities
              </span>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {funnel.stages.map((stage, i) => (
                  <div
                    key={stage.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-slate-400">{i + 1}</span>
                    <span className="text-sm font-medium text-slate-900">{stage.name}</span>
                    <span className="text-xs text-emerald-600">
                      {Math.round(stage.probability * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {funnels.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            No funnels configured.{" "}
            <Link href="/org/pipelines/new" className="text-violet-600 hover:underline">
              Create your first funnel
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
