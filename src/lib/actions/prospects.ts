"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DealReadiness, LeadSource, LifecycleStage } from "@/generated/prisma/client";
import { generateProspectProfileWithAi } from "@/lib/ai/generate-prospect-profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const prospectSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().email().optional()),
  phone: z.string().optional(),
  source: z.string(),
  lifecycleStage: z.string(),
  occupation: z.string().optional(),
  tags: z.string().optional(),
});

async function requireOrgUser() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  return session;
}

export async function createProspect(formData: FormData) {
  const session = await requireOrgUser();
  const parsed = prospectSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    source: formData.get("source"),
    lifecycleStage: formData.get("lifecycleStage"),
    occupation: formData.get("occupation") || undefined,
    tags: formData.get("tags") || undefined,
  });

  const tags = parsed.tags
    ? parsed.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const prospect = await db.prospect.create({
    data: {
      organizationId: session.user.organizationId!,
      assignedToId: session.user.id,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email || null,
      phone: parsed.phone || null,
      source: parsed.source as LeadSource,
      lifecycleStage: parsed.lifecycleStage as LifecycleStage,
      occupation: parsed.occupation,
      tags,
    },
  });

  await db.activity.create({
    data: {
      prospectId: prospect.id,
      userId: session.user.id,
      type: "NOTE",
      title: "Prospect created",
      body: `Added manually by ${session.user.name ?? session.user.email}`,
    },
  });

  revalidatePath("/dashboard/prospects");
  revalidatePath("/dashboard");
  redirect(`/dashboard/prospects/${prospect.id}`);
}

export async function updateProspect(prospectId: string, formData: FormData) {
  const session = await requireOrgUser();
  const parsed = prospectSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    source: formData.get("source"),
    lifecycleStage: formData.get("lifecycleStage"),
    occupation: formData.get("occupation") || undefined,
    tags: formData.get("tags") || undefined,
  });

  const existing = await db.prospect.findFirst({
    where: { id: prospectId, organizationId: session.user.organizationId! },
  });
  if (!existing) throw new Error("Prospect not found");

  const tags = parsed.tags
    ? parsed.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  await db.prospect.update({
    where: { id: prospectId },
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email || null,
      phone: parsed.phone || null,
      source: parsed.source as LeadSource,
      lifecycleStage: parsed.lifecycleStage as LifecycleStage,
      occupation: parsed.occupation,
      tags,
    },
  });

  if (existing.lifecycleStage !== parsed.lifecycleStage) {
    await db.activity.create({
      data: {
        prospectId,
        userId: session.user.id,
        type: "STAGE_CHANGE",
        title: `Stage changed to ${parsed.lifecycleStage}`,
      },
    });
  }

  revalidatePath(`/dashboard/prospects/${prospectId}`);
  revalidatePath("/dashboard/prospects");
  redirect(`/dashboard/prospects/${prospectId}`);
}

export async function generateProspectProfile(prospectId: string) {
  const session = await requireOrgUser();

  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, organizationId: session.user.organizationId! },
  });
  if (!prospect) throw new Error("Prospect not found");

  const recentNote = await db.activity.findFirst({
    where: { prospectId, type: "NOTE" },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });

  const { profile, usedAi } = await generateProspectProfileWithAi(
    session.user.organizationId!,
    {
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      phone: prospect.phone,
      source: prospect.source,
      lifecycleStage: prospect.lifecycleStage,
      occupation: prospect.occupation,
      tags: prospect.tags,
      recentNotes: recentNote?.body ?? undefined,
    },
  );

  await db.personalityProfile.upsert({
    where: { prospectId },
    create: {
      prospectId,
      personaType: profile.personaType,
      decisionStyle: profile.decisionStyle,
      urgencyScore: profile.urgencyScore,
      trustScore: profile.trustScore,
      budgetSensitivity: profile.budgetSensitivity,
      communicationPref: profile.communicationPref,
      dealReadiness: profile.dealReadiness as DealReadiness,
      confidenceScore: profile.confidenceScore,
    },
    update: {
      personaType: profile.personaType,
      decisionStyle: profile.decisionStyle,
      urgencyScore: profile.urgencyScore,
      trustScore: profile.trustScore,
      budgetSensitivity: profile.budgetSensitivity,
      communicationPref: profile.communicationPref,
      dealReadiness: profile.dealReadiness as DealReadiness,
      confidenceScore: profile.confidenceScore,
    },
  });

  await db.leadScore.upsert({
    where: { prospectId },
    create: {
      prospectId,
      profileFitScore: profile.confidenceScore,
      intentScore: profile.urgencyScore,
      engagementScore: 0.5,
      urgencyScore: profile.urgencyScore,
      conversionProb: profile.conversionProb,
      churnRiskScore: 1 - profile.trustScore,
    },
    update: {
      profileFitScore: profile.confidenceScore,
      intentScore: profile.urgencyScore,
      urgencyScore: profile.urgencyScore,
      conversionProb: profile.conversionProb,
      churnRiskScore: 1 - profile.trustScore,
    },
  });

  await db.recommendation.deleteMany({
    where: { prospectId, isApplied: false },
  });

  await db.recommendation.create({
    data: {
      prospectId,
      action: profile.nextAction,
      reason: profile.summary ?? (usedAi
        ? "Generated by AI from prospect signals and conversation context"
        : "Generated from prospect source, stage, and tag signals (AI fallback)"),
      priority: 1,
    },
  });

  await db.activity.create({
    data: {
      prospectId,
      userId: session.user.id,
      type: "AI_INSIGHT",
      title: usedAi ? "AI personality profile generated (LLM)" : "AI personality profile generated",
      body: profile.summary ?? `Classified as ${profile.personaType} · ${profile.decisionStyle}`,
    },
  });

  revalidatePath(`/dashboard/prospects/${prospectId}`);
  revalidatePath("/dashboard/ai");
  revalidatePath("/dashboard/prospects");
}

export async function applyRecommendation(recommendationId: string) {
  const session = await requireOrgUser();

  const rec = await db.recommendation.findFirst({
    where: { id: recommendationId },
    include: { prospect: true },
  });

  if (!rec || rec.prospect.organizationId !== session.user.organizationId!) {
    throw new Error("Not found");
  }

  await db.recommendation.update({
    where: { id: recommendationId },
    data: { isApplied: true },
  });

  await db.task.create({
    data: {
      prospectId: rec.prospectId,
      assigneeId: session.user.id,
      creatorId: session.user.id,
      title: rec.action,
      description: rec.reason ?? undefined,
      priority: "MEDIUM",
      dueAt: new Date(Date.now() + 86400000),
    },
  });

  revalidatePath(`/dashboard/prospects/${rec.prospectId}`);
  revalidatePath("/dashboard/tasks");
}
