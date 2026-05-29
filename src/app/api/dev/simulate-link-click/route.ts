import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildTrackedLinkUrl } from "@/lib/workflows/tracked-links";
import { recordLinkClick } from "@/lib/workflows/tracked-links";

export const runtime = "nodejs";

/**
 * Local dev helper — simulates a prospect clicking a tracked link.
 * POST /api/dev/simulate-link-click
 * Body: { slug, prospectId, organizationId }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_WEBHOOK_SIMULATE !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const body = (await request.json()) as {
    slug?: string;
    prospectId?: string;
    organizationId?: string;
  };

  if (!body.slug || !body.prospectId || !body.organizationId) {
    return NextResponse.json(
      { error: "slug, prospectId, and organizationId are required" },
      { status: 400 },
    );
  }

  const prospect = await db.prospect.findFirst({
    where: { id: body.prospectId, organizationId: body.organizationId },
  });
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const trackedUrl = buildTrackedLinkUrl(body.slug, body.prospectId, body.organizationId);
  const token = new URL(trackedUrl).searchParams.get("p");
  const result = await recordLinkClick({ slug: body.slug, prospectToken: token });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    prospectId: body.prospectId,
    destinationUrl: result.destinationUrl,
    trackedUrl,
    hint: "Workflow enrollments waiting for link_clicked should resume on the next tick",
  });
}
