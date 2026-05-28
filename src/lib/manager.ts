import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessManagerPortal, getPortalPath } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function requireManagerSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/login");
  if (!canAccessManagerPortal(session.user)) {
    redirect(getPortalPath(session.user));
  }

  const organization = await db.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  if (!organization) redirect("/login");

  return { session, organization };
}

export async function getTeamAgentIds(organizationId: string) {
  const agents = await db.organizationMember.findMany({
    where: {
      organizationId,
      isActive: true,
      role: { in: ["AGENT", "MANAGER"] },
    },
    select: { userId: true },
  });
  return agents.map((a) => a.userId);
}
