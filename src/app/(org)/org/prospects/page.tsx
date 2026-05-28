import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIFECYCLE_STAGE_COLORS, LIFECYCLE_STAGE_LABELS } from "@/lib/constants";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function OrgProspectsPage() {
  const { organization } = await requireOrgSession();

  const prospects = await db.prospect.findMany({
    where: { organizationId: organization.id },
    include: {
      leadScore: true,
      personalityProfile: true,
      socialIdentities: true,
      _count: { select: { enrichmentRecords: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Prospects"
        description="Click a contact name or Customer 360 to open the full profile"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/prospects">Agent CRM view</Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">360 status</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/org/prospects/${p.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {prospectDisplayName(
                      p.firstName,
                      p.lastName,
                      p.email,
                      p.phone,
                      p.whatsappName,
                      p.whatsappPhone,
                    )}
                  </Link>
                  <p className="text-xs text-slate-500">{p.email ?? "No email yet"}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.whatsappPhone ? (
                    <span className="text-xs">••••{p.whatsappPhone.slice(-4)}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.registrationCompletedAt ? (
                    <Badge variant="success">Registered</Badge>
                  ) : p.whatsappPhone ? (
                    <Badge variant="warning">WhatsApp only</Badge>
                  ) : (
                    <Badge variant="secondary">Manual</Badge>
                  )}
                  {p.socialIdentities.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {p.socialIdentities.map((s) => s.platformName.toLowerCase()).join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge className={LIFECYCLE_STAGE_COLORS[p.lifecycleStage]}>
                    {LIFECYCLE_STAGE_LABELS[p.lifecycleStage]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <Button variant="default" size="sm" asChild>
                    <Link href={`/org/prospects/${p.id}`}>Customer 360</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prospects.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No prospects yet. Create a campaign and click <strong>Test now</strong>, then complete
            registration with Dev simulate.
          </div>
        )}
      </div>
    </div>
  );
}
