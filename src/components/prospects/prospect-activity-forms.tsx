"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addProspectNote, addProspectTask } from "@/lib/actions/prospect-activity";

export function AddNoteForm({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();
  const action = addProspectNote.bind(null, prospectId);

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-2"
    >
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Add a note about this prospect…"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add note"}
      </Button>
    </form>
  );
}

export function AddTaskForm({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();
  const action = addProspectTask.bind(null, prospectId);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-2"
    >
      <Input name="title" placeholder="Task title" required />
      <div className="flex gap-2">
        <select
          name="priority"
          defaultValue="MEDIUM"
          className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <Input name="dueDate" type="date" defaultValue={tomorrow} className="flex-1" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating…" : "Add task"}
      </Button>
    </form>
  );
}
