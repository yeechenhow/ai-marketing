"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createCampaignTrackedLink } from "@/lib/actions/tracked-links";
import { Copy, Link2, Plus } from "lucide-react";

type TrackedLinkRow = {
  id: string;
  slug: string;
  destinationUrl: string;
  label: string | null;
  createdAt: Date;
};

export function TrackedLinksPanel({
  campaignId,
  links,
  baseUrl,
}: {
  campaignId: string;
  links: TrackedLinkRow[];
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setMessage("Copied");
    setTimeout(() => setMessage(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-900">Tracked promotion links</p>
        <p className="mt-1 text-xs text-slate-500">
          Append <code className="rounded bg-slate-100 px-1">?p=prospectToken</code> when sending
          to a specific prospect. Workflow waits and conditions listen for link clicks.
        </p>
      </div>

      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((link) => {
            const trackUrl = `${baseUrl}/api/links/${link.slug}`;
            return (
              <li
                key={link.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {link.label ?? link.slug}
                    </p>
                    <p className="truncate text-slate-500">→ {link.destinationUrl}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-indigo-600">
                      {trackUrl}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => copyText(trackUrl)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="space-y-2 rounded-lg border border-dashed border-slate-200 p-3"
        action={(formData) => {
          startTransition(async () => {
            setMessage(null);
            const result = await createCampaignTrackedLink(campaignId, formData);
            setMessage(result.ok ? "Link created" : result.error ?? "Failed");
          });
        }}
      >
        <label className="block text-xs text-slate-600">
          Label (optional)
          <input
            name="label"
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            placeholder="Spring promo landing page"
          />
        </label>
        <label className="block text-xs text-slate-600">
          Destination URL
          <input
            name="destinationUrl"
            required
            type="url"
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            placeholder="https://yoursite.com/promo"
          />
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            "Creating…"
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add tracked link
            </>
          )}
        </Button>
      </form>

      {message && <p className="text-xs text-emerald-600">{message}</p>}

      <p className="flex items-center gap-1 text-[11px] text-slate-500">
        <Link2 className="h-3 w-3" />
        Dev: POST /api/dev/simulate-link-click with slug + prospectId
      </p>
    </div>
  );
}
