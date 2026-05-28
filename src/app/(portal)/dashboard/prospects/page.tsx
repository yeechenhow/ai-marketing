import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIFECYCLE_STAGE_COLORS, LIFECYCLE_STAGE_LABELS } from "@/lib/constants";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";

export default async function ProspectsPage() {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const prospects = await db.prospect.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      assignedTo: true,
      leadScore: true,
      personalityProfile: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Prospects"
        description="Central CRM — profiles, scoring, and assignment"
        actions={
          <Button asChild>
            <Link href="/dashboard/prospects/new">Add Prospect</Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Readiness</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/prospects/${p.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {prospectDisplayName(p.firstName, p.lastName, p.email, p.phone)}
                  </Link>
                  <p className="text-xs text-slate-500">{p.email ?? p.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge className={LIFECYCLE_STAGE_COLORS[p.lifecycleStage]}>
                    {LIFECYCLE_STAGE_LABELS[p.lifecycleStage]}
                  </Badge>
                </td>
                <td className="px-4 py-3 capitalize text-slate-600">
                  {p.source.toLowerCase().replace("_", " ")}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.assignedTo?.name ?? "Unassigned"}
                </td>
                <td className="px-4 py-3">
                  {p.leadScore
                    ? `${Math.round(p.leadScore.conversionProb * 100)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 capitalize text-slate-600">
                  {p.personalityProfile?.dealReadiness.toLowerCase().replace("_", " ") ?? (
                    <span className="text-slate-400">No profile</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/prospects/${p.id}/edit`}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prospects.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No prospects yet.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/prospects/new">Add your first prospect</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
