import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAIAgent } from "@/lib/actions/org";

export function AIAgentForm() {
  return (
    <form action={createAIAgent} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Agent name *
        </label>
        <Input id="name" name="name" required placeholder="e.g. Inbound Qualifier" />
      </div>
      <div>
        <label htmlFor="persona" className="mb-1 block text-sm font-medium text-slate-700">
          Persona
        </label>
        <textarea
          id="persona"
          name="persona"
          rows={3}
          placeholder="Friendly, professional sales assistant focused on qualification"
          className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label htmlFor="tone" className="mb-1 block text-sm font-medium text-slate-700">
          Tone
        </label>
        <Input id="tone" name="tone" placeholder="Professional, Casual, Empathetic…" />
      </div>
      <div>
        <label htmlFor="language" className="mb-1 block text-sm font-medium text-slate-700">
          Language
        </label>
        <Input id="language" name="language" defaultValue="en" />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Create AI agent</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/ai-agents">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
