import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApproveTemplateButton } from "@/components/org/approve-template-button";
import Link from "next/link";

export default async function OrgTemplatesPage() {
  const { organization } = await requireOrgSession();

  const templates = await db.messageTemplate.findMany({
    where: { organizationId: organization.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Template Center"
        description="Approved message templates for WhatsApp, Messenger, and email"
        actions={
          <Button asChild>
            <Link href="/org/templates/new">Create Template</Link>
          </Button>
        }
      />

      {templates.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{t.name}</p>
                    <p className="line-clamp-1 text-xs text-slate-500">{t.content}</p>
                  </td>
                  <td className="px-4 py-3">{t.channel}</td>
                  <td className="px-4 py-3 text-slate-500">{t.category ?? "—"}</td>
                  <td className="px-4 py-3">{t.language}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.isApproved ? "success" : "warning"}>
                      {t.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {!t.isApproved && <ApproveTemplateButton templateId={t.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No templates yet"
          description="Create channel-specific templates. WhatsApp outbound requires approved templates outside the 24h service window."
          action={
            <Button asChild>
              <Link href="/org/templates/new">Create Template</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
