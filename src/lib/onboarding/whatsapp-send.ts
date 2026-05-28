import { db } from "@/lib/db";
import { resolveWhatsAppCredentialsForOrg } from "@/lib/onboarding/org-settings";

type WhatsAppCredentials = {
  accessToken: string;
  phoneNumberId: string;
};

export class WhatsAppSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppSendError";
  }
}

export async function resolveWhatsAppCredentials(
  phoneNumberId: string,
  organizationId?: string,
): Promise<WhatsAppCredentials> {
  if (organizationId) {
    const orgCreds = await resolveWhatsAppCredentialsForOrg(organizationId, phoneNumberId);
    if (orgCreds) return orgCreds;
  }

  const connection = await db.channelConnection.findFirst({
    where: {
      channel: "WHATSAPP",
      externalId: phoneNumberId,
      isActive: true,
    },
  });

  if (connection?.credentials && typeof connection.credentials === "object") {
    const creds = connection.credentials as Record<string, unknown>;
    const accessToken = typeof creds.accessToken === "string" ? creds.accessToken : undefined;
    const resolvedPhoneNumberId =
      typeof creds.phoneNumberId === "string" ? creds.phoneNumberId : phoneNumberId;

    if (accessToken) {
      return { accessToken, phoneNumberId: resolvedPhoneNumberId };
    }
  }

  const envToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || phoneNumberId;

  if (envToken) {
    return { accessToken: envToken, phoneNumberId: envPhoneNumberId };
  }

  throw new WhatsAppSendError(
    "WhatsApp credentials not configured. Add them in Org Admin → Onboarding Settings.",
  );
}

export async function sendWhatsAppTextMessage(input: {
  phoneNumberId: string;
  to: string;
  body: string;
  organizationId?: string;
}): Promise<void> {
  const { accessToken, phoneNumberId } = await resolveWhatsAppCredentials(
    input.phoneNumberId,
    input.organizationId,
  );

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.to,
        type: "text",
        text: { preview_url: true, body: input.body },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new WhatsAppSendError(
      `Failed to send WhatsApp message (${response.status}): ${errorBody.slice(0, 300)}`,
    );
  }
}
