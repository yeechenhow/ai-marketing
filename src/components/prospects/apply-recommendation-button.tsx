"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { applyRecommendation } from "@/lib/actions/prospects";

export function ApplyRecommendationButton({ recommendationId }: { recommendationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => applyRecommendation(recommendationId))}
    >
      {pending ? "Creating task…" : "Create task"}
    </Button>
  );
}
