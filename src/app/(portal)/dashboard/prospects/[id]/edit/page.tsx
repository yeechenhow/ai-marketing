import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { updateProspect } from "@/lib/actions/prospects";

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const { id } = await params;

  const prospect = await db.prospect.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!prospect) notFound();

  const boundUpdate = updateProspect.bind(null, id);

  return (
    <div>
      <PageHeader
        title="Edit Prospect"
        description={[prospect.firstName, prospect.lastName].filter(Boolean).join(" ")}
      />
      <ProspectForm
        action={boundUpdate}
        defaultValues={prospect}
        submitLabel="Save changes"
        cancelHref={`/dashboard/prospects/${id}`}
      />
    </div>
  );
}
