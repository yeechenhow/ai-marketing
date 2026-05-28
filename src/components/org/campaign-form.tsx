"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCampaign } from "@/lib/actions/org";

export function CampaignForm({
  whatsappChannels = [],
}: {
  whatsappChannels?: { id: string; name: string; externalId: string | null }[];
}) {
  const [campaignType, setCampaignType] = useState<"standard" | "whatsapp_onboarding">(
    "whatsapp_onboarding",
  );

  return (
    <form action={createCampaign} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="campaignType" className="mb-1 block text-sm font-medium text-slate-700">
          Campaign type
        </label>
        <select
          id="campaignType"
          name="campaignType"
          value={campaignType}
          onChange={(e) =>
            setCampaignType(e.target.value as "standard" | "whatsapp_onboarding")
          }
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="whatsapp_onboarding">WhatsApp QR onboarding (Ocard-style)</option>
          <option value="standard">Standard campaign</option>
        </select>
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Campaign name *
        </label>
        <Input id="name" name="name" required placeholder="e.g. Store Opening QR Sign-up" />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What this campaign does and who it targets"
          className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {campaignType === "whatsapp_onboarding" && (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Creates a per-org webhook URL and QR message. Paste the webhook into your Meta
            WhatsApp app settings for this organization.
          </div>

          <div>
            <label
              htmlFor="prefilledMessage"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              QR prefilled message *
            </label>
            <Input
              id="prefilledMessage"
              name="prefilledMessage"
              required
              placeholder='e.g. Hi, I want to register for the promo'
            />
            <p className="mt-1 text-xs text-slate-500">
              Text pre-filled when someone scans your WhatsApp QR code.
            </p>
          </div>

          <div>
            <label
              htmlFor="businessPhone"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              WhatsApp business number (digits only)
            </label>
            <Input
              id="businessPhone"
              name="businessPhone"
              placeholder="e.g. 6591234567"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used to generate the wa.me QR link on the campaign page.
            </p>
          </div>

          <div>
            <label
              htmlFor="channelConnectionId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              WhatsApp channel (optional)
            </label>
            <select
              id="channelConnectionId"
              name="channelConnectionId"
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              defaultValue=""
            >
              <option value="">Auto-detect from Meta phone_number_id</option>
              {whatsappChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.externalId ? ` (${c.externalId})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="welcomeMessage"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Auto-reply message (optional)
            </label>
            <textarea
              id="welcomeMessage"
              name="welcomeMessage"
              rows={2}
              placeholder="Custom WhatsApp reply before the registration link"
              className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit">
          {campaignType === "whatsapp_onboarding" ? "Create onboarding hook" : "Create campaign"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/campaigns">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
