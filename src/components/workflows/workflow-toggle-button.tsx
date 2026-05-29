"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleWorkflowActive } from "@/lib/actions/workflows";

export function WorkflowToggleButton({
  workflowId,
  isActive,
}: {
  workflowId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() => toggleWorkflowActive(workflowId, !isActive))
      }
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
