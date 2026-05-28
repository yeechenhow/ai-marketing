import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessOrgPortal } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink } from "lucide-react";
import Link from "next/link";

export async function PortalHeader({
  portalLabel,
  showAgentLink,
  showOrgLink,
}: {
  portalLabel: string;
  showAgentLink?: boolean;
  showOrgLink?: boolean;
}) {
  const session = await auth();
  const org = session?.user.organizationId
    ? await db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      })
    : null;

  const canGoToOrg =
    showOrgLink ?? (session?.user ? canAccessOrgPortal(session.user) : false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3 text-sm">
        <Building2 className="h-4 w-4 text-slate-400" />
        <div>
          <span className="font-medium text-slate-900">
            {org?.name ?? "Organization"}
          </span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-slate-500">{portalLabel}</span>
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {session?.user.orgRole ?? session?.user.platformRole}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {showAgentLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              Agent Portal
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
        {canGoToOrg && !showAgentLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/org">
              Company Admin
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
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
