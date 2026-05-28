"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearFacebookOnboardingSecret,
  clearGoogleOnboardingSecret,
  clearWhatsappOnboardingSecrets,
  updateOrgOnboardingSettings,
} from "@/lib/actions/onboarding-settings";

export function OrgOnboardingSettingsForm({
  googleClientId,
  hasGoogleSecret,
  googleSecretMask,
  facebookAppId,
  hasFacebookSecret,
  facebookSecretMask,
  whatsappVerifyToken,
  hasWhatsappAppSecret,
  whatsappAppSecretMask,
  hasWhatsappAccessToken,
  whatsappAccessTokenMask,
  whatsappPhoneNumberId,
  redirectUris,
}: {
  googleClientId: string;
  hasGoogleSecret: boolean;
  googleSecretMask: string;
  facebookAppId: string;
  hasFacebookSecret: boolean;
  facebookSecretMask: string;
  whatsappVerifyToken: string;
  hasWhatsappAppSecret: boolean;
  whatsappAppSecretMask: string;
  hasWhatsappAccessToken: boolean;
  whatsappAccessTokenMask: string;
  whatsappPhoneNumberId: string;
  redirectUris: { google: string; facebook: string };
}) {
  return (
    <div className="max-w-2xl space-y-8">
      <form action={updateOrgOnboardingSettings} className="space-y-8">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Google OAuth</h2>
            <p className="mt-1 text-sm text-slate-500">
              Used when prospects tap &quot;Continue with Google&quot; on your registration page.
            </p>
          </div>
          <div>
            <label htmlFor="googleClientId" className="mb-1 block text-sm font-medium text-slate-700">
              Client ID
            </label>
            <Input
              id="googleClientId"
              name="googleClientId"
              defaultValue={googleClientId}
              placeholder="123456789.apps.googleusercontent.com"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="googleClientSecret"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Client secret
            </label>
            <Input
              id="googleClientSecret"
              name="googleClientSecret"
              type="password"
              placeholder={hasGoogleSecret ? "Leave blank to keep current secret" : "GOCSPX-..."}
              autoComplete="off"
            />
            {hasGoogleSecret && (
              <p className="mt-1 text-xs text-slate-500">Current: {googleSecretMask}</p>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Redirect URI for Google Cloud Console:{" "}
            <code className="rounded bg-slate-100 px-1">{redirectUris.google}</code>
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Facebook OAuth</h2>
            <p className="mt-1 text-sm text-slate-500">
              Used when prospects tap &quot;Continue with Facebook&quot; on your registration page.
            </p>
          </div>
          <div>
            <label htmlFor="facebookAppId" className="mb-1 block text-sm font-medium text-slate-700">
              App ID
            </label>
            <Input
              id="facebookAppId"
              name="facebookAppId"
              defaultValue={facebookAppId}
              placeholder="1234567890123456"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="facebookAppSecret"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              App secret
            </label>
            <Input
              id="facebookAppSecret"
              name="facebookAppSecret"
              type="password"
              placeholder={hasFacebookSecret ? "Leave blank to keep current secret" : "Meta app secret"}
              autoComplete="off"
            />
            {hasFacebookSecret && (
              <p className="mt-1 text-xs text-slate-500">Current: {facebookSecretMask}</p>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Valid OAuth redirect URI in Meta app:{" "}
            <code className="rounded bg-slate-100 px-1">{redirectUris.facebook}</code>
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">WhatsApp Cloud API</h2>
            <p className="mt-1 text-sm text-slate-500">
              Org-level WhatsApp credentials for sending registration links. Campaign webhooks use
              the per-campaign verify token on the campaign detail page.
            </p>
          </div>
          <div>
            <label
              htmlFor="whatsappPhoneNumberId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Phone number ID
            </label>
            <Input
              id="whatsappPhoneNumberId"
              name="whatsappPhoneNumberId"
              defaultValue={whatsappPhoneNumberId}
              placeholder="From Meta WhatsApp → API Setup"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="whatsappAccessToken"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Permanent access token
            </label>
            <Input
              id="whatsappAccessToken"
              name="whatsappAccessToken"
              type="password"
              placeholder={
                hasWhatsappAccessToken ? "Leave blank to keep current token" : "EAA..."
              }
              autoComplete="off"
            />
            {hasWhatsappAccessToken && (
              <p className="mt-1 text-xs text-slate-500">Current: {whatsappAccessTokenMask}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="whatsappAppSecret"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              App secret (webhook signature)
            </label>
            <Input
              id="whatsappAppSecret"
              name="whatsappAppSecret"
              type="password"
              placeholder={
                hasWhatsappAppSecret ? "Leave blank to keep current secret" : "Meta app secret"
              }
              autoComplete="off"
            />
            {hasWhatsappAppSecret && (
              <p className="mt-1 text-xs text-slate-500">Current: {whatsappAppSecretMask}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="whatsappVerifyToken"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Default verify token (optional)
            </label>
            <Input
              id="whatsappVerifyToken"
              name="whatsappVerifyToken"
              defaultValue={whatsappVerifyToken}
              placeholder="Only needed for legacy global webhook"
              autoComplete="off"
            />
          </div>
        </section>

        <div className="flex gap-2">
          <Button type="submit">Save onboarding settings</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/org/settings">Cancel</Link>
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {hasGoogleSecret && (
          <form action={clearGoogleOnboardingSecret}>
            <Button type="submit" variant="outline" size="sm">
              Clear Google secret
            </Button>
          </form>
        )}
        {hasFacebookSecret && (
          <form action={clearFacebookOnboardingSecret}>
            <Button type="submit" variant="outline" size="sm">
              Clear Facebook secret
            </Button>
          </form>
        )}
        {(hasWhatsappAccessToken || hasWhatsappAppSecret) && (
          <form action={clearWhatsappOnboardingSecrets}>
            <Button type="submit" variant="outline" size="sm">
              Clear WhatsApp secrets
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
