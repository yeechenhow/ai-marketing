import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: ["5 agent seats", "1 AI agent", "5K messages/mo", "Basic analytics"],
  GROWTH: ["Unlimited agents", "3 AI agents", "10K messages/mo", "Campaigns & workflows"],
  ENTERPRISE: ["Unlimited everything", "Custom AI models", "Dedicated support", "SLA & compliance"],
};

export default async function AdminBillingPage() {
  const organizations = await db.organization.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true, aiAgents: true } } },
  });

  const planCounts = organizations.reduce(
    (acc, org) => {
      acc[org.plan] = (acc[org.plan] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mrrEstimate =
    (planCounts.STARTER ?? 0) * 49 +
    (planCounts.GROWTH ?? 0) * 149 +
    (planCounts.ENTERPRISE ?? 0) * 499;

  return (
    <div>
      <PageHeader
        title="Billing & Subscriptions"
        description="Tenant plans, usage metering, and revenue overview"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Est. MRR" value={`$${mrrEstimate.toLocaleString()}`} hint="Based on plan tiers" />
        <StatCard label="STARTER" value={planCounts.STARTER ?? 0} hint="$49/mo" />
        <StatCard label="GROWTH" value={planCounts.GROWTH ?? 0} hint="$149/mo" />
        <StatCard label="ENTERPRISE" value={planCounts.ENTERPRISE ?? 0} hint="$499/mo" />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {Object.entries(PLAN_FEATURES).map(([plan, features]) => (
          <Card key={plan}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan}
                <Badge variant="secondary">{planCounts[plan] ?? 0} tenants</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-slate-600">
                {features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Seats Used</th>
              <th className="px-4 py-3">AI Agents</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="font-medium text-violet-600 hover:underline"
                  >
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{org.plan}</Badge>
                </td>
                <td className="px-4 py-3">{org._count.members}</td>
                <td className="px-4 py-3">{org._count.aiAgents}</td>
                <td className="px-4 py-3">
                  <Badge variant={org.isActive ? "success" : "destructive"}>
                    {org.isActive ? "Active" : "Suspended"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm">
                    Change plan
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
