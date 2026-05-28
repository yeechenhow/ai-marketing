import { db } from "@/lib/db";
import {
  getFacebookOAuthConfig as getEnvFacebookOAuth,
  getGoogleOAuthConfig as getEnvGoogleOAuth,
  getWhatsAppAppSecret as getEnvWhatsAppAppSecret,
  getWhatsAppVerifyToken as getEnvWhatsAppVerifyToken,
  oauthCallbackUrl,
} from "@/lib/onboarding/config";

export type OrgOAuthCredentials = {
  googleClientId?: string;
  googleClientSecret?: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
};

export type OrgWhatsAppCredentials = {
  verifyToken?: string;
  appSecret?: string;
  accessToken?: string;
  phoneNumberId?: string;
};

export type OrgOnboardingSettings = {
  oauth?: OrgOAuthCredentials;
  whatsapp?: OrgWhatsAppCredentials;
};

type OrganizationSettingsJson = {
  ai?: unknown;
  onboarding?: OrgOnboardingSettings;
};

export type ResolvedGoogleOAuth = {
  clientId: string;
  clientSecret: string;
  source: "organization" | "environment";
};

export type ResolvedFacebookOAuth = {
  appId: string;
  appSecret: string;
  source: "organization" | "environment";
};

export function parseOrganizationSettings(raw: unknown): OrganizationSettingsJson {
  if (!raw || typeof raw !== "object") return {};
  return raw as OrganizationSettingsJson;
}

export function maskSecret(value?: string): string {
  if (!value) return "Not configured";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

export async function getOrgOnboardingSettings(
  organizationId: string,
): Promise<OrgOnboardingSettings | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  if (!org) return null;
  return parseOrganizationSettings(org.settings).onboarding ?? null;
}

export async function resolveGoogleOAuth(
  organizationId: string,
): Promise<ResolvedGoogleOAuth | null> {
  const orgSettings = await getOrgOnboardingSettings(organizationId);
  const orgId = orgSettings?.oauth?.googleClientId?.trim();
  const orgSecret = orgSettings?.oauth?.googleClientSecret?.trim();

  if (orgId && orgSecret) {
    return { clientId: orgId, clientSecret: orgSecret, source: "organization" };
  }

  const env = getEnvGoogleOAuth();
  if (env) return { ...env, source: "environment" };
  return null;
}

export async function resolveFacebookOAuth(
  organizationId: string,
): Promise<ResolvedFacebookOAuth | null> {
  const orgSettings = await getOrgOnboardingSettings(organizationId);
  const orgId = orgSettings?.oauth?.facebookAppId?.trim();
  const orgSecret = orgSettings?.oauth?.facebookAppSecret?.trim();

  if (orgId && orgSecret) {
    return { appId: orgId, appSecret: orgSecret, source: "organization" };
  }

  const env = getEnvFacebookOAuth();
  if (env) return { ...env, source: "environment" };
  return null;
}

export async function getOAuthProviderStatusForOrg(organizationId: string) {
  const [google, facebook] = await Promise.all([
    resolveGoogleOAuth(organizationId),
    resolveFacebookOAuth(organizationId),
  ]);

  return {
    google: Boolean(google),
    facebook: Boolean(facebook),
    googleSource: google?.source,
    facebookSource: facebook?.source,
    devMock:
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_OAUTH_DEV_MOCK === "true",
  };
}

export function getPublicOnboardingSettings(settings: OrgOnboardingSettings | null) {
  const oauth = settings?.oauth;
  const whatsapp = settings?.whatsapp;

  return {
    googleClientId: oauth?.googleClientId ?? "",
    hasGoogleSecret: Boolean(oauth?.googleClientSecret),
    googleSecretMask: maskSecret(oauth?.googleClientSecret),
    facebookAppId: oauth?.facebookAppId ?? "",
    hasFacebookSecret: Boolean(oauth?.facebookAppSecret),
    facebookSecretMask: maskSecret(oauth?.facebookAppSecret),
    whatsappPhoneNumberId: whatsapp?.phoneNumberId ?? "",
    hasWhatsappAccessToken: Boolean(whatsapp?.accessToken),
    whatsappAccessTokenMask: maskSecret(whatsapp?.accessToken),
    hasWhatsappAppSecret: Boolean(whatsapp?.appSecret),
    whatsappAppSecretMask: maskSecret(whatsapp?.appSecret),
    whatsappVerifyToken: whatsapp?.verifyToken ?? "",
  };
}

export async function resolveWhatsAppAppSecret(
  organizationId?: string,
): Promise<string | undefined> {
  if (organizationId) {
    const org = await getOrgOnboardingSettings(organizationId);
    const secret = org?.whatsapp?.appSecret?.trim();
    if (secret) return secret;
  }
  return getEnvWhatsAppAppSecret();
}

export async function resolveWhatsAppCredentialsForOrg(
  organizationId: string,
  phoneNumberId: string,
): Promise<{ accessToken: string; phoneNumberId: string } | null> {
  const org = await getOrgOnboardingSettings(organizationId);
  const accessToken = org?.whatsapp?.accessToken?.trim();
  const orgPhoneNumberId = org?.whatsapp?.phoneNumberId?.trim() || phoneNumberId;

  if (accessToken) {
    return { accessToken, phoneNumberId: orgPhoneNumberId };
  }

  return null;
}

export function getOAuthRedirectUris() {
  return {
    google: oauthCallbackUrl("google"),
    facebook: oauthCallbackUrl("facebook"),
  };
}

export function getEnvWhatsAppFallback() {
  return {
    verifyToken: getEnvWhatsAppVerifyToken(),
    appSecret: getEnvWhatsAppAppSecret(),
  };
}
