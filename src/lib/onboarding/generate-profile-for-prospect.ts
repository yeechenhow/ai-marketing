import { db } from "@/lib/db";
import type { DealReadiness } from "@/generated/prisma/client";
import { generateProspectProfileWithAi } from "@/lib/ai/generate-prospect-profile";

/** Generate AI + lead score for a prospect (used after onboarding and manual trigger). */
export async function generateProfileForProspectId(
  prospectId: string,
  organizationId: string,
  options?: { userId?: string },
) {
  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, organizationId },
    include: {
      socialProfiles: true,
      enrichmentRecords: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!prospect) return;

  const recentNote = await db.activity.findFirst({
    where: { prospectId, type: "NOTE" },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });

  const socialContext = prospect.socialProfiles
    .map((s) => {
      const signals = s.signals as Record<string, unknown> | null;
      return `${s.platform}: ${signals?.name ?? s.handle ?? ""}${signals?.email ? ` (${signals.email})` : ""}`;
    })
    .join("; ");

  const notes = [
    recentNote?.body,
    prospect.sourceDetail,
    socialContext ? `Social: ${socialContext}` : undefined,
    prospect.whatsappName ? `WhatsApp name: ${prospect.whatsappName}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const { profile, usedAi } = await generateProspectProfileWithAi(organizationId, {
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    email: prospect.email,
    phone: prospect.phone ?? prospect.whatsappPhone,
    source: prospect.source,
    lifecycleStage: prospect.lifecycleStage,
    occupation: prospect.occupation,
    tags: prospect.tags,
    recentNotes: notes || undefined,
  });

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
      rawAnalysis: { usedAi, source: "onboarding" } as import("@/generated/prisma/client").Prisma.InputJsonValue,
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
      rawAnalysis: { usedAi, source: "onboarding" } as import("@/generated/prisma/client").Prisma.InputJsonValue,
    },
  });

  await db.leadScore.upsert({
    where: { prospectId },
    create: {
      prospectId,
      profileFitScore: profile.confidenceScore,
      intentScore: profile.urgencyScore,
      engagementScore: prospect.registrationCompletedAt ? 0.7 : 0.5,
      urgencyScore: profile.urgencyScore,
      conversionProb: profile.conversionProb,
      churnRiskScore: 1 - profile.trustScore,
    },
    update: {
      profileFitScore: profile.confidenceScore,
      intentScore: profile.urgencyScore,
      engagementScore: prospect.registrationCompletedAt ? 0.7 : 0.5,
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
      reason:
        profile.summary ??
        (usedAi
          ? "Auto-generated after social registration"
          : "Rule-based profile after social registration"),
      priority: 1,
    },
  });

  await db.activity.create({
    data: {
      prospectId,
      userId: options?.userId,
      type: "AI_INSIGHT",
      title: usedAi ? "Customer 360 AI profile generated" : "Customer 360 profile generated",
      body: profile.summary ?? `Classified as ${profile.personaType}`,
    },
  });
}
