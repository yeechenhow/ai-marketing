"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateCampaignLinks } from "@/lib/actions/org";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import type { FunnelChannel } from "@/generated/prisma/client";

type FunnelOption = { id: string; name: string; channelType: FunnelChannel };
type WorkflowOption = {
  id: string;
  name: string;
  funnelId: string | null;
  isActive: boolean;
};

export function CampaignLinksForm({
  campaignId,
  currentFunnelId,
  currentWorkflowId,
  funnels,
  workflows,
}: {
  campaignId: string;
  currentFunnelId: string | null;
  currentWorkflowId: string | null;
  funnels: FunnelOption[];
  workflows: WorkflowOption[];
}) {
  const [funnelId, setFunnelId] = useState(currentFunnelId ?? "");
  const [workflowId, setWorkflowId] = useState(currentWorkflowId ?? "");

  const filteredWorkflows = useMemo(() => {
    if (!funnelId) return workflows;
    const linked = workflows.filter((w) => w.funnelId === funnelId);
    return linked.length > 0 ? linked : workflows;
  }, [funnelId, workflows]);

  return (
    <form action={updateCampaignLinks} className="space-y-4">
      <input type="hidden" name="campaignId" value={campaignId} />
      <div>
        <label htmlFor="funnelId" className="mb-1 block text-sm font-medium text-slate-700">
          Funnel
        </label>
        <select
          id="funnelId"
          name="funnelId"
          value={funnelId}
          onChange={(e) => {
            setFunnelId(e.target.value);
            setWorkflowId("");
          }}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">No funnel</option>
          {funnels.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({FUNNEL_CHANNEL_LABELS[f.channelType]})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="workflowId" className="mb-1 block text-sm font-medium text-slate-700">
          Workflow
        </label>
        <select
          id="workflowId"
          name="workflowId"
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">No workflow (manual)</option>
          {filteredWorkflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
              {w.isActive ? "" : " (draft)"}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          New prospects in this campaign auto-enroll into the workflow when it&apos;s active.
        </p>
      </div>
      <Button type="submit" size="sm">
        Save automation
      </Button>
    </form>
  );
}
