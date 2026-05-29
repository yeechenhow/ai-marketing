import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/onboarding/config";
import { signOnboardingToken, verifyOnboardingToken } from "@/lib/onboarding/token";
import { resumeWorkflowsForProspect } from "@/lib/workflows/engine";

function randomSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export function buildTrackedLinkUrl(slug: string, prospectId: string, organizationId: string): string {
  const token = signOnboardingToken({ prospectId, organizationId });
  const base = getAppBaseUrl();
  return `${base}/api/links/${slug}?p=${encodeURIComponent(token)}`;
}

export async function createTrackedLink(input: {
  organizationId: string;
  campaignId?: string | null;
  destinationUrl: string;
  label?: string;
}) {
  const destinationUrl = input.destinationUrl.trim();
  if (!destinationUrl) throw new Error("Destination URL is required");

  let slug = randomSlug();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.trackedLink.findUnique({ where: { slug } });
    if (!existing) break;
    slug = randomSlug();
  }

  return db.trackedLink.create({
    data: {
      organizationId: input.organizationId,
      campaignId: input.campaignId || null,
      slug,
      destinationUrl,
      label: input.label?.trim() || null,
    },
  });
}

export async function recordLinkClick(input: {
  slug: string;
  prospectToken?: string | null;
}): Promise<{ ok: true; destinationUrl: string; prospectId?: string } | { ok: false; error: string }> {
  const link = await db.trackedLink.findUnique({ where: { slug: input.slug } });
  if (!link) return { ok: false, error: "Link not found" };

  let prospectId: string | undefined;
  let organizationId = link.organizationId;

  if (input.prospectToken) {
    try {
      const payload = verifyOnboardingToken(input.prospectToken);
      prospectId = payload.prospectId;
      organizationId = payload.organizationId;
      if (organizationId !== link.organizationId) {
        return { ok: false, error: "Invalid prospect token for this link" };
      }
    } catch {
      // Anonymous click — still redirect but skip prospect attribution.
    }
  }

  if (prospectId) {
    const prospect = await db.prospect.findFirst({
      where: { id: prospectId, organizationId },
      select: { id: true, tags: true },
    });

    if (prospect) {
      const tags = new Set(prospect.tags ?? []);
      tags.add("link-click");
      await db.prospect.update({
        where: { id: prospect.id },
        data: { tags: Array.from(tags), lastTouchAt: new Date() },
      });

      await db.activity.create({
        data: {
          prospectId: prospect.id,
          type: "VISIT",
          title: "Promotion link clicked",
          body: link.label ?? link.destinationUrl,
          metadata: {
            source: "tracked_link",
            linkId: link.id,
            slug: link.slug,
            campaignId: link.campaignId,
            destinationUrl: link.destinationUrl,
          },
        },
      });

      await resumeWorkflowsForProspect({
        prospectId: prospect.id,
        event: "link_clicked",
      });
    }
  }

  return { ok: true, destinationUrl: link.destinationUrl, prospectId };
}
