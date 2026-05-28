import { PageHeader } from "@/components/layout/shell";
import { ConnectChannelForm } from "@/components/org/connect-channel-form";

export default async function ConnectChannelPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Connect Channel"
        description="Register a messaging channel for your organization"
      />
      <ConnectChannelForm defaultChannel={channel} />
    </div>
  );
}
