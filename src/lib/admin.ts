import { auth } from "@/lib/auth";
import { getPortalPath } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") {
    redirect(getPortalPath(session.user));
  }
  return session;
}
