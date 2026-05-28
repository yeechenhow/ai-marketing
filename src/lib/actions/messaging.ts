"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Channel } from "@/generated/prisma/client";
import { suggestReplyWithAi } from "@/lib/ai/suggest-reply";
import { prospectDisplayName } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireOrgUser() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  return session;
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const session = await requireOrgUser();
  const content = (formData.get("content") as string)?.trim();
  if (!content) throw new Error("Message cannot be empty");

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, organizationId: session.user.organizationId! },
    include: { prospect: true },
  });
  if (!conversation) throw new Error("Conversation not found");

  await db.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      content,
      status: "SENT",
      sentAt: new Date(),
    },
  });

  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), status: "OPEN" },
  });

  await db.prospect.update({
    where: { id: conversation.prospectId },
    data: { lastTouchAt: new Date() },
  });

  await db.activity.create({
    data: {
      prospectId: conversation.prospectId,
      userId: session.user.id,
      type: "MESSAGE",
      title: "Outbound message sent",
      body: content.slice(0, 200),
    },
  });

  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath(`/dashboard/prospects/${conversation.prospectId}`);
}

export async function resolveConversation(conversationId: string) {
  const session = await requireOrgUser();

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, organizationId: session.user.organizationId! },
  });
  if (!conversation) throw new Error("Conversation not found");

  await db.conversation.update({
    where: { id: conversationId },
    data: { status: "RESOLVED" },
  });

  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function escalateConversation(conversationId: string) {
  const session = await requireOrgUser();

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, organizationId: session.user.organizationId! },
  });
  if (!conversation) throw new Error("Conversation not found");

  await db.conversation.update({
    where: { id: conversationId },
    data: { status: "ESCALATED", escalatedAt: new Date(), aiHandled: false },
  });

  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function startConversation(prospectId: string, formData: FormData) {
  const session = await requireOrgUser();
  const channel = (formData.get("channel") as Channel) || "WHATSAPP";
  const content = (formData.get("content") as string)?.trim();
  if (!content) throw new Error("Message is required");

  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, organizationId: session.user.organizationId! },
  });
  if (!prospect) throw new Error("Prospect not found");

  const channelConnection = await db.channelConnection.findFirst({
    where: { organizationId: session.user.organizationId!, channel, isActive: true },
  });

  const conversation = await db.conversation.create({
    data: {
      organizationId: session.user.organizationId!,
      prospectId,
      channel,
      channelConnectionId: channelConnection?.id,
      status: "OPEN",
      lastMessageAt: new Date(),
      messages: {
        create: {
          direction: "OUTBOUND",
          content,
          status: "SENT",
          sentAt: new Date(),
        },
      },
    },
  });

  revalidatePath("/dashboard/inbox");
  redirect(`/dashboard/inbox/${conversation.id}`);
}

export async function suggestReply(conversationId: string): Promise<{ suggestion: string }> {
  const session = await requireOrgUser();

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, organizationId: session.user.organizationId! },
    include: {
      prospect: {
        include: {
          personalityProfile: true,
          recommendations: { where: { isApplied: false }, orderBy: { priority: "asc" }, take: 1 },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) throw new Error("Conversation not found");

  const p = conversation.prospect;
  const name = prospectDisplayName(p.firstName, p.lastName, p.email, p.phone);

  const suggestion = await suggestReplyWithAi(session.user.organizationId!, {
    prospectName: name,
    channel: conversation.channel,
    occupation: p.occupation,
    lifecycleStage: p.lifecycleStage,
    personaType: p.personalityProfile?.personaType,
    decisionStyle: p.personalityProfile?.decisionStyle,
    dealReadiness: p.personalityProfile?.dealReadiness,
    nextAction: p.recommendations[0]?.action,
    messages: conversation.messages.map((m) => ({
      direction: m.direction,
      content: m.content,
    })),
  });

  return { suggestion };
}
