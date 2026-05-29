"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { testEnrollLatestProspect, processWorkflowsNow } from "@/lib/actions/workflows";

export function WorkflowTestPanel({
  workflowId,
  isActive,
}: {
  workflowId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(true);

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const res = await fn();
      setOk(res.ok);
      setMessage(res.message);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => testEnrollLatestProspect(workflowId))}
      >
        Test: enroll latest prospect
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => run(() => processWorkflowsNow(workflowId))}
      >
        {pending ? "Processing…" : "Process now"}
      </Button>
      {!isActive && (
        <span className="text-xs text-amber-600">
          Activate the workflow for real prospects to auto-enroll.
        </span>
      )}
      {message && (
        <span className={`text-xs ${ok ? "text-emerald-600" : "text-rose-600"}`}>{message}</span>
      )}
    </div>
  );
}
