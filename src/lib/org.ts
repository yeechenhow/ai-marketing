import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessOrgPortal } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function requireOrgSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/login");
  if (!canAccessOrgPortal(session.user)) redirect("/dashboard");

  const organization = await db.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  if (!organization) redirect("/login");

  return { session, organization };
}
