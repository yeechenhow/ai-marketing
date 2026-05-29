import { auth } from "@/lib/auth";
import { getAccessibleOrganizations, getAgencyOrganizationForUser } from "@/lib/agency/access";
import { canAccessAgencyPortal, canAccessOrgPortal } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { Building2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export async function PortalHeader({
  portalLabel,
  showAgentLink,
  showOrgLink,
  showAgencyLink,
}: {
  portalLabel: string;
  showAgentLink?: boolean;
  showOrgLink?: boolean;
  showAgencyLink?: boolean;
}) {
  const session = await auth();
  const organizations = session?.user.id
    ? await getAccessibleOrganizations(session.user.id)
    : [];

  const agencyOrg = session?.user.id
    ? await getAgencyOrganizationForUser(session.user.id)
    : null;

  const activeOrg = organizations.find((o) => o.id === session?.user.organizationId);
  const orgName = session?.user.organizationName ?? activeOrg?.name ?? "Organization";

  const canGoToOrg =
    showOrgLink ?? (session?.user ? canAccessOrgPortal(session.user) : false);
  const canGoToAgency =
    showAgencyLink ??
    (Boolean(agencyOrg) || (session?.user ? canAccessAgencyPortal(session.user) : false));

  const viewingClient =
    activeOrg?.isClient || (!activeOrg?.isAgency && Boolean(activeOrg?.agencyId));

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3 text-sm">
        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="flex items-center gap-3">
          <OrgSwitcher
            organizations={organizations}
            activeOrganizationId={session?.user.organizationId}
          />
          <div>
            <span className="font-medium text-slate-900">{orgName}</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-500">{portalLabel}</span>
            {viewingClient && (
              <span className="ml-2 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Client
              </span>
            )}
          </div>
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {session?.user.orgRole ?? session?.user.platformRole}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {canGoToAgency && !showAgencyLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/agency">
              Agency Portal
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
        {showAgentLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/pipeline">
              Agent Portal
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
        {canGoToOrg && !showAgentLink && !showAgencyLink && (
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
