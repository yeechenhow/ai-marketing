import { createOrganization } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CreateOrgForm() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Organization details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createOrganization} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Organization name
            </label>
            <Input id="name" name="name" required placeholder="Acme Insurance" />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
              URL slug
            </label>
            <Input id="slug" name="slug" required placeholder="acme-insurance" />
            <p className="mt-1 text-xs text-slate-500">Lowercase letters, numbers, and hyphens only</p>
          </div>
          <div>
            <label htmlFor="plan" className="mb-1 block text-sm font-medium text-slate-700">
              Subscription plan
            </label>
            <select
              id="plan"
              name="plan"
              defaultValue="STARTER"
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
          <Button type="submit">Create organization</Button>
        </form>
      </CardContent>
    </Card>
  );
}
