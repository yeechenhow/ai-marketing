import { NextRequest, NextResponse } from "next/server";
import {
  getGlobalVerifyToken,
  handleWhatsAppWebhookPost,
  handleWhatsAppWebhookVerification,
} from "@/lib/onboarding/handle-webhook";

export const runtime = "nodejs";

/** Legacy global webhook — prefer /api/webhooks/whatsapp/[orgSlug]/[campaignId] per campaign. */
export async function GET(request: NextRequest) {
  try {
    return handleWhatsAppWebhookVerification(request, getGlobalVerifyToken());
  } catch (error) {
    console.error("[whatsapp webhook GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return handleWhatsAppWebhookPost(request, { mode: "global" });
  } catch (error) {
    if (error instanceof Error && error.name === "WhatsAppWebhookError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[whatsapp webhook POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
