import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LaunchCampaignButton } from "@/components/org/launch-campaign-button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function OrgCampaignsPage() {
  const { organization } = await requireOrgSession();

  const campaigns = await db.campaign.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Campaign Manager"
        description="Drip campaigns, nurture sequences, and reactivation flows"
        actions={
          <Button asChild>
            <Link href="/org/campaigns/new">Create Campaign</Link>
          </Button>
        }
      />

      {campaigns.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/org/campaigns/${c.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {c.name}
                    </Link>
                    {c.description && (
                      <p className="text-xs text-slate-500">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.startedAt
                      ? formatDistanceToNow(c.startedAt, { addSuffix: true })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDistanceToNow(c.createdAt, { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "draft" && <LaunchCampaignButton campaignId={c.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No campaigns yet"
          description="Create drip campaigns, promotions, or reactivation sequences for your segments."
          action={
            <Button asChild>
              <Link href="/org/campaigns/new">Create Campaign</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
