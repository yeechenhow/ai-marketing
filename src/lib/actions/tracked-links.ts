"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessOrgPortal } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { createTrackedLink, buildTrackedLinkUrl } from "@/lib/workflows/tracked-links";

async function requireOrgAdmin() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  if (!canAccessOrgPortal(session.user)) throw new Error("Forbidden");
  return session;
}

export async function createCampaignTrackedLink(
  campaignId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const destinationUrl = String(formData.get("destinationUrl") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!destinationUrl) return { ok: false, error: "Destination URL is required" };

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
  });
  if (!campaign) return { ok: false, error: "Campaign not found" };

  try {
    const link = await createTrackedLink({
      organizationId: orgId,
      campaignId,
      destinationUrl,
      label: label || undefined,
    });
    revalidatePath(`/org/campaigns/${campaignId}`);
    return { ok: true, slug: link.slug };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create link",
    };
  }
}

export async function getCampaignTrackedLinks(campaignId: string) {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  return db.trackedLink.findMany({
    where: { campaignId, organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });
}

export async function buildProspectTrackedUrl(
  slug: string,
  prospectId: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const link = await db.trackedLink.findFirst({
    where: { slug, organizationId: orgId },
  });
  if (!link) return { ok: false, error: "Link not found" };

  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, organizationId: orgId },
  });
  if (!prospect) return { ok: false, error: "Prospect not found" };

  return { ok: true, url: buildTrackedLinkUrl(slug, prospectId, orgId) };
}
