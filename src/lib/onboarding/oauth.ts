import { getAppBaseUrl, oauthCallbackUrl } from "@/lib/onboarding/config";
import type {
  ResolvedFacebookOAuth,
  ResolvedGoogleOAuth,
} from "@/lib/onboarding/org-settings";
import type { SocialPlatform } from "@/generated/prisma/client";

export type OAuthProvider = "google" | "facebook";

export type OAuthProfile = {
  platform: SocialPlatform;
  platformUid: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  rawPayload: Record<string, unknown>;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
};

const GOOGLE_SCOPES = ["openid", "email", "profile"].join(" ");
const FACEBOOK_SCOPES = ["email", "public_profile"].join(",");

export function buildOAuthAuthorizationUrl(
  provider: OAuthProvider,
  state: string,
  config: ResolvedGoogleOAuth | ResolvedFacebookOAuth,
): string {
  const redirectUri = oauthCallbackUrl(provider);

  if (provider === "google") {
    const google = config as ResolvedGoogleOAuth;
    const params = new URLSearchParams({
      client_id: google.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const facebook = config as ResolvedFacebookOAuth;
  const params = new URLSearchParams({
    client_id: facebook.appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: FACEBOOK_SCOPES,
    state,
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  config: ResolvedGoogleOAuth | ResolvedFacebookOAuth,
): Promise<OAuthProfile> {
  if (provider === "google") return exchangeGoogleCode(code, config as ResolvedGoogleOAuth);
  return exchangeFacebookCode(code, config as ResolvedFacebookOAuth);
}

async function exchangeGoogleCode(
  code: string,
  config: ResolvedGoogleOAuth,
): Promise<OAuthProfile> {
  const redirectUri = oauthCallbackUrl("google");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Google token exchange failed: ${body.slice(0, 300)}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileResponse.ok) {
    const body = await profileResponse.text();
    throw new Error(`Google profile fetch failed: ${body.slice(0, 300)}`);
  }

  const profile = (await profileResponse.json()) as {
    sub: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  return {
    platform: "GOOGLE",
    platformUid: profile.sub,
    email: profile.email,
    name: profile.name,
    firstName: profile.given_name,
    lastName: profile.family_name,
    picture: profile.picture,
    rawPayload: profile as Record<string, unknown>,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined,
  };
}

async function exchangeFacebookCode(
  code: string,
  config: ResolvedFacebookOAuth,
): Promise<OAuthProfile> {
  const redirectUri = oauthCallbackUrl("facebook");
  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", config.appId);
  tokenUrl.searchParams.set("client_secret", config.appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenResponse = await fetch(tokenUrl);
  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Facebook token exchange failed: ${body.slice(0, 300)}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const profileUrl = new URL("https://graph.facebook.com/v21.0/me");
  profileUrl.searchParams.set(
    "fields",
    "id,name,email,picture.type(large),location,about",
  );
  profileUrl.searchParams.set("access_token", tokenData.access_token);

  const profileResponse = await fetch(profileUrl);
  if (!profileResponse.ok) {
    const body = await profileResponse.text();
    throw new Error(`Facebook profile fetch failed: ${body.slice(0, 300)}`);
  }

  const profile = (await profileResponse.json()) as {
    id: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
    location?: { name?: string };
    about?: string;
  };

  const nameParts = splitName(profile.name);

  return {
    platform: "FACEBOOK",
    platformUid: profile.id,
    email: profile.email,
    name: profile.name,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    picture: profile.picture?.data?.url,
    rawPayload: profile as Record<string, unknown>,
    accessToken: tokenData.access_token,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined,
  };
}

function splitName(name?: string): { firstName?: string; lastName?: string } {
  if (!name?.trim()) return {};
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function encodeOAuthState(input: {
  onboardingToken: string;
  consented: boolean;
}): string {
  return Buffer.from(
    JSON.stringify({
      t: input.onboardingToken,
      c: input.consented ? 1 : 0,
      n: crypto.randomUUID(),
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeOAuthState(state: string): {
  onboardingToken: string;
  consented: boolean;
} {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      t?: string;
      c?: number;
    };
    if (!parsed.t) throw new Error("Missing onboarding token in OAuth state");
    return { onboardingToken: parsed.t, consented: parsed.c === 1 };
  } catch {
    throw new Error("Invalid OAuth state parameter");
  }
}

export function registrationCompleteUrl(): string {
  return `${getAppBaseUrl()}/register/complete`;
}

export function registrationErrorUrl(message: string): string {
  return `${getAppBaseUrl()}/register?error=${encodeURIComponent(message)}`;
}
