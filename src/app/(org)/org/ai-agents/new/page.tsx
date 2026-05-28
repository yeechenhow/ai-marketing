import { PageHeader } from "@/components/layout/shell";
import { AIAgentForm } from "@/components/org/ai-agent-form";

export default function NewAIAgentPage() {
  return (
    <div>
      <PageHeader
        title="Create AI Agent"
        description="Configure a digital sales agent for inbound qualification and nurture"
      />
      <AIAgentForm />
    </div>
  );
}
