import { requireManagerSession } from "@/lib/manager";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";

export default async function ManagerPipelinePage() {
  const { organization } = await requireManagerSession();

  const funnel = await db.funnel.findFirst({
    where: { organizationId: organization.id, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  if (!funnel) {
    return (
      <PageHeader title="Team Pipeline" description="No default funnel configured." />
    );
  }

  const opportunities = await db.opportunity.findMany({
    where: { funnelId: funnel.id, status: "OPEN" },
    include: {
      prospect: { include: { assignedTo: true } },
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
        title="Team Pipeline"
        description={`${funnel.name} — all agents, full team view`}
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {byStage.map(({ stage, items }) => (
          <div
            key={stage.id}
            className="min-w-[300px] flex-shrink-0 rounded-xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 bg-amber-50/50 p-4">
              <h3 className="font-semibold text-slate-900">{stage.name}</h3>
              <p className="text-xs text-slate-500">
                {items.length} deals · {Math.round(stage.probability * 100)}% probability
              </p>
            </div>
            <div className="space-y-2 p-3">
              {items.map((opp) => (
                <div
                  key={opp.id}
                  className="rounded-lg border border-slate-100 p-3 hover:border-amber-200"
                >
                  <p className="font-medium text-slate-900">
                    {prospectDisplayName(
                      opp.prospect.firstName,
                      opp.prospect.lastName,
                      opp.prospect.email,
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {opp.prospect.assignedTo?.name ?? "Unassigned"}
                  </p>
                  {opp.value != null && (
                    <p className="mt-1 text-sm font-medium text-emerald-600">
                      ${opp.value.toLocaleString()}
                    </p>
                  )}
                </div>
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
