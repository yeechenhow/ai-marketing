import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { CampaignForm } from "@/components/org/campaign-form";

export default async function NewCampaignPage() {
  const { organization } = await requireOrgSession();

  const whatsappChannels = await db.channelConnection.findMany({
    where: { organizationId: organization.id, channel: "WHATSAPP", isActive: true },
    select: { id: true, name: true, externalId: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Create Campaign"
        description="Launch nurture flows or WhatsApp QR onboarding hooks"
      />
      <CampaignForm whatsappChannels={whatsappChannels} />
    </div>
  );
}
