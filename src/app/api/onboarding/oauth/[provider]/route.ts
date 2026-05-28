import { NextRequest, NextResponse } from "next/server";
import {
  buildOAuthAuthorizationUrl,
  encodeOAuthState,
  registrationErrorUrl,
  type OAuthProvider,
} from "@/lib/onboarding/oauth";
import {
  resolveFacebookOAuth,
  resolveGoogleOAuth,
} from "@/lib/onboarding/org-settings";
import { verifyOnboardingToken } from "@/lib/onboarding/token";

export const runtime = "nodejs";

const PROVIDERS: OAuthProvider[] = ["google", "facebook"];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = rawProvider.toLowerCase() as OAuthProvider;

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 400 });
  }

  const token = request.nextUrl.searchParams.get("t");
  const consented = request.nextUrl.searchParams.get("consent") === "1";

  if (!token) {
    return NextResponse.json({ error: "Missing registration token" }, { status: 400 });
  }

  if (!consented) {
    return NextResponse.json(
      { error: "Social profile analysis consent is required" },
      { status: 400 },
    );
  }

  try {
    const payload = verifyOnboardingToken(token);
    const oauthConfig =
      provider === "google"
        ? await resolveGoogleOAuth(payload.organizationId)
        : await resolveFacebookOAuth(payload.organizationId);

    if (!oauthConfig) {
      return NextResponse.redirect(
        registrationErrorUrl(
          `${provider === "google" ? "Google" : "Facebook"} OAuth is not configured for this organization. Ask your org admin to add credentials under Org Admin → Onboarding Settings.`,
        ),
      );
    }

    const state = encodeOAuthState({ onboardingToken: token, consented: true });
    const url = buildOAuthAuthorizationUrl(provider, state, oauthConfig);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid registration token";
    return NextResponse.redirect(registrationErrorUrl(message));
  }
}
