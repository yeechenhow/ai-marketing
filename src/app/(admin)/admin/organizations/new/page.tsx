import { PageHeader } from "@/components/layout/shell";
import { CreateOrgForm } from "@/components/admin/create-org-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewOrganizationPage() {
  return (
    <div>
      <PageHeader
        title="Create Organization"
        description="Provision a new tenant workspace on the platform"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/organizations">Back to list</Link>
          </Button>
        }
      />
      <CreateOrgForm />
    </div>
  );
}
