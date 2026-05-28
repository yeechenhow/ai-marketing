"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendMessage, suggestReply } from "@/lib/actions/messaging";

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [suggesting, startSuggest] = useTransition();

  function handleSuggest() {
    setError("");
    startSuggest(async () => {
      try {
        const { suggestion } = await suggestReply(conversationId);
        setContent(suggestion);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not generate suggestion");
      }
    });
  }

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await sendMessage(conversationId, formData);
        setContent("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send message");
      }
    });
  }

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <form action={handleSubmit} className="flex gap-2">
        <textarea
          name="content"
          required
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your reply…"
          disabled={pending || suggesting}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending || suggesting}
            onClick={handleSuggest}
          >
            {suggesting ? "Thinking…" : "Suggest reply"}
          </Button>
          <Button type="submit" disabled={pending || suggesting || !content.trim()}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
