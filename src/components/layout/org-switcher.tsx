"use client";

import { useTransition } from "react";
import { switchOrganization } from "@/lib/actions/agency";
import { ChevronDown } from "lucide-react";
import type { AccessibleOrganization } from "@/lib/agency/access";

export function OrgSwitcher({
  organizations,
  activeOrganizationId,
}: {
  organizations: AccessibleOrganization[];
  activeOrganizationId?: string;
}) {
  const [pending, startTransition] = useTransition();

  if (organizations.length <= 1) return null;

  return (
    <div className="relative">
      <select
        value={activeOrganizationId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const orgId = e.target.value;
          if (!orgId || orgId === activeOrganizationId) return;
          startTransition(() => {
            switchOrganization(orgId);
          });
        }}
        className="h-8 max-w-[220px] appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
        aria-label="Switch organization"
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.isAgency ? `${org.name} (Agency)` : org.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
