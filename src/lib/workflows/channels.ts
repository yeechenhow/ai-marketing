import { db } from "@/lib/db";
import type { Channel } from "@/generated/prisma/client";
import { sendWhatsAppTextMessage } from "@/lib/onboarding/whatsapp-send";
import { resolveWhatsAppCredentialsForOrg } from "@/lib/onboarding/org-settings";

/**
 * Whether outbound sends are simulated (logged only) instead of hitting real
 * providers. Defaults to TRUE so workflows run end-to-end without provider
 * accounts. Set WORKFLOW_SIMULATE_SENDS=false to enable real delivery where
 * credentials exist (currently WhatsApp only).
 */
export function isSimulateMode(): boolean {
  return process.env.WORKFLOW_SIMULATE_SENDS !== "false";
}

export type SendChannel = "WHATSAPP" | "SMS" | "EMAIL" | "MESSENGER";

export type ChannelSendResult = {
  ok: boolean;
  simulated: boolean;
  detail: string;
};

type SendInput = {
  organizationId: string;
  prospectId: string;
  channel: SendChannel;
  body: string;
};

/**
 * Sends (or simulates) a message to a prospect on a channel, records it on the
 * conversation timeline + prospect activity, and returns a human-readable
 * result for the workflow execution log.
 */
export async function sendChannelMessage(input: SendInput): Promise<ChannelSendResult> {
  const simulate = isSimulateMode();
  const prospect = await db.prospect.findFirst({
    where: { id: input.prospectId, organizationId: input.organizationId },
  });
  if (!prospect) {
    return { ok: false, simulated: simulate, detail: "Prospect not found" };
  }

  const conversation = await ensureConversation(
    input.organizationId,
    input.prospectId,
    input.channel as Channel,
    prospect.whatsappPhone ?? prospect.phone ?? undefined,
  );

  let delivered = false;
  let detail = "";

  if (!simulate && input.channel === "WHATSAPP" && prospect.whatsappPhone) {
    try {
      const creds = await resolveWhatsAppCredentialsForOrg(
        input.organizationId,
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
      );
      if (creds) {
        await sendWhatsAppTextMessage({
          phoneNumberId: creds.phoneNumberId,
          to: prospect.whatsappPhone,
          body: input.body,
          organizationId: input.organizationId,
        });
        delivered = true;
        detail = `Sent WhatsApp to ••••${prospect.whatsappPhone.slice(-4)}`;
      } else {
        detail = "WhatsApp creds missing — logged only";
      }
    } catch (error) {
      detail = `WhatsApp send failed: ${error instanceof Error ? error.message : "unknown"}`;
    }
  }

  if (!delivered) {
    // Simulate / no real provider: record what WOULD be sent.
    detail =
      detail ||
      `[SIMULATED ${input.channel}] ${input.body.slice(0, 80)}${input.body.length > 80 ? "…" : ""}`;
  }

  await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      content: input.body,
      status: delivered ? "SENT" : "PENDING",
      sentAt: delivered ? new Date() : null,
      metadata: {
        channel: input.channel,
        source: "workflow",
        simulated: !delivered,
      },
    },
  });

  await db.activity.create({
    data: {
      prospectId: input.prospectId,
      type: "MESSAGE",
      title: `${delivered ? "Sent" : "Simulated"} ${input.channel} (workflow)`,
      body: input.body.slice(0, 500),
      metadata: { channel: input.channel, simulated: !delivered, source: "workflow" },
    },
  });

  return { ok: true, simulated: !delivered, detail };
}

async function ensureConversation(
  organizationId: string,
  prospectId: string,
  channel: Channel,
  externalThreadId?: string,
) {
  const existing = await db.conversation.findFirst({
    where: {
      organizationId,
      prospectId,
      channel,
      status: { in: ["OPEN", "PENDING"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    await db.conversation.update({
      where: { id: existing.id },
      data: { lastMessageAt: new Date() },
    });
    return existing;
  }

  return db.conversation.create({
    data: {
      organizationId,
      prospectId,
      channel,
      status: "OPEN",
      externalThreadId,
      lastMessageAt: new Date(),
    },
  });
}
