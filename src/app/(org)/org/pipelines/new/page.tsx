import { PageHeader } from "@/components/layout/shell";
import { FunnelForm } from "@/components/org/funnel-form";

export default function NewFunnelPage() {
  return (
    <div>
      <PageHeader
        title="Create Funnel"
        description="Add a new sales pipeline with default stages"
      />
      <FunnelForm />
    </div>
  );
}
