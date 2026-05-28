import { PageHeader } from "@/components/layout/shell";
import { AddTeamMemberForm } from "@/components/org/add-team-member-form";

export default function AddTeamMemberPage() {
  return (
    <div>
      <PageHeader
        title="Add Team Member"
        description="Invite an agent, manager, or admin to your organization"
      />
      <AddTeamMemberForm />
    </div>
  );
}
