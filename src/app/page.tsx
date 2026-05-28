import { auth } from "@/lib/auth";
import { getPortalPath } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect(getPortalPath(session.user));
  redirect("/login");
}
