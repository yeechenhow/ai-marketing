import { NextRequest, NextResponse } from "next/server";
import { recordLinkClick } from "@/lib/workflows/tracked-links";

export const runtime = "nodejs";

/** GET /api/links/[slug]?p=prospectToken — track click and redirect. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const prospectToken = request.nextUrl.searchParams.get("p");

  const result = await recordLinkClick({ slug, prospectToken });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.redirect(result.destinationUrl, 302);
}
