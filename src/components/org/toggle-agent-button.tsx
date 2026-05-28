"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleAIAgent } from "@/lib/actions/org";

export function ToggleAgentButton({ agentId, isActive }: { agentId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleAIAgent(agentId))}
    >
      {pending ? "…" : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
