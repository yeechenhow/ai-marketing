import { db } from "@/lib/db";

export type TrackedLinkRow = {
  id: string;
  slug: string;
  destinationUrl: string;
  label: string | null;
  createdAt: Date;
};

/** Load tracked links; returns empty if Prisma client needs a dev-server restart. */
export async function listCampaignTrackedLinks(
  organizationId: string,
  campaignId: string,
): Promise<{ links: TrackedLinkRow[]; needsClientRefresh: boolean }> {
  const client = db as typeof db & {
    trackedLink?: { findMany: typeof db.campaign.findMany };
  };

  if (!client.trackedLink?.findMany) {
    return { links: [], needsClientRefresh: true };
  }

  const links = await client.trackedLink.findMany({
    where: { campaignId, organizationId },
    orderBy: { createdAt: "desc" },
  });

  return { links, needsClientRefresh: false };
}
