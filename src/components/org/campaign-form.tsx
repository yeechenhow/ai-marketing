import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCampaign } from "@/lib/actions/org";

export function CampaignForm() {
  return (
    <form action={createCampaign} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Campaign name *
        </label>
        <Input id="name" name="name" required placeholder="e.g. 3-Day Nurture Sequence" />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What this campaign does and who it targets"
          className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Create campaign</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/campaigns">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
