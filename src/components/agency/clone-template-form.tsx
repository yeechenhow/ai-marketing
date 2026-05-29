"use client";

import { useState, useTransition } from "react";
import { cloneTemplateToClient } from "@/lib/actions/agency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TemplateFunnel = {
  id: string;
  name: string;
  channelType: string;
  _count: { workflows: number };
};

export function CloneTemplateForm({
  clientOrgId,
  templateFunnels,
}: {
  clientOrgId: string;
  templateFunnels: TemplateFunnel[];
}) {
  const [funnelId, setFunnelId] = useState(templateFunnels[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (templateFunnels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clone templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Create funnels and workflows in your agency workspace first, then clone them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clone funnel + workflows</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Copy a funnel and its linked workflows from your agency templates into this client org.
        </p>
        <select
          value={funnelId}
          onChange={(e) => setFunnelId(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {templateFunnels.map((funnel) => (
            <option key={funnel.id} value={funnel.id}>
              {funnel.name} · {funnel.channelType} · {funnel._count.workflows} workflow(s)
            </option>
          ))}
        </select>
        {message && (
          <p className={`text-sm ${message.startsWith("Cloned") ? "text-emerald-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
        <Button
          disabled={!funnelId || pending}
          onClick={() => {
            startTransition(async () => {
              const result = await cloneTemplateToClient(clientOrgId, funnelId);
              setMessage(result.ok ? "Cloned successfully." : result.error ?? "Clone failed");
            });
          }}
        >
          {pending ? "Cloning…" : "Clone to client"}
        </Button>
      </CardContent>
    </Card>
  );
}
