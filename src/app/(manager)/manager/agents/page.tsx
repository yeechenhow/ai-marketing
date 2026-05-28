import { requireManagerSession } from "@/lib/manager";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";

export default async function ManagerAgentsPage() {
  const { organization } = await requireManagerSession();

  const agents = await db.organizationMember.findMany({
    where: { organizationId: organization.id, isActive: true, role: "AGENT" },
    include: {
      user: {
        include: {
          agentProfile: true,
          assignedProspects: {
              include: { leadScore: true },
            },
          assignedTasks: {
            where: { status: { in: ["TODO", "IN_PROGRESS"] } },
          },
        },
      },
    },
  });

  const rankings = agents
    .map((m) => {
      const prospects = m.user.assignedProspects;
      const won = prospects.filter((p) => p.lifecycleStage === "WON").length;
      const qualified = prospects.filter((p) =>
        ["QUALIFIED", "PROPOSAL", "NEGOTIATION"].includes(p.lifecycleStage),
      ).length;
      const total = prospects.length;
      const avgScore =
        prospects.filter((p) => p.leadScore).length > 0
          ? prospects.reduce((sum, p) => sum + (p.leadScore?.conversionProb ?? 0), 0) /
            prospects.filter((p) => p.leadScore).length
          : 0;

      return {
        id: m.userId,
        name: m.user.name ?? m.user.email,
        specialties: m.user.agentProfile?.specialties ?? [],
        total,
        won,
        qualified,
        openTasks: m.user.assignedTasks.length,
        closeRate: total > 0 ? Math.round((won / total) * 100) : 0,
        avgScore: Math.round(avgScore * 100),
      };
    })
    .sort((a, b) => b.won - a.won || b.qualified - a.qualified);

  return (
    <div>
      <PageHeader
        title="Performance Leaderboard"
        description="Agent conversion, workload, and lead quality scores"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-amber-50/50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Prospects</th>
              <th className="px-4 py-3 font-medium">Qualified</th>
              <th className="px-4 py-3 font-medium">Won</th>
              <th className="px-4 py-3 font-medium">Close Rate</th>
              <th className="px-4 py-3 font-medium">Avg Score</th>
              <th className="px-4 py-3 font-medium">Open Tasks</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((a, i) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-amber-200 text-amber-800"
                        : i === 1
                          ? "bg-slate-200 text-slate-700"
                          : i === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{a.name}</p>
                  {a.specialties.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {a.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{a.total}</td>
                <td className="px-4 py-3">{a.qualified}</td>
                <td className="px-4 py-3 font-medium text-emerald-600">{a.won}</td>
                <td className="px-4 py-3">{a.closeRate}%</td>
                <td className="px-4 py-3">{a.avgScore}%</td>
                <td className="px-4 py-3">
                  <Badge variant={a.openTasks > 5 ? "warning" : "secondary"}>
                    {a.openTasks}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rankings.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No agents on the team.</p>
        )}
      </div>
    </div>
  );
}
