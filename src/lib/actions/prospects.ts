"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DealReadiness, LeadSource, LifecycleStage } from "@/generated/prisma/client";
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

function inferProfile(prospect: {
  source: LeadSource;
  occupation: string | null;
  tags: string[];
  lifecycleStage: LifecycleStage;
}) {
  const priceSensitive = prospect.tags.some((t) =>
    ["price-sensitive", "budget"].includes(t.toLowerCase()),
  );
  const isInbound = ["WHATSAPP_CLICK", "MESSENGER", "LANDING_PAGE", "WEBSITE"].includes(
    prospect.source,
  );

  let personaType = "balanced-buyer";
  let decisionStyle = "logic-driven";
  let dealReadiness: DealReadiness = "NURTURE";
  let conversionProb = 0.35;

  if (prospect.lifecycleStage === "QUALIFIED" || prospect.lifecycleStage === "PROPOSAL") {
    dealReadiness = "SALES_READY";
    conversionProb = 0.65;
    personaType = "fast-decider";
  } else if (prospect.lifecycleStage === "NURTURE") {
    dealReadiness = "NURTURE";
    conversionProb = 0.4;
    personaType = "cautious-buyer";
    decisionStyle = "emotion-driven";
  } else if (isInbound) {
    dealReadiness = "WARM";
    conversionProb = 0.5;
    personaType = "social-proof-buyer";
    decisionStyle = "needs-guidance";
  }

  if (priceSensitive) {
    decisionStyle = "value-focused";
    conversionProb -= 0.1;
  }

  return {
    personaType,
    decisionStyle,
    urgencyScore: isInbound ? 0.65 : 0.4,
    trustScore: isInbound ? 0.55 : 0.35,
    budgetSensitivity: priceSensitive ? 0.8 : 0.35,
    communicationPref: decisionStyle.includes("logic") ? "concise" : "detailed",
    dealReadiness,
    confidenceScore: 0.72,
    conversionProb: Math.max(0.1, Math.min(0.95, conversionProb)),
    nextAction:
      dealReadiness === "SALES_READY"
        ? "Book demo or send proposal"
        : dealReadiness === "WARM"
          ? "Ask qualification question about timeline"
          : "Send nurture content — case study or social proof",
  };
}

export async function generateProspectProfile(prospectId: string) {
  const session = await requireOrgUser();

  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, organizationId: session.user.organizationId! },
  });
  if (!prospect) throw new Error("Prospect not found");

  const profile = inferProfile(prospect);

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
      dealReadiness: profile.dealReadiness,
      confidenceScore: profile.confidenceScore,
    },
    update: {
      personaType: profile.personaType,
      decisionStyle: profile.decisionStyle,
      urgencyScore: profile.urgencyScore,
      trustScore: profile.trustScore,
      budgetSensitivity: profile.budgetSensitivity,
      communicationPref: profile.communicationPref,
      dealReadiness: profile.dealReadiness,
      confidenceScore: profile.confidenceScore,
    },
  });

  await db.leadScore.upsert({
    where: { prospectId },
    create: {
      prospectId,
      profileFitScore: 0.65,
      intentScore: profile.urgencyScore,
      engagementScore: 0.5,
      urgencyScore: profile.urgencyScore,
      conversionProb: profile.conversionProb,
      churnRiskScore: 1 - profile.trustScore,
    },
    update: {
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
      reason: "Generated from prospect source, stage, and tag signals",
      priority: 1,
    },
  });

  await db.activity.create({
    data: {
      prospectId,
      userId: session.user.id,
      type: "AI_INSIGHT",
      title: "AI personality profile generated",
      body: `Classified as ${profile.personaType} · ${profile.decisionStyle}`,
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
