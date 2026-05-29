import { requireAgencySession } from "@/lib/agency";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { CreateClientForm } from "@/components/agency/create-client-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NewAgencyClientPage() {
  const { agency } = await requireAgencySession();

  const templateFunnels = await db.funnel.findMany({
    where: { organizationId: agency.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, channelType: true },
  });

  return (
    <div>
      <PageHeader
        title="Add client organization"
        description="Provision a new client workspace under your agency"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/agency/clients">Back to clients</Link>
          </Button>
        }
      />
      <CreateClientForm templateFunnels={templateFunnels} />
    </div>
  );
}
