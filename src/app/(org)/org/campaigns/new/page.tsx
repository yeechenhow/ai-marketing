import { PageHeader } from "@/components/layout/shell";
import { CampaignForm } from "@/components/org/campaign-form";

export default function NewCampaignPage() {
  return (
    <div>
      <PageHeader
        title="Create Campaign"
        description="Set up a drip, nurture, or reactivation campaign"
      />
      <CampaignForm />
    </div>
  );
}
