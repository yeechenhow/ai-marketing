import { PageHeader } from "@/components/layout/shell";
import { TemplateForm } from "@/components/org/template-form";

export default function NewTemplatePage() {
  return (
    <div>
      <PageHeader
        title="Create Template"
        description="Add an approved message template for outbound messaging"
      />
      <TemplateForm />
    </div>
  );
}
