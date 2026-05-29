"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkflow } from "@/lib/actions/workflows";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import type { Funnel, FunnelChannel } from "@/generated/prisma/client";

const CHANNELS = Object.keys(FUNNEL_CHANNEL_LABELS) as FunnelChannel[];

export function WorkflowCreateForm({
  funnels,
  defaultFunnelId,
}: {
  funnels: Pick<Funnel, "id" | "name" | "channelType">[];
  defaultFunnelId?: string;
}) {
  const defaultFunnel = funnels.find((f) => f.id === defaultFunnelId);

  return (
    <form action={createWorkflow} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Workflow name *
        </label>
        <Input id="name" name="name" required placeholder="e.g. Facebook lead nurture" />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Optional notes for your team"
        />
      </div>
      <div>
        <label htmlFor="funnelId" className="mb-1 block text-sm font-medium text-slate-700">
          Link to funnel
        </label>
        <select
          id="funnelId"
          name="funnelId"
          defaultValue={defaultFunnelId ?? ""}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">No funnel (standalone)</option>
          {funnels.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({FUNNEL_CHANNEL_LABELS[f.channelType]})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="channelType" className="mb-1 block text-sm font-medium text-slate-700">
          Entry channel *
        </label>
        <select
          id="channelType"
          name="channelType"
          defaultValue={defaultFunnel?.channelType ?? "FACEBOOK"}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          {CHANNELS.filter((c) => c !== "GENERIC").map((c) => (
            <option key={c} value={c}>
              {FUNNEL_CHANNEL_LABELS[c]}
            </option>
          ))}
          <option value="GENERIC">Generic</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Sets the trigger step — e.g. Facebook lead form, YouTube click, promotion URL visit
        </p>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Create & open builder</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/workflows">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
