"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { launchCampaign } from "@/lib/actions/org";

export function LaunchCampaignButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => launchCampaign(campaignId))}
    >
      {pending ? "Launching…" : "Launch"}
    </Button>
  );
}
