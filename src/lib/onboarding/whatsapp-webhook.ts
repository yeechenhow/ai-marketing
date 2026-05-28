import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  ParsedWhatsAppInbound,
  WhatsAppWebhookPayload,
} from "@/lib/onboarding/whatsapp-types";

export class WhatsAppWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppWebhookError";
  }
}

export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch {
    return false;
  }
}

export function parseWhatsAppWebhookPayload(
  body: WhatsAppWebhookPayload,
): ParsedWhatsAppInbound | null {
  const value = body.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const phoneNumberId = value?.metadata?.phone_number_id;

  if (!message?.from || !phoneNumberId) return null;

  const profileName =
    value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name ??
    value.contacts?.[0]?.profile?.name;

  return {
    phoneNumberId,
    from: message.from,
    profileName,
    messageId: message.id,
    messageBody: message.text?.body,
    timestamp: message.timestamp,
  };
}

export function assertWhatsAppObject(body: WhatsAppWebhookPayload): void {
  if (body.object && body.object !== "whatsapp_business_account") {
    throw new WhatsAppWebhookError(`Unsupported webhook object: ${body.object}`);
  }
}
