import { randomUUID } from "node:crypto";

export type WhatsAppOnboardingCampaignConfig = {
  kind: "whatsapp_onboarding";
  webhookVerifyToken: string;
  prefilledMessage: string;
  businessPhone?: string;
  channelConnectionId?: string;
  welcomeMessage?: string;
};

export type CampaignConfig = WhatsAppOnboardingCampaignConfig | Record<string, unknown>;

export function isWhatsAppOnboardingConfig(
  config: unknown,
): config is WhatsAppOnboardingCampaignConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    (config as WhatsAppOnboardingCampaignConfig).kind === "whatsapp_onboarding"
  );
}

export function createWhatsAppOnboardingConfig(input: {
  prefilledMessage: string;
  businessPhone?: string;
  channelConnectionId?: string;
  welcomeMessage?: string;
}): WhatsAppOnboardingCampaignConfig {
  return {
    kind: "whatsapp_onboarding",
    webhookVerifyToken: randomUUID().replace(/-/g, ""),
    prefilledMessage: input.prefilledMessage.trim(),
    businessPhone: input.businessPhone?.replace(/\D/g, "") || undefined,
    channelConnectionId: input.channelConnectionId || undefined,
    welcomeMessage: input.welcomeMessage?.trim() || undefined,
  };
}

export function buildCampaignWebhookUrl(
  baseUrl: string,
  orgSlug: string,
  campaignId: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/${orgSlug}/${campaignId}`;
}

export function parseCampaignConfig(raw: unknown): CampaignConfig | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as CampaignConfig;
}

export function getCampaignVerifyToken(config: unknown): string | null {
  if (!isWhatsAppOnboardingConfig(config)) return null;
  return config.webhookVerifyToken;
}
