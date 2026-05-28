import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function AdminAuditLogsPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      organization: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Platform-wide activity, model actions, and admin changes"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                </td>
                <td className="px-4 py-3 font-medium">{log.action}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{log.entityType}</Badge>
                  {log.entityId && (
                    <span className="ml-1 text-xs text-slate-400">{log.entityId.slice(0, 8)}…</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {log.organization?.name ?? "Platform"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {log.user?.name ?? log.user?.email ?? "System"}
                </td>
                <td className="px-4 py-3 text-slate-400">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No audit logs recorded.</p>
        )}
      </div>
    </div>
  );
}
