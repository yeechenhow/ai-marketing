"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessOrgPortal } from "@/lib/roles";
import type { Channel, PlatformRole, Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWhatsAppOnboardingConfig } from "@/lib/onboarding/campaign-config";
import { z } from "zod";

async function requireOrgAdmin() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  if (!canAccessOrgPortal(session.user)) throw new Error("Forbidden");
  return session;
}

const channelSchema = z.object({
  channel: z.string(),
  name: z.string().min(1, "Display name is required"),
  externalId: z.string().optional(),
});

const memberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export async function connectChannel(formData: FormData) {
  const session = await requireOrgAdmin();
  const parsed = channelSchema.parse({
    channel: formData.get("channel"),
    name: formData.get("name"),
    externalId: formData.get("externalId") || undefined,
  });

  await db.channelConnection.create({
    data: {
      organizationId: session.user.organizationId!,
      channel: parsed.channel as Channel,
      name: parsed.name,
      externalId: parsed.externalId || null,
      isActive: true,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "channel.connected",
      entityType: "ChannelConnection",
      details: { channel: parsed.channel, name: parsed.name },
    },
  });

  revalidatePath("/org/channels");
  redirect("/org/channels");
}

export async function addTeamMember(formData: FormData) {
  const session = await requireOrgAdmin();
  const parsed = memberSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password") || "demo1234",
  });

  const passwordHash = await bcrypt.hash(parsed.password!, 10);

  const user = await db.user.upsert({
    where: { email: parsed.email },
    update: { name: parsed.name },
    create: {
      email: parsed.email,
      name: parsed.name,
      passwordHash,
      platformRole: parsed.role === "ORG_ADMIN" ? "ORG_ADMIN" : "AGENT",
    },
  });

  await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: session.user.organizationId!,
        userId: user.id,
      },
    },
    update: {
      role: parsed.role as PlatformRole,
      isActive: true,
    },
    create: {
      organizationId: session.user.organizationId!,
      userId: user.id,
      role: parsed.role as PlatformRole,
    },
  });

  if (parsed.role === "AGENT") {
    await db.agentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, languages: ["en"] },
    });
  }

  await db.auditLog.create({
    data: {
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "member.added",
      entityType: "User",
      entityId: user.id,
      details: { email: parsed.email, role: parsed.role },
    },
  });

  revalidatePath("/org/team");
  redirect("/org/team");
}

export async function toggleChannelStatus(channelId: string) {
  const session = await requireOrgAdmin();

  const channel = await db.channelConnection.findFirst({
    where: { id: channelId, organizationId: session.user.organizationId! },
  });
  if (!channel) throw new Error("Channel not found");

  await db.channelConnection.update({
    where: { id: channelId },
    data: { isActive: !channel.isActive },
  });

  revalidatePath("/org/channels");
}

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  campaignType: z.enum(["standard", "whatsapp_onboarding"]).default("standard"),
  prefilledMessage: z.string().optional(),
  businessPhone: z.string().optional(),
  channelConnectionId: z.string().optional(),
  welcomeMessage: z.string().optional(),
});

const aiAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  persona: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  channel: z.string(),
  category: z.string().optional(),
  language: z.string().optional(),
  content: z.string().min(1, "Template content is required"),
});

const funnelSchema = z.object({
  name: z.string().min(1, "Funnel name is required"),
  description: z.string().optional(),
});

export async function createCampaign(formData: FormData) {
  const session = await requireOrgAdmin();
  const parsed = campaignSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    campaignType: formData.get("campaignType") || "standard",
    prefilledMessage: (formData.get("prefilledMessage") as string)?.trim() || undefined,
    businessPhone: (formData.get("businessPhone") as string)?.trim() || undefined,
    channelConnectionId: (formData.get("channelConnectionId") as string)?.trim() || undefined,
    welcomeMessage: (formData.get("welcomeMessage") as string)?.trim() || undefined,
  });

  if (parsed.campaignType === "whatsapp_onboarding" && !parsed.prefilledMessage) {
    throw new Error("Prefilled WhatsApp message is required for onboarding campaigns");
  }

  const config =
    parsed.campaignType === "whatsapp_onboarding"
      ? createWhatsAppOnboardingConfig({
          prefilledMessage: parsed.prefilledMessage!,
          businessPhone: parsed.businessPhone,
          channelConnectionId: parsed.channelConnectionId,
          welcomeMessage: parsed.welcomeMessage,
        })
      : undefined;

  const campaign = await db.campaign.create({
    data: {
      organizationId: session.user.organizationId!,
      name: parsed.name,
      description: parsed.description,
      status: parsed.campaignType === "whatsapp_onboarding" ? "active" : "draft",
      startedAt: parsed.campaignType === "whatsapp_onboarding" ? new Date() : undefined,
      config: config as Prisma.InputJsonValue | undefined,
    },
  });

  revalidatePath("/org/campaigns");
  redirect(
    parsed.campaignType === "whatsapp_onboarding"
      ? `/org/campaigns/${campaign.id}`
      : "/org/campaigns",
  );
}

export async function launchCampaign(campaignId: string) {
  const session = await requireOrgAdmin();

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: session.user.organizationId! },
  });
  if (!campaign) throw new Error("Campaign not found");

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "active", startedAt: new Date() },
  });

  revalidatePath("/org/campaigns");
}

export async function createAIAgent(formData: FormData) {
  const session = await requireOrgAdmin();
  const parsed = aiAgentSchema.parse({
    name: formData.get("name"),
    persona: formData.get("persona") || undefined,
    tone: formData.get("tone") || undefined,
    language: formData.get("language") || "en",
  });

  await db.aIAgent.create({
    data: {
      organizationId: session.user.organizationId!,
      name: parsed.name,
      persona: parsed.persona,
      tone: parsed.tone,
      language: parsed.language ?? "en",
      isActive: true,
    },
  });

  revalidatePath("/org/ai-agents");
  redirect("/org/ai-agents");
}

export async function toggleAIAgent(agentId: string) {
  const session = await requireOrgAdmin();

  const agent = await db.aIAgent.findFirst({
    where: { id: agentId, organizationId: session.user.organizationId! },
  });
  if (!agent) throw new Error("Agent not found");

  await db.aIAgent.update({
    where: { id: agentId },
    data: { isActive: !agent.isActive },
  });

  revalidatePath("/org/ai-agents");
}

export async function createTemplate(formData: FormData) {
  const session = await requireOrgAdmin();
  const parsed = templateSchema.parse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    category: formData.get("category") || undefined,
    language: formData.get("language") || "en",
    content: formData.get("content"),
  });

  await db.messageTemplate.create({
    data: {
      organizationId: session.user.organizationId!,
      name: parsed.name,
      channel: parsed.channel as Channel,
      category: parsed.category,
      language: parsed.language ?? "en",
      content: parsed.content,
      isApproved: parsed.channel !== "WHATSAPP",
    },
  });

  revalidatePath("/org/templates");
  redirect("/org/templates");
}

export async function approveTemplate(templateId: string) {
  const session = await requireOrgAdmin();

  const template = await db.messageTemplate.findFirst({
    where: { id: templateId, organizationId: session.user.organizationId! },
  });
  if (!template) throw new Error("Template not found");

  await db.messageTemplate.update({
    where: { id: templateId },
    data: { isApproved: true },
  });

  revalidatePath("/org/templates");
}

export async function createFunnel(formData: FormData) {
  const session = await requireOrgAdmin();
  const parsed = funnelSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  const { DEFAULT_FUNNEL_STAGES } = await import("@/lib/constants");

  await db.funnel.create({
    data: {
      organizationId: session.user.organizationId!,
      name: parsed.name,
      description: parsed.description,
      stages: {
        create: DEFAULT_FUNNEL_STAGES.map((s) => ({
          name: s.name,
          order: s.order,
          probability: s.probability,
        })),
      },
    },
  });

  revalidatePath("/org/pipelines");
  redirect("/org/pipelines");
}
