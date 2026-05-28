import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessOrgPortal } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";

export async function ManagerHeader() {
  const session = await auth();
  const org = session?.user.organizationId
    ? await db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      })
    : null;

  const showOrgLink = session?.user ? canAccessOrgPortal(session.user) : false;

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3 text-sm">
        <Users className="h-4 w-4 text-amber-600" />
        <div>
          <span className="font-medium text-slate-900">{org?.name ?? "Team"}</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-slate-500">Manager Portal</span>
        </div>
        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {session?.user.orgRole ?? session?.user.platformRole}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {showOrgLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/org">
              Company Admin
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">
            Agent Portal
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
        <span className="hidden text-sm text-slate-500 sm:inline">
          {session?.user.name ?? session?.user.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
