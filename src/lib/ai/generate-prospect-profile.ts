import { z } from "zod";
import { completeChat } from "@/lib/ai/client";
import { PROFILE_SYSTEM_PROMPT, buildProspectProfilePrompt, DEAL_READINESS_VALUES } from "@/lib/ai/prompts";
import { resolveAiConfig } from "@/lib/ai/settings";
import type { GeneratedProspectProfile } from "@/lib/ai/types";
import type { DealReadiness, LeadSource, LifecycleStage } from "@/generated/prisma/client";

const profileSchema = z.object({
  personaType: z.string().min(1),
  decisionStyle: z.string().min(1),
  urgencyScore: z.number().min(0).max(1),
  trustScore: z.number().min(0).max(1),
  budgetSensitivity: z.number().min(0).max(1),
  communicationPref: z.string().min(1),
  dealReadiness: z.enum(DEAL_READINESS_VALUES),
  confidenceScore: z.number().min(0).max(1),
  conversionProb: z.number().min(0).max(1),
  nextAction: z.string().min(1),
  summary: z.string().optional(),
});

export function inferProfileFallback(prospect: {
  source: LeadSource;
  occupation: string | null;
  tags: string[];
  lifecycleStage: LifecycleStage;
}): GeneratedProspectProfile {
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
    summary: "Rule-based profile (AI not configured or unavailable).",
  };
}

export async function generateProspectProfileWithAi(
  organizationId: string,
  prospect: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    source: LeadSource;
    lifecycleStage: LifecycleStage;
    occupation: string | null;
    tags: string[];
    recentNotes?: string;
  },
): Promise<{ profile: GeneratedProspectProfile; usedAi: boolean }> {
  const config = await resolveAiConfig(organizationId);
  if (!config) {
    return { profile: inferProfileFallback(prospect), usedAi: false };
  }

  try {
    const raw = await completeChat(
      config,
      PROFILE_SYSTEM_PROMPT,
      buildProspectProfilePrompt({
        ...prospect,
        notes: prospect.recentNotes,
      }),
    );

    const parsed = profileSchema.parse(JSON.parse(raw));
    return { profile: parsed, usedAi: true };
  } catch {
    return { profile: inferProfileFallback(prospect), usedAi: false };
  }
}
