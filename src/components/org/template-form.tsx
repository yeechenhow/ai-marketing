import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTemplate } from "@/lib/actions/org";
import type { Channel } from "@/generated/prisma/client";

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MESSENGER", label: "Messenger" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
];

export function TemplateForm() {
  return (
    <form action={createTemplate} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Template name *
        </label>
        <Input id="name" name="name" required placeholder="Welcome — WhatsApp" />
      </div>
      <div>
        <label htmlFor="channel" className="mb-1 block text-sm font-medium text-slate-700">
          Channel *
        </label>
        <select
          id="channel"
          name="channel"
          defaultValue="WHATSAPP"
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <Input id="category" name="category" placeholder="UTILITY, MARKETING…" />
      </div>
      <div>
        <label htmlFor="language" className="mb-1 block text-sm font-medium text-slate-700">
          Language
        </label>
        <Input id="language" name="language" defaultValue="en" />
      </div>
      <div>
        <label htmlFor="content" className="mb-1 block text-sm font-medium text-slate-700">
          Message content *
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={4}
          placeholder="Hi {{name}}, thanks for reaching out!"
          className="flex w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Create template</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/templates">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
