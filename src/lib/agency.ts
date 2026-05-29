import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAgencyOrganizationForUser } from "@/lib/agency/access";
import { getPortalPath } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function requireAgencySession() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const agency = await getAgencyOrganizationForUser(session.user.id);
  if (!agency) redirect(getPortalPath(session.user));

  return { session, agency };
}

export async function loadClientHealthMetrics(agencyOrgId: string) {
  const clients = await db.organization.findMany({
    where: { agencyId: agencyOrgId, isActive: true },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    clients.map(async (client) => {
      const [prospects, openDeals, activeCampaigns, activeEnrollments, lastProspect] =
        await Promise.all([
          db.prospect.count({ where: { organizationId: client.id } }),
          db.opportunity.count({
            where: { status: "OPEN", prospect: { organizationId: client.id } },
          }),
          db.campaign.count({
            where: { organizationId: client.id, status: { not: "archived" } },
          }),
          db.workflowEnrollment.count({
            where: { organizationId: client.id, status: "ACTIVE" },
          }),
          db.prospect.findFirst({
            where: { organizationId: client.id },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
          }),
        ]);

      const pipelineValue = await db.opportunity.aggregate({
        where: { status: "OPEN", prospect: { organizationId: client.id } },
        _sum: { value: true },
      });

      return {
        ...client,
        prospects,
        openDeals,
        activeCampaigns,
        activeEnrollments,
        pipelineValue: pipelineValue._sum.value ?? 0,
        lastActivityAt: lastProspect?.updatedAt ?? client.updatedAt,
      };
    }),
  );
}
