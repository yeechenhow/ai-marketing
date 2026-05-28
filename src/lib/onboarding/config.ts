export function getAppBaseUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getOnboardingSecret(): string {
  const secret = process.env.ONBOARDING_TOKEN_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("ONBOARDING_TOKEN_SECRET or AUTH_SECRET must be set");
  }
  return secret;
}

export function getWhatsAppVerifyToken(): string | undefined {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || undefined;
}

export function getWhatsAppAppSecret(): string | undefined {
  return process.env.WHATSAPP_APP_SECRET?.trim() || undefined;
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getFacebookOAuthConfig() {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

export function oauthCallbackUrl(provider: "google" | "facebook"): string {
  return `${getAppBaseUrl()}/api/onboarding/callback/${provider}`;
}
