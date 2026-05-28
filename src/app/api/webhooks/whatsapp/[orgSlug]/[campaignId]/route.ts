import { NextRequest, NextResponse } from "next/server";
import {
  handleWhatsAppWebhookPost,
  handleWhatsAppWebhookVerification,
  resolveCampaignWebhookContext,
} from "@/lib/onboarding/handle-webhook";
import { WhatsAppWebhookError } from "@/lib/onboarding/whatsapp-webhook";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orgSlug: string; campaignId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orgSlug, campaignId } = await context.params;
    const resolved = await resolveCampaignWebhookContext(orgSlug, campaignId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    return handleWhatsAppWebhookVerification(request, resolved.verifyToken);
  } catch (error) {
    console.error("[campaign whatsapp webhook GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orgSlug, campaignId } = await context.params;
    const resolved = await resolveCampaignWebhookContext(orgSlug, campaignId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    return handleWhatsAppWebhookPost(request, resolved.context);
  } catch (error) {
    if (error instanceof WhatsAppWebhookError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[campaign whatsapp webhook POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
