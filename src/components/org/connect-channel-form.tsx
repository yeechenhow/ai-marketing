import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectChannel } from "@/lib/actions/org";
import type { Channel } from "@/generated/prisma/client";

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp Business" },
  { value: "MESSENGER", label: "Facebook Messenger" },
  { value: "WEB_CHAT", label: "Web Chat Widget" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
];

export function ConnectChannelForm({ defaultChannel }: { defaultChannel?: string }) {
  return (
    <form action={connectChannel} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="channel" className="mb-1 block text-sm font-medium text-slate-700">
          Channel type
        </label>
        <select
          id="channel"
          name="channel"
          defaultValue={defaultChannel ?? "WHATSAPP"}
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
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Display name *
        </label>
        <Input
          id="name"
          name="name"
          required
          placeholder="e.g. Main WhatsApp Line"
        />
      </div>
      <div>
        <label htmlFor="externalId" className="mb-1 block text-sm font-medium text-slate-700">
          Phone / Page ID (optional)
        </label>
        <Input
          id="externalId"
          name="externalId"
          placeholder="e.g. +1 555 0100 or Meta Page ID"
        />
      </div>
      <p className="text-xs text-slate-500">
        OAuth and webhook setup will be added in Sprint 2. This registers the channel in your workspace.
      </p>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Connect channel</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/channels">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
