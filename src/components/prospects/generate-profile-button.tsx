"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateProspectProfile } from "@/lib/actions/prospects";

export function GenerateProfileButton({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => generateProspectProfile(prospectId))}
    >
      {pending ? "Generating…" : "Generate AI Profile"}
    </Button>
  );
}
