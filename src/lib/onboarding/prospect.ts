import { db } from "@/lib/db";
import type { Channel, LeadSource } from "@/generated/prisma/client";
import { buildRegistrationUrl, signOnboardingToken } from "@/lib/onboarding/token";

export async function resolveOrganizationFromWhatsAppPhoneNumberId(
  phoneNumberId: string,
): Promise<{ organizationId: string; channelConnectionId?: string } | null> {
  const connection = await db.channelConnection.findFirst({
    where: {
      channel: "WHATSAPP",
      externalId: phoneNumberId,
      isActive: true,
    },
    select: { id: true, organizationId: true },
  });

  if (connection) {
    return {
      organizationId: connection.organizationId,
      channelConnectionId: connection.id,
    };
  }

  const fallbackOrgId = process.env.WHATSAPP_DEFAULT_ORG_ID?.trim();
  if (fallbackOrgId) {
    const org = await db.organization.findFirst({
      where: { id: fallbackOrgId, isActive: true },
      select: { id: true },
    });
    if (org) return { organizationId: org.id };
  }

  return null;
}

export async function upsertProspectFromWhatsApp(input: {
  organizationId: string;
  whatsappPhone: string;
  whatsappName?: string;
  channelConnectionId?: string;
  messageBody?: string;
  externalMessageId?: string;
  campaignId?: string;
  campaignName?: string;
}) {
  const normalizedPhone = input.whatsappPhone.replace(/\D/g, "");

  const existing = await db.prospect.findFirst({
    where: {
      organizationId: input.organizationId,
      whatsappPhone: normalizedPhone,
    },
  });

  const source: LeadSource = "WHATSAPP_CLICK";
  const nameParts = splitWhatsAppName(input.whatsappName);

  const sourceDetail = input.campaignName
    ? `Campaign: ${input.campaignName}`
    : "WhatsApp QR onboarding";

  const prospect = existing
    ? await db.prospect.update({
        where: { id: existing.id },
        data: {
          whatsappName: input.whatsappName ?? existing.whatsappName,
          phone: existing.phone ?? normalizedPhone,
          firstName: existing.firstName ?? nameParts.firstName,
          lastName: existing.lastName ?? nameParts.lastName,
          lastTouchAt: new Date(),
          source: existing.source === "MANUAL" ? source : existing.source,
        },
      })
    : await db.prospect.create({
        data: {
          organizationId: input.organizationId,
          whatsappPhone: normalizedPhone,
          whatsappName: input.whatsappName,
          phone: normalizedPhone,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          source,
          sourceDetail,
          lifecycleStage: "NEW",
          lastTouchAt: new Date(),
        },
      });

  const channel: Channel = "WHATSAPP";
  let conversation = await db.conversation.findFirst({
    where: {
      organizationId: input.organizationId,
      prospectId: prospect.id,
      channel,
      status: { in: ["OPEN", "PENDING"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        organizationId: input.organizationId,
        prospectId: prospect.id,
        channel,
        channelConnectionId: input.channelConnectionId,
        status: "OPEN",
        externalThreadId: normalizedPhone,
        lastMessageAt: new Date(),
      },
    });
  } else {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  if (input.messageBody) {
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        content: input.messageBody,
        status: "DELIVERED",
        externalId: input.externalMessageId,
        sentAt: new Date(),
        metadata: {
          channel: "WHATSAPP",
          onboarding: true,
          campaignId: input.campaignId,
        },
      },
    });

    await db.activity.create({
      data: {
        prospectId: prospect.id,
        type: "MESSAGE",
        title: "WhatsApp onboarding message received",
        body: input.messageBody.slice(0, 500),
        metadata: {
          channel: "WHATSAPP",
          externalMessageId: input.externalMessageId,
          campaignId: input.campaignId,
        },
      },
    });
  }

  const token = signOnboardingToken({
    prospectId: prospect.id,
    organizationId: input.organizationId,
  });

  return {
    prospect,
    conversation,
    registrationUrl: buildRegistrationUrl(token),
    token,
  };
}

function splitWhatsAppName(name?: string): { firstName?: string; lastName?: string } {
  if (!name?.trim()) return {};
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
