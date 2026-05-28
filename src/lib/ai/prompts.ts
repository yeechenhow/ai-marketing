import type { DealReadiness, LeadSource, LifecycleStage } from "@/generated/prisma/client";

export function buildProspectProfilePrompt(prospect: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  lifecycleStage: LifecycleStage;
  occupation: string | null;
  tags: string[];
  notes?: string;
}) {
  const name = [prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || "Unknown";

  return `Analyze this sales prospect and return a JSON object for a B2B/B2C hybrid CRM.

Prospect:
- Name: ${name}
- Email: ${prospect.email ?? "n/a"}
- Phone: ${prospect.phone ?? "n/a"}
- Source: ${prospect.source}
- Lifecycle stage: ${prospect.lifecycleStage}
- Occupation: ${prospect.occupation ?? "unknown"}
- Tags: ${prospect.tags.join(", ") || "none"}
${prospect.notes ? `- Recent notes: ${prospect.notes}` : ""}

Return JSON with these exact keys:
{
  "personaType": "short snake-case label e.g. fast-decider, cautious-buyer",
  "decisionStyle": "e.g. logic-driven, emotion-driven, needs-guidance, value-focused",
  "urgencyScore": 0.0 to 1.0,
  "trustScore": 0.0 to 1.0,
  "budgetSensitivity": 0.0 to 1.0,
  "communicationPref": "concise or detailed",
  "dealReadiness": one of NOT_READY, NURTURE, WARM, SALES_READY, CLOSE_NOW,
  "confidenceScore": 0.0 to 1.0,
  "conversionProb": 0.0 to 1.0,
  "nextAction": "one specific next-best-action for a sales agent",
  "summary": "2 sentence buyer psychology summary"
}`;
}

export const PROFILE_SYSTEM_PROMPT = `You are an expert sales psychologist and CRM analyst.
Be practical and specific. Output valid JSON only. Scores must be numbers between 0 and 1.`;

export function buildSuggestReplyPrompt(input: {
  prospectName: string;
  channel: string;
  occupation?: string | null;
  lifecycleStage: string;
  personaType?: string | null;
  decisionStyle?: string | null;
  dealReadiness?: string | null;
  nextAction?: string | null;
  messages: { direction: string; content: string }[];
}) {
  const thread = input.messages
    .slice(-8)
    .map((m) => `${m.direction === "INBOUND" ? "Prospect" : "Agent"}: ${m.content}`)
    .join("\n");

  return `Write the next outbound reply for a human sales agent.

Channel: ${input.channel}
Prospect: ${input.prospectName}
Occupation: ${input.occupation ?? "unknown"}
Lifecycle stage: ${input.lifecycleStage}
Persona: ${input.personaType ?? "unknown"}
Decision style: ${input.decisionStyle ?? "unknown"}
Deal readiness: ${input.dealReadiness ?? "unknown"}
Recommended next action: ${input.nextAction ?? "qualify and advance"}

Conversation:
${thread || "No prior messages."}

Rules:
- Write ONLY the message body text to send (no quotes, labels, or markdown)
- Keep it natural for ${input.channel.replace("_", " ")}
- Max 3 short paragraphs
- Be helpful, professional, and move toward the next action
- Do not invent specific prices, legal claims, or discounts`;
}

export const REPLY_SYSTEM_PROMPT = `You are a skilled sales agent assistant drafting outbound messages.
Match the channel tone. Be concise and human. Return plain text only.`;

export const DEAL_READINESS_VALUES = [
  "NOT_READY",
  "NURTURE",
  "WARM",
  "SALES_READY",
  "CLOSE_NOW",
] as const satisfies readonly DealReadiness[];
