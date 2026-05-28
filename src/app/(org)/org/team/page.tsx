import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function OrgTeamPage() {
  const { organization } = await requireOrgSession();

  const [members, teams] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId: organization.id },
      include: {
        user: { include: { agentProfile: true } },
        team: true,
      },
      orderBy: { joinedAt: "asc" },
    }),
    db.team.findMany({
      where: { organizationId: organization.id },
      include: { _count: { select: { members: true } } },
    }),
  ]);

  const activeMembers = members.filter((m) => m.isActive);
  const agentCount = activeMembers.filter((m) => m.role === "AGENT").length;

  return (
    <div>
      <PageHeader
        title="Team Management"
        description="Manage agents, managers, and team assignments"
        actions={
          <Button asChild>
            <Link href="/org/team/new">Add Member</Link>
          </Button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total members</p>
          <p className="text-2xl font-bold">{activeMembers.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Agents</p>
          <p className="text-2xl font-bold">{agentCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Teams</p>
          <p className="text-2xl font-bold">{teams.length}</p>
        </div>
      </div>

      {teams.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {teams.map((t) => (
            <Badge key={t.id} variant="secondary">
              {t.name} ({t._count.members})
            </Badge>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Specialties</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {m.user.name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500">{m.user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default">{ROLE_LABELS[m.role]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{m.team?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {m.user.agentProfile?.specialties.join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDistanceToNow(m.joinedAt, { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.isActive ? "success" : "secondary"}>
                    {m.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
