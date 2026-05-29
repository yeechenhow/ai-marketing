import { db } from "@/lib/db";
import type { PlatformRole } from "@/generated/prisma/client";

export type AccessibleOrganization = {
  id: string;
  name: string;
  slug: string;
  isAgency: boolean;
  agencyId: string | null;
  role: PlatformRole;
  isClient: boolean;
};

const AGENCY_STAFF_ROLES: PlatformRole[] = ["ORG_ADMIN", "ANALYST"];

export async function getAccessibleOrganizations(
  userId: string,
): Promise<AccessibleOrganization[]> {
  const memberships = await db.organizationMember.findMany({
    where: { userId, isActive: true },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  });

  const orgMap = new Map<string, AccessibleOrganization>();

  for (const membership of memberships) {
    const org = membership.organization;
    orgMap.set(org.id, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isAgency: org.isAgency,
      agencyId: org.agencyId,
      role: membership.role,
      isClient: Boolean(org.agencyId),
    });

    if (org.isAgency && AGENCY_STAFF_ROLES.includes(membership.role)) {
      const clients = await db.organization.findMany({
        where: { agencyId: org.id, isActive: true },
        orderBy: { name: "asc" },
      });

      for (const client of clients) {
        if (!orgMap.has(client.id)) {
          orgMap.set(client.id, {
            id: client.id,
            name: client.name,
            slug: client.slug,
            isAgency: false,
            agencyId: org.id,
            role: membership.role,
            isClient: true,
          });
        }
      }
    }
  }

  return Array.from(orgMap.values());
}

export async function canAccessOrganization(
  userId: string,
  organizationId: string,
): Promise<AccessibleOrganization | null> {
  const orgs = await getAccessibleOrganizations(userId);
  return orgs.find((o) => o.id === organizationId) ?? null;
}

export async function resolveActiveOrganization(
  userId: string,
  preferredOrgId?: string,
): Promise<AccessibleOrganization | null> {
  const orgs = await getAccessibleOrganizations(userId);
  if (orgs.length === 0) return null;

  if (preferredOrgId) {
    const match = orgs.find((o) => o.id === preferredOrgId);
    if (match) return match;
  }

  const agencyHome = orgs.find((o) => o.isAgency);
  return agencyHome ?? orgs[0];
}

export async function getAgencyOrganizationForUser(userId: string) {
  const membership = await db.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      role: { in: AGENCY_STAFF_ROLES },
      organization: { isAgency: true, isActive: true },
    },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  });

  return membership?.organization ?? null;
}

export async function getAgencyClients(agencyOrgId: string) {
  return db.organization.findMany({
    where: { agencyId: agencyOrgId, isActive: true },
    orderBy: { name: "asc" },
  });
}
