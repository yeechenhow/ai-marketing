import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleChannelButton } from "@/components/org/toggle-channel-button";
import type { ReactNode } from "react";
import Link from "next/link";
import { MessageCircle, Mail, Globe, Smartphone } from "lucide-react";

const CHANNEL_META: Record<
  string,
  { label: string; icon: ReactNode; description: string }
> = {
  WHATSAPP: {
    label: "WhatsApp Business",
    icon: <MessageCircle className="h-5 w-5 text-green-600" />,
    description: "24h service window · template-based outbound",
  },
  MESSENGER: {
    label: "Facebook Messenger",
    icon: <MessageCircle className="h-5 w-5 text-blue-600" />,
    description: "Page messaging · policy-aware automation",
  },
  WEB_CHAT: {
    label: "Web Chat Widget",
    icon: <Globe className="h-5 w-5 text-indigo-600" />,
    description: "Embeddable chat for landing pages",
  },
  EMAIL: {
    label: "Email",
    icon: <Mail className="h-5 w-5 text-slate-600" />,
    description: "SMTP / provider integration",
  },
  SMS: {
    label: "SMS",
    icon: <Smartphone className="h-5 w-5 text-orange-600" />,
    description: "Optional SMS provider",
  },
};

export default async function OrgChannelsPage() {
  const { organization } = await requireOrgSession();

  const connections = await db.channelConnection.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Channel Integrations"
        description="Connect WhatsApp, Messenger, email, and web chat"
        actions={
          <Button asChild>
            <Link href="/org/channels/new">Connect Channel</Link>
          </Button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(CHANNEL_META).map(([channel, meta]) => {
          const connected = connections.find((c) => c.channel === channel && c.isActive);
          return (
            <Card key={channel}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  {meta.icon}
                  <Badge variant={connected ? "success" : "secondary"}>
                    {connected ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{meta.label}</h3>
                <p className="mt-1 text-xs text-slate-500">{meta.description}</p>
                {connected && (
                  <p className="mt-2 text-sm text-slate-600">{connected.name}</p>
                )}
                <Button variant={connected ? "outline" : "default"} size="sm" className="mt-4 w-full" asChild>
                  <Link href={`/org/channels/new?channel=${channel}`}>
                    {connected ? "Add another" : "Connect"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {connections.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">External ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.channel}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.externalId ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? "success" : "secondary"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ToggleChannelButton channelId={c.id} isActive={c.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No channels connected yet"
          description="Connect WhatsApp or Messenger to start receiving inbound leads."
          action={
            <Button asChild>
              <Link href="/org/channels/new?channel=WHATSAPP">Connect WhatsApp</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
