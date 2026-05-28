"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendMessage } from "@/lib/actions/messaging";

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => sendMessage(conversationId, formData))}
      className="flex gap-2 border-t border-slate-200 bg-white p-4"
    >
      <textarea
        name="content"
        required
        rows={2}
        placeholder="Type your reply…"
        disabled={pending}
        className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
