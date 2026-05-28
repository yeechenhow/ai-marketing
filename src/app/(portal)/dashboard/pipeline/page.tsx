import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const funnel = await db.funnel.findFirst({
    where: { organizationId: session.user.organizationId, isDefault: true },
    include: {
      stages: { orderBy: { order: "asc" } },
    },
  });

  if (!funnel) {
    return (
      <PageHeader
        title="Pipeline"
        description="No default funnel configured for this organization."
      />
    );
  }

  const opportunities = await db.opportunity.findMany({
    where: { funnelId: funnel.id, status: "OPEN" },
    include: {
      prospect: true,
      stage: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const byStage = funnel.stages.map((stage) => ({
    stage,
    items: opportunities.filter((o) => o.stageId === stage.id),
  }));

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description={`${funnel.name} — drag-and-drop coming in Phase 2`}
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {byStage.map(({ stage, items }) => (
          <div
            key={stage.id}
            className="min-w-[280px] flex-shrink-0 rounded-xl border border-slate-200 bg-slate-100/50"
          >
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">{stage.name}</h3>
              <p className="text-xs text-slate-500">
                {items.length} · {Math.round(stage.probability * 100)}% probability
              </p>
            </div>
            <div className="space-y-2 p-3">
              {items.map((opp) => (
                <Link
                  key={opp.id}
                  href={`/dashboard/prospects/${opp.prospectId}`}
                  className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-indigo-300"
                >
                  <p className="font-medium text-slate-900">
                    {prospectDisplayName(
                      opp.prospect.firstName,
                      opp.prospect.lastName,
                      opp.prospect.email,
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{opp.title}</p>
                  {opp.value != null && (
                    <p className="mt-1 text-sm font-medium text-emerald-600">
                      ${opp.value.toLocaleString()}
                    </p>
                  )}
                </Link>
              ))}
              {items.length === 0 && (
                <p className="p-2 text-center text-xs text-slate-400">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
