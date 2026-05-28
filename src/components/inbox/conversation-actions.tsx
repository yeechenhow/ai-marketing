"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveConversation, escalateConversation } from "@/lib/actions/messaging";

export function ConversationActions({ conversationId, status }: { conversationId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {status !== "RESOLVED" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => resolveConversation(conversationId))}
        >
          Mark resolved
        </Button>
      )}
      {status !== "ESCALATED" && status !== "RESOLVED" && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => escalateConversation(conversationId))}
        >
          Escalate
        </Button>
      )}
    </div>
  );
}
