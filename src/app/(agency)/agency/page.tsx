import { requireAgencySession, loadClientHealthMetrics } from "@/lib/agency";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwitchClientButton } from "@/components/agency/switch-client-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function AgencyDashboardPage() {
  const { agency } = await requireAgencySession();
  const clients = await loadClientHealthMetrics(agency.id);

  const totals = clients.reduce(
    (acc, client) => ({
      prospects: acc.prospects + client.prospects,
      openDeals: acc.openDeals + client.openDeals,
      pipelineValue: acc.pipelineValue + client.pipelineValue,
      activeEnrollments: acc.activeEnrollments + client.activeEnrollments,
    }),
    { prospects: 0, openDeals: 0, pipelineValue: 0, activeEnrollments: 0 },
  );

  return (
    <div>
      <PageHeader
        title={agency.name}
        description="Agency overview — monitor all client workspaces from one login"
        actions={
          <Button asChild>
            <Link href="/agency/clients/new">Add client</Link>
          </Button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Client orgs" value={clients.length} />
        <StatCard label="Total prospects" value={totals.prospects} />
        <StatCard
          label="Combined pipeline"
          value={`$${totals.pipelineValue.toLocaleString()}`}
          hint={`${totals.openDeals} open deals`}
        />
        <StatCard
          label="Active automations"
          value={totals.activeEnrollments}
          hint="Across all clients"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client health</CardTitle>
          <Link href="/agency/clients" className="text-sm text-indigo-600 hover:underline">
            Manage clients
          </Link>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">No client organizations yet.</p>
              <Button className="mt-4" asChild>
                <Link href="/agency/clients/new">Create first client</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">Prospects</th>
                    <th className="px-3 py-2 font-medium">Pipeline</th>
                    <th className="px-3 py-2 font-medium">Campaigns</th>
                    <th className="px-3 py-2 font-medium">Automations</th>
                    <th className="px-3 py-2 font-medium">Last activity</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <Link
                          href={`/agency/clients/${client.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {client.name}
                        </Link>
                        <p className="text-xs text-slate-500">{client.slug}</p>
                      </td>
                      <td className="px-3 py-3">{client.prospects}</td>
                      <td className="px-3 py-3">
                        ${client.pipelineValue.toLocaleString()}
                        <span className="ml-1 text-xs text-slate-500">({client.openDeals})</span>
                      </td>
                      <td className="px-3 py-3">{client.activeCampaigns}</td>
                      <td className="px-3 py-3">
                        {client.activeEnrollments > 0 ? (
                          <Badge variant="success">{client.activeEnrollments} active</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {formatDistanceToNow(client.lastActivityAt, { addSuffix: true })}
                      </td>
                      <td className="px-3 py-3">
                        <SwitchClientButton
                          organizationId={client.id}
                          redirectTo="/dashboard/pipeline"
                          label="Pipeline"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
