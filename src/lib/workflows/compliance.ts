import { db } from "@/lib/db";
import { parseOrganizationSettings } from "@/lib/onboarding/org-settings";

export type ComplianceDecision =
  | { action: "allow" }
  | { action: "skip"; reason: string }
  | { action: "delay"; until: Date; reason: string };

type QuietHours = {
  enabled?: boolean;
  start?: number; // hour 0-23 (org local, UTC offset below)
  end?: number; // hour 0-23
  utcOffsetMinutes?: number; // e.g. +480 for Singapore
};

type MessagingSettings = {
  quietHours?: QuietHours;
};

/**
 * Decides whether a marketing send may proceed for a prospect right now.
 * - Skips if the prospect has explicitly opted out of MARKETING consent.
 * - Delays until the end of quiet hours if configured and currently active.
 */
export async function evaluateSendCompliance(
  organizationId: string,
  prospectId: string,
  now: Date = new Date(),
): Promise<ComplianceDecision> {
  // 1. Opt-out check — latest MARKETING consent record wins.
  const latestConsent = await db.consentRecord.findFirst({
    where: { prospectId, type: "MARKETING" },
    orderBy: { recordedAt: "desc" },
  });
  if (latestConsent && latestConsent.granted === false) {
    return { action: "skip", reason: "Prospect opted out of marketing messages" };
  }

  // 2. Quiet hours — read from org settings.messaging.quietHours.
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  const settings = parseOrganizationSettings(org?.settings) as {
    messaging?: MessagingSettings;
  };
  const quiet = settings.messaging?.quietHours;

  if (quiet?.enabled && typeof quiet.start === "number" && typeof quiet.end === "number") {
    const offset = quiet.utcOffsetMinutes ?? 0;
    const local = new Date(now.getTime() + offset * 60_000);
    const hour = local.getUTCHours();

    const inQuiet = isWithinHourWindow(hour, quiet.start, quiet.end);
    if (inQuiet) {
      const until = nextWindowEnd(local, quiet.end, offset);
      return {
        action: "delay",
        until,
        reason: `Quiet hours active — delayed until ${until.toISOString()}`,
      };
    }
  }

  return { action: "allow" };
}

function isWithinHourWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // Overnight window, e.g. 22 → 7
  return hour >= start || hour < end;
}

function nextWindowEnd(local: Date, endHour: number, offsetMinutes: number): Date {
  const localEnd = new Date(local);
  localEnd.setUTCMinutes(0, 0, 0);
  if (local.getUTCHours() >= endHour) {
    // window ends tomorrow
    localEnd.setUTCDate(localEnd.getUTCDate() + 1);
  }
  localEnd.setUTCHours(endHour);
  // convert local back to real UTC
  return new Date(localEnd.getTime() - offsetMinutes * 60_000);
}
