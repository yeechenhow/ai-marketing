import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        include: { organization: true },
      },
      agentProfile: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Platform Users"
        description="All users across organizations and platform roles"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Platform Role</th>
              <th className="px-4 py-3 font-medium">Organizations</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{user.name ?? "—"}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      user.platformRole === "SUPER_ADMIN" ? "default" : "secondary"
                    }
                  >
                    {ROLE_LABELS[user.platformRole]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.memberships.map((m) => (
                      <Badge key={m.id} variant="secondary">
                        {m.organization.name} ({ROLE_LABELS[m.role]})
                      </Badge>
                    ))}
                    {user.memberships.length === 0 && (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
