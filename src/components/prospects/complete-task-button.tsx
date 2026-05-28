"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completeTask } from "@/lib/actions/prospect-activity";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => completeTask(taskId))}
    >
      {pending ? "…" : "Done"}
    </Button>
  );
}
