"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TestOnboardingButton({
  orgSlug,
  campaignId,
  prefilledMessage,
}: {
  orgSlug: string;
  campaignId: string;
  prefilledMessage: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    prospectId?: string;
    registrationUrl?: string;
    error?: string;
  } | null>(null);

  async function handleTest() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/dev/simulate-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          campaignId,
          from: "6591234567",
          profileName: "Test User",
          messageBody: prefilledMessage,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        prospectId?: string;
        registrationUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        setResult({ error: data.error ?? "Test failed" });
        return;
      }

      setResult({
        ok: true,
        prospectId: data.prospectId,
        registrationUrl: data.registrationUrl,
      });
    } catch {
      setResult({ error: "Could not reach the server. Is npm run dev running?" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleTest} disabled={loading}>
          {loading ? "Simulating WhatsApp message…" : "Test now (no curl needed)"}
        </Button>
        {result?.prospectId && (
          <Button type="button" variant="default" asChild>
            <a href={`/org/prospects/${result.prospectId}`}>View Customer 360</a>
          </Button>
        )}
        {result?.registrationUrl && (
          <Button type="button" variant="outline" asChild>
            <a href={result.registrationUrl} target="_blank" rel="noopener noreferrer">
              Step 2 — Open registration page
            </a>
          </Button>
        )}
      </div>

      {result?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      )}

      {result?.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">Step 1 done — prospect created in CRM</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-emerald-900">
            <li>
              Click <strong>View Customer 360</strong> above to see the contact (WhatsApp-only until
              registration).
            </li>
            {result.registrationUrl && (
              <li>
                Click <strong>Step 2 — Open registration page</strong>, consent, then use{" "}
                <strong>Dev simulate sign-in</strong> to fill in social profile data.
              </li>
            )}
          </ol>
          {result.registrationUrl && (
            <p className="mt-2 break-all text-xs opacity-80">{result.registrationUrl}</p>
          )}
        </div>
      )}

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-700">
          Advanced: run in Terminal instead
        </summary>
        <p className="mt-2">
          The curl command is <strong>not</strong> pasted into your code. Open{" "}
          <strong>Terminal</strong> on your Mac (or the terminal panel in Cursor), make sure{" "}
          <code className="rounded bg-slate-100 px-1">npm run dev</code> is running, then paste
          and press Enter.
        </p>
      </details>
    </div>
  );
}
