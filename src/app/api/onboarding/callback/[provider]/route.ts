import { NextRequest, NextResponse } from "next/server";
import {
  decodeOAuthState,
  exchangeOAuthCode,
  registrationCompleteUrl,
  registrationErrorUrl,
  type OAuthProvider,
} from "@/lib/onboarding/oauth";
import { linkSocialIdentityToProspect } from "@/lib/onboarding/link-social";
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
    return NextResponse.redirect(registrationErrorUrl("Unsupported OAuth provider"));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      registrationErrorUrl(`OAuth was cancelled or denied (${oauthError})`),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      registrationErrorUrl("Missing OAuth code or state parameter"),
    );
  }

  try {
    const { onboardingToken, consented } = decodeOAuthState(state);
    if (!consented) {
      return NextResponse.redirect(
        registrationErrorUrl("Social profile analysis consent is required"),
      );
    }

    const payload = verifyOnboardingToken(onboardingToken);
    const oauthConfig =
      provider === "google"
        ? await resolveGoogleOAuth(payload.organizationId)
        : await resolveFacebookOAuth(payload.organizationId);

    if (!oauthConfig) {
      return NextResponse.redirect(
        registrationErrorUrl(
          `${provider === "google" ? "Google" : "Facebook"} OAuth is not configured for this organization.`,
        ),
      );
    }

    const profile = await exchangeOAuthCode(provider, code, oauthConfig);
    await linkSocialIdentityToProspect(onboardingToken, profile, consented);

    return NextResponse.redirect(registrationCompleteUrl());
  } catch (error) {
    console.error(`[oauth callback ${provider}]`, error);
    const message =
      error instanceof Error ? error.message : "OAuth registration failed";
    return NextResponse.redirect(registrationErrorUrl(message));
  }
}
