import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assertWhatsAppObject,
  parseWhatsAppWebhookPayload,
  verifyWhatsAppSignature,
  WhatsAppWebhookError,
} from "@/lib/onboarding/whatsapp-webhook";
import type { WhatsAppWebhookPayload } from "@/lib/onboarding/whatsapp-types";
import { upsertProspectFromWhatsApp } from "@/lib/onboarding/prospect";
import { sendWhatsAppTextMessage } from "@/lib/onboarding/whatsapp-send";
import {
  getWhatsAppVerifyToken,
} from "@/lib/onboarding/config";
import { resolveWhatsAppAppSecret } from "@/lib/onboarding/org-settings";
import {
  getCampaignVerifyToken,
  isWhatsAppOnboardingConfig,
} from "@/lib/onboarding/campaign-config";

export type WebhookContext =
  | { mode: "global" }
  | { mode: "campaign"; organizationId: string; campaignId: string; campaignName: string };

export async function handleWhatsAppWebhookVerification(
  request: NextRequest,
  verifyToken: string | null | undefined,
): Promise<NextResponse> {
  if (!verifyToken) {
    return NextResponse.json(
      { error: "Webhook verify token is not configured for this campaign" },
      { status: 503 },
    );
  }

  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function handleWhatsAppWebhookPost(
  request: NextRequest,
  context: WebhookContext,
  options?: { skipOutbound?: boolean },
): Promise<NextResponse> {
  const rawBody = await request.text();
  const previewOrgId =
    context.mode === "campaign" ? context.organizationId : undefined;
  const appSecret = await resolveWhatsAppAppSecret(previewOrgId);

  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "WhatsApp app secret is required in production" },
      { status: 503 },
    );
  }

  let body: WhatsAppWebhookPayload;
  try {
    body = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  assertWhatsAppObject(body);

  const inbound = parseWhatsAppWebhookPayload(body);
  if (!inbound) {
    return NextResponse.json({ ok: true, skipped: "no_inbound_message" });
  }

  let organizationId: string;
  let channelConnectionId: string | undefined;
  let campaignId: string | undefined;
  let campaignName: string | undefined;
  let welcomeMessage: string | undefined;

  if (context.mode === "campaign") {
    organizationId = context.organizationId;
    campaignId = context.campaignId;
    campaignName = context.campaignName;

    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign || !isWhatsAppOnboardingConfig(campaign.config)) {
      return NextResponse.json({ error: "Invalid onboarding campaign" }, { status: 404 });
    }

    welcomeMessage = campaign.config.welcomeMessage;
    channelConnectionId = campaign.config.channelConnectionId;

    if (campaign.config.channelConnectionId) {
      const connection = await db.channelConnection.findFirst({
        where: {
          id: campaign.config.channelConnectionId,
          organizationId,
          channel: "WHATSAPP",
          isActive: true,
        },
      });
      if (connection) channelConnectionId = connection.id;
    }
  } else {
    const { resolveOrganizationFromWhatsAppPhoneNumberId } = await import(
      "@/lib/onboarding/prospect"
    );
    const tenant = await resolveOrganizationFromWhatsAppPhoneNumberId(
      inbound.phoneNumberId,
    );
    if (!tenant) {
      return NextResponse.json(
        { error: "No organization mapped to this WhatsApp phone number ID" },
        { status: 422 },
      );
    }
    organizationId = tenant.organizationId;
    channelConnectionId = tenant.channelConnectionId;
  }

  const result = await upsertProspectFromWhatsApp({
    organizationId,
    whatsappPhone: inbound.from,
    whatsappName: inbound.profileName,
    channelConnectionId,
    messageBody: inbound.messageBody,
    externalMessageId: inbound.messageId,
    campaignId,
    campaignName,
  });

  const replyText = buildWelcomeReply({
    profileName: inbound.profileName,
    registrationUrl: result.registrationUrl,
    welcomeMessage,
  });

  if (!options?.skipOutbound) {
    await sendWhatsAppTextMessage({
      phoneNumberId: inbound.phoneNumberId,
      to: inbound.from,
      body: replyText,
      organizationId,
    });
  }

  return NextResponse.json({
    ok: true,
    prospectId: result.prospect.id,
    registrationUrl: result.registrationUrl,
    campaignId,
  });
}

function buildWelcomeReply(input: {
  profileName?: string;
  registrationUrl: string;
  welcomeMessage?: string;
}): string {
  if (input.welcomeMessage) {
    return `${input.welcomeMessage}\n\n${input.registrationUrl}`;
  }

  const greeting = input.profileName
    ? `Thanks, ${input.profileName.split(" ")[0]}!`
    : "Thanks!";

  return [
    `${greeting} Complete your profile to unlock a tailored experience:`,
    input.registrationUrl,
  ].join("\n\n");
}

export function getGlobalVerifyToken(): string | undefined {
  return getWhatsAppVerifyToken();
}

export async function resolveCampaignWebhookContext(
  orgSlug: string,
  campaignId: string,
): Promise<
  | { ok: true; context: Extract<WebhookContext, { mode: "campaign" }>; verifyToken: string }
  | { ok: false; status: number; error: string }
> {
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, isActive: true },
  });

  if (!organization?.isActive) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: organization.id },
  });

  if (!campaign) {
    return { ok: false, status: 404, error: "Campaign not found" };
  }

  if (!isWhatsAppOnboardingConfig(campaign.config)) {
    return { ok: false, status: 400, error: "Campaign is not a WhatsApp onboarding hook" };
  }

  return {
    ok: true,
    context: {
      mode: "campaign",
      organizationId: organization.id,
      campaignId: campaign.id,
      campaignName: campaign.name,
    },
    verifyToken: campaign.config.webhookVerifyToken,
  };
}

export function buildSampleWebhookPayload(input: {
  phoneNumberId: string;
  from: string;
  profileName?: string;
  messageBody?: string;
}): WhatsAppWebhookPayload {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550000000",
                phone_number_id: input.phoneNumberId,
              },
              contacts: [
                {
                  profile: { name: input.profileName ?? "Test User" },
                  wa_id: input.from,
                },
              ],
              messages: [
                {
                  from: input.from,
                  id: `wamid.test.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: input.messageBody ?? "Hi, I want to register" },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}
