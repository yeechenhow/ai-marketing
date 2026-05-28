import { PageHeader } from "@/components/layout/shell";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { createProspect } from "@/lib/actions/prospects";

export default function NewProspectPage() {
  return (
    <div>
      <PageHeader
        title="Add Prospect"
        description="Create a new lead in your CRM"
      />
      <ProspectForm
        action={createProspect}
        submitLabel="Create prospect"
        cancelHref="/dashboard/prospects"
      />
    </div>
  );
}
