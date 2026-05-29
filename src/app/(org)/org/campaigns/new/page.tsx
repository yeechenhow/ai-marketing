import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { CampaignForm } from "@/components/org/campaign-form";

export default async function NewCampaignPage() {
  const { organization } = await requireOrgSession();

  const [whatsappChannels, funnels, workflows] = await Promise.all([
    db.channelConnection.findMany({
      where: { organizationId: organization.id, channel: "WHATSAPP", isActive: true },
      select: { id: true, name: true, externalId: true },
      orderBy: { createdAt: "desc" },
    }),
    db.funnel.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, channelType: true },
      orderBy: { name: "asc" },
    }),
    db.workflow.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, funnelId: true, isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Create Campaign"
        description="Launch nurture flows or WhatsApp QR onboarding hooks"
      />
      <CampaignForm
        whatsappChannels={whatsappChannels}
        funnels={funnels}
        workflows={workflows}
      />
    </div>
  );
}
