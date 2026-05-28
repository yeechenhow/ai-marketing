import { NextRequest, NextResponse } from "next/server";
import { verifyOnboardingToken, OnboardingTokenError } from "@/lib/onboarding/token";
import { getOAuthProviderStatusForOrg } from "@/lib/onboarding/org-settings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Missing registration token" }, { status: 400 });
  }

  try {
    const payload = verifyOnboardingToken(token);

    const { db } = await import("@/lib/db");
    const prospect = await db.prospect.findFirst({
      where: {
        id: payload.prospectId,
        organizationId: payload.organizationId,
      },
      select: {
        id: true,
        whatsappName: true,
        whatsappPhone: true,
        registrationCompletedAt: true,
        organization: { select: { name: true } },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const providers = await getOAuthProviderStatusForOrg(payload.organizationId);

    return NextResponse.json({
      ok: true,
      prospectId: prospect.id,
      organizationName: prospect.organization.name,
      whatsappName: prospect.whatsappName,
      maskedPhone: maskPhone(prospect.whatsappPhone),
      alreadyRegistered: Boolean(prospect.registrationCompletedAt),
      providers,
    });
  } catch (error) {
    if (error instanceof OnboardingTokenError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("[onboarding verify]", error);
    return NextResponse.json({ error: "Unable to verify registration link" }, { status: 500 });
  }
}

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  if (phone.length <= 4) return "••••";
  return `••••${phone.slice(-4)}`;
}
