import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { WorkflowCreateForm } from "@/components/workflows/workflow-create-form";

export default async function NewWorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ funnelId?: string }>;
}) {
  const { organization } = await requireOrgSession();
  const { funnelId } = await searchParams;

  const funnels = await db.funnel.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
  });

  const preselected = funnelId
    ? funnels.find((f) => f.id === funnelId)
    : undefined;

  return (
    <div>
      <PageHeader
        title="Create workflow"
        description="Link a visual automation to a funnel and channel"
      />
      <WorkflowCreateForm funnels={funnels} defaultFunnelId={preselected?.id} />
    </div>
  );
}
