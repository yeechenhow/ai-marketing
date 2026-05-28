import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTeamMember } from "@/lib/actions/org";
import type { PlatformRole } from "@/generated/prisma/client";

const ROLES: { value: PlatformRole; label: string }[] = [
  { value: "AGENT", label: "Agent" },
  { value: "MANAGER", label: "Manager" },
  { value: "ORG_ADMIN", label: "Org Admin" },
  { value: "ANALYST", label: "Analyst" },
];

export function AddTeamMemberForm() {
  return (
    <form action={addTeamMember} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Full name *
        </label>
        <Input id="name" name="name" required placeholder="Jane Smith" />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email *
        </label>
        <Input id="email" name="email" type="email" required placeholder="jane@company.com" />
      </div>
      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="AGENT"
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Initial password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          defaultValue="demo1234"
          minLength={6}
        />
        <p className="mt-1 text-xs text-slate-500">User can change this after first login.</p>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">Add member</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/org/team">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
