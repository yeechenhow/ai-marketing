"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleChannelStatus } from "@/lib/actions/org";

export function ToggleChannelButton({
  channelId,
  isActive,
}: {
  channelId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => toggleChannelStatus(channelId))}
    >
      {pending ? "…" : isActive ? "Disable" : "Enable"}
    </Button>
  );
}
