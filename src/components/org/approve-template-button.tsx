"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveTemplate } from "@/lib/actions/org";

export function ApproveTemplateButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => approveTemplate(templateId))}
    >
      {pending ? "…" : "Approve"}
    </Button>
  );
}
