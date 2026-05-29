import { requireAgencySession, loadClientHealthMetrics } from "@/lib/agency";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwitchClientButton } from "@/components/agency/switch-client-button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function AgencyClientsPage() {
  const { agency } = await requireAgencySession();
  const clients = await loadClientHealthMetrics(agency.id);

  return (
    <div>
      <PageHeader
        title="Client organizations"
        description="All workspaces managed under your agency"
        actions={
          <Button asChild>
            <Link href="/agency/clients/new">Add client</Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Prospects</th>
              <th className="px-4 py-3 font-medium">Pipeline</th>
              <th className="px-4 py-3 font-medium">Automations</th>
              <th className="px-4 py-3 font-medium">Last activity</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/agency/clients/${client.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {client.name}
                  </Link>
                  <p className="text-xs text-slate-500">{client.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{client.plan}</Badge>
                </td>
                <td className="px-4 py-3">{client.prospects}</td>
                <td className="px-4 py-3">
                  ${client.pipelineValue.toLocaleString()}
                  <span className="ml-1 text-xs text-slate-500">({client.openDeals})</span>
                </td>
                <td className="px-4 py-3">{client.activeEnrollments}</td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDistanceToNow(client.lastActivityAt, { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <SwitchClientButton
                      organizationId={client.id}
                      redirectTo="/org"
                      label="Admin"
                    />
                    <SwitchClientButton
                      organizationId={client.id}
                      redirectTo="/dashboard/pipeline"
                      label="Pipeline"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            No clients yet.{" "}
            <Link href="/agency/clients/new" className="text-indigo-600 hover:underline">
              Create your first client
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
