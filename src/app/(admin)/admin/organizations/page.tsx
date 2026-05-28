import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function AdminOrganizationsPage() {
  const organizations = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: true,
          prospects: true,
          channelConnections: true,
          aiAgents: true,
          campaigns: true,
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Manage all tenant workspaces, plans, and status"
        actions={
          <Button asChild>
            <Link href="/admin/organizations/new">Create Organization</Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Prospects</th>
              <th className="px-4 py-3 font-medium">Channels</th>
              <th className="px-4 py-3 font-medium">AI Agents</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="font-medium text-violet-600 hover:underline"
                  >
                    {org.name}
                  </Link>
                  <p className="text-xs text-slate-500">{org.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{org.plan}</Badge>
                </td>
                <td className="px-4 py-3">{org._count.members}</td>
                <td className="px-4 py-3">{org._count.prospects}</td>
                <td className="px-4 py-3">{org._count.channelConnections}</td>
                <td className="px-4 py-3">{org._count.aiAgents}</td>
                <td className="px-4 py-3">
                  <Badge variant={org.isActive ? "success" : "destructive"}>
                    {org.isActive ? "Active" : "Suspended"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDistanceToNow(org.createdAt, { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizations.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            No organizations on the platform yet.
          </p>
        )}
      </div>
    </div>
  );
}
