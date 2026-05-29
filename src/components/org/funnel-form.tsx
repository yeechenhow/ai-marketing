import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFunnel } from "@/lib/actions/org";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import type { FunnelChannel } from "@/generated/prisma/client";

const CHANNELS = Object.keys(FUNNEL_CHANNEL_LABELS) as FunnelChannel[];

export function FunnelForm() {
  return (
    <form action={createFunnel} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Funnel name *
        </label>
        <Input id="name" name="name" required placeholder="e.g. Facebook Lead Funnel" />
      </div>
      <div>
        <label htmlFor="channelType" className="mb-1 block text-sm font-medium text-slate-700">
          Entry channel *
        </label>
        <select
          id="channelType"
          name="channelType"
          defaultValue="FACEBOOK"
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {FUNNEL_CHANNEL_LABELS[c]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Facebook campaign, YouTube, promotion URL, WhatsApp, etc. — each can have its own workflow
        </p>
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Optional description for this funnel"
          className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <p className="text-xs text-slate-500">
        Default pipeline stages (Lead → Contacted → Qualified → Proposal → Won) are created
        automatically. Add a visual workflow after creation.
      </p>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Create funnel</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/pipelines">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
