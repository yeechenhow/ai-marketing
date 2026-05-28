"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type VerifyResponse = {
  ok: boolean;
  organizationName?: string;
  whatsappName?: string | null;
  maskedPhone?: string | null;
  alreadyRegistered?: boolean;
  providers?: {
    google: boolean;
    facebook: boolean;
    devMock: boolean;
  };
  error?: string;
};

function RegisterSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-200" />
      <div className="mx-auto h-6 w-48 rounded bg-slate-200" />
      <div className="mx-auto h-4 w-64 rounded bg-slate-100" />
      <div className="mt-6 space-y-3">
        <div className="h-11 rounded-lg bg-slate-200" />
        <div className="h-11 rounded-lg bg-slate-200" />
      </div>
      <div className="h-4 w-full rounded bg-slate-100" />
    </div>
  );
}

export function RegisterClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const urlError = searchParams.get("error");

  const [loading, setLoading] = useState(true);
  const [verifyData, setVerifyData] = useState<VerifyResponse | null>(null);
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setVerifyData({ ok: false, error: "Missing registration link token." });
      return;
    }

    let cancelled = false;

    async function verifyToken() {
      try {
        const response = await fetch(`/api/onboarding/verify?t=${encodeURIComponent(token!)}`);
        const data = (await response.json()) as VerifyResponse;
        if (!cancelled) {
          if (!response.ok) {
            setVerifyData({ ok: false, error: data.error ?? "Invalid registration link." });
          } else {
            setVerifyData(data);
          }
        }
      } catch {
        if (!cancelled) {
          setVerifyData({ ok: false, error: "Unable to verify your registration link." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    verifyToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const greeting = useMemo(() => {
    if (!verifyData?.whatsappName) return "Welcome";
    return `Welcome, ${verifyData.whatsappName.split(" ")[0]}`;
  }, [verifyData?.whatsappName]);

  const providers = verifyData?.providers;
  const hasGoogle = providers?.google ?? false;
  const hasFacebook = providers?.facebook ?? false;
  const hasDevMock = providers?.devMock ?? false;
  const hasAnyOAuth = hasGoogle || hasFacebook || hasDevMock;

  function startOAuth(provider: "google" | "facebook") {
    if (!token || !consented) return;
    setSubmitting(provider);
    window.location.href = `/api/onboarding/oauth/${provider}?t=${encodeURIComponent(token)}&consent=1`;
  }

  function startDevMock(provider: "google" | "facebook") {
    if (!token || !consented) return;
    setSubmitting(`dev-${provider}`);
    window.location.href = `/api/dev/simulate-oauth/${provider}?t=${encodeURIComponent(token)}&consent=1`;
  }

  const showError = urlError || (verifyData && !verifyData.ok && verifyData.error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4">
      <Card className="w-full max-w-md border-white/10 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white">
            AI
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Customer 360 Registration
          </p>
          <CardTitle className="text-2xl">{loading ? "Verifying link…" : greeting}</CardTitle>
          <CardDescription>
            {loading
              ? "Securely validating your WhatsApp onboarding link"
              : verifyData?.organizationName
                ? `Continue with Google or Facebook to complete your profile for ${verifyData.organizationName}.`
                : "Link your social account to build your Customer 360 profile."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {loading && <RegisterSkeleton />}

          {!loading && showError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {decodeURIComponent(urlError ?? verifyData?.error ?? "")}
              {urlError?.includes("OAuth is not configured") && hasDevMock && (
                <p className="mt-2 text-xs">
                  For local testing, use the <strong>Dev simulate</strong> button below instead.
                </p>
              )}
            </div>
          )}

          {!loading && verifyData?.ok && verifyData.alreadyRegistered && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Your profile is already linked
              {verifyData.maskedPhone ? ` (WhatsApp ${verifyData.maskedPhone})` : ""}.
              You can close this page.
            </div>
          )}

          {!loading && verifyData?.ok && !verifyData.alreadyRegistered && (
            <>
              {verifyData.maskedPhone && (
                <p className="text-center text-xs text-slate-500">
                  WhatsApp verified {verifyData.maskedPhone}
                </p>
              )}

              {!hasAnyOAuth && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  OAuth is not configured for this organization. Your org admin must add Google /
                  Facebook credentials at{" "}
                  <strong>Org Admin → Onboarding Settings</strong> before real sign-in works.
                </div>
              )}

              <div className="space-y-3">
                {hasGoogle && (
                  <Button
                    type="button"
                    className="w-full bg-white text-slate-900 hover:bg-slate-100"
                    disabled={!consented || submitting !== null}
                    onClick={() => startOAuth("google")}
                  >
                    {submitting === "google" ? "Redirecting…" : "Continue with Google"}
                  </Button>
                )}

                {hasFacebook && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166fe0]"
                    disabled={!consented || submitting !== null}
                    onClick={() => startOAuth("facebook")}
                  >
                    {submitting === "facebook" ? "Redirecting…" : "Continue with Facebook"}
                  </Button>
                )}

                {hasDevMock && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={!consented || submitting !== null}
                    onClick={() => startDevMock(hasFacebook ? "facebook" : "google")}
                  >
                    {submitting?.startsWith("dev-")
                      ? "Completing dev registration…"
                      : "Dev simulate sign-in (local testing)"}
                  </Button>
                )}
              </div>

              {hasDevMock && !hasFacebook && !hasGoogle && (
                <p className="text-center text-xs text-slate-500">
                  No OAuth keys saved for this org yet — use Dev simulate to finish the flow
                  locally, or ask your org admin to configure Onboarding Settings.
                </p>
              )}

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />
                <span>
                  I agree to let the platform analyze my public social profile to tailor my
                  messaging experience.
                </span>
              </label>

              {!consented && (
                <p className="text-center text-xs text-slate-500">
                  Please accept the consent above to enable sign-in.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
