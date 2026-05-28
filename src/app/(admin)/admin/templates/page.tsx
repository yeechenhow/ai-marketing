import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";

export default async function AdminTemplatesPage() {
  const templates = await db.messageTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: { organization: { select: { name: true, slug: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Global Template Library"
        description="All message templates across tenants — WhatsApp, Messenger, email"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Language</th>
              <th className="px-4 py-3">Approved</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{t.name}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{t.content}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.organization.name}</td>
                <td className="px-4 py-3">{t.channel}</td>
                <td className="px-4 py-3 text-slate-500">{t.category ?? "—"}</td>
                <td className="px-4 py-3">{t.language}</td>
                <td className="px-4 py-3">
                  <Badge variant={t.isApproved ? "success" : "warning"}>
                    {t.isApproved ? "Approved" : "Pending"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No templates on the platform.</p>
        )}
      </div>
    </div>
  );
}
