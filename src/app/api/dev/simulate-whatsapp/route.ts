import { NextRequest, NextResponse } from "next/server";
import {
  buildSampleWebhookPayload,
  handleWhatsAppWebhookPost,
  resolveCampaignWebhookContext,
} from "@/lib/onboarding/handle-webhook";
import { WhatsAppWebhookError } from "@/lib/onboarding/whatsapp-webhook";

export const runtime = "nodejs";

/**
 * Local dev helper — simulates Meta WhatsApp webhook without ngrok.
 * POST /api/dev/simulate-whatsapp
 * Body: { orgSlug, campaignId, from?, profileName?, messageBody?, phoneNumberId?, skipSend? }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_WEBHOOK_SIMULATE !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      orgSlug: string;
      campaignId: string;
      from?: string;
      profileName?: string;
      messageBody?: string;
      phoneNumberId?: string;
      skipSend?: boolean;
    };

    if (!body.orgSlug || !body.campaignId) {
      return NextResponse.json(
        { error: "orgSlug and campaignId are required" },
        { status: 400 },
      );
    }

    const resolved = await resolveCampaignWebhookContext(body.orgSlug, body.campaignId);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const payload = buildSampleWebhookPayload({
      phoneNumberId: body.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "test_phone_number_id",
      from: body.from ?? "6591234567",
      profileName: body.profileName ?? "Local Test User",
      messageBody: body.messageBody,
    });

    const fakeRequest = new NextRequest(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await handleWhatsAppWebhookPost(fakeRequest, resolved.context, {
      skipOutbound: body.skipSend ?? !process.env.WHATSAPP_ACCESS_TOKEN,
    });

    const data = await response.json();
    return NextResponse.json({
      ...data,
      hint: "Open registrationUrl in your browser to test OAuth buttons",
      simulateEndpoint: "/api/dev/simulate-whatsapp",
    });
  } catch (error) {
    if (error instanceof WhatsAppWebhookError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[dev simulate whatsapp]", error);
    const message = error instanceof Error ? error.message : "Simulation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
