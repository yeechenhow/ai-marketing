import { NextRequest, NextResponse } from "next/server";
import { linkSocialIdentityToProspect } from "@/lib/onboarding/link-social";
import type { OAuthProfile, OAuthProvider } from "@/lib/onboarding/oauth";
import { registrationCompleteUrl } from "@/lib/onboarding/oauth";
import { verifyOnboardingToken } from "@/lib/onboarding/token";

export const runtime = "nodejs";

const PROVIDERS: OAuthProvider[] = ["google", "facebook"];

/**
 * Local dev only — completes registration without real Google/Facebook apps.
 * GET /api/dev/simulate-oauth/google?t=TOKEN&consent=1
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_OAUTH_DEV_MOCK !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { provider: rawProvider } = await context.params;
  const provider = rawProvider.toLowerCase() as OAuthProvider;

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const token = request.nextUrl.searchParams.get("t");
  const consented = request.nextUrl.searchParams.get("consent") === "1";

  if (!token) {
    return NextResponse.json({ error: "Missing registration token" }, { status: 400 });
  }

  if (!consented) {
    return NextResponse.json({ error: "Consent is required" }, { status: 400 });
  }

  try {
    verifyOnboardingToken(token);

    const mockProfile: OAuthProfile = {
      platform: provider === "google" ? "GOOGLE" : "FACEBOOK",
      platformUid: `dev-${provider}-${Date.now()}`,
      email: `dev.${provider}@example.com`,
      name: "Dev Test User",
      firstName: "Dev",
      lastName: "User",
      picture: "https://www.gravatar.com/avatar/?d=mp",
      rawPayload: {
        dev: true,
        provider,
        note: "Simulated OAuth profile for local testing",
      },
      accessToken: "dev-mock-access-token",
    };

    await linkSocialIdentityToProspect(token, mockProfile, true);
    return NextResponse.redirect(registrationCompleteUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dev OAuth simulation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
