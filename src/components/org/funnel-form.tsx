import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFunnel } from "@/lib/actions/org";

export function FunnelForm() {
  return (
    <form action={createFunnel} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Funnel name *
        </label>
        <Input id="name" name="name" required placeholder="e.g. Enterprise Sales Pipeline" />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Optional description for this funnel"
          className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <p className="text-xs text-slate-500">
        Default stages (Lead → Contacted → Qualified → Proposal → Won) will be created automatically.
      </p>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Create funnel</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/pipelines">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
