"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleOrganizationStatus } from "@/lib/actions/admin";

export function ToggleOrgStatusButton({
  orgId,
  isActive,
}: {
  orgId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleOrganizationStatus(orgId))}
    >
      {pending ? "Updating…" : isActive ? "Suspend" : "Activate"}
    </Button>
  );
}
