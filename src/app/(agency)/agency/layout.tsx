import { requireAgencySession } from "@/lib/agency";
import { AgencySidebar } from "@/components/layout/agency-sidebar";
import { PortalHeader } from "@/components/layout/portal-header";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAgencySession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AgencySidebar />
      <div className="flex flex-1 flex-col">
        <PortalHeader portalLabel="Agency Portal" showAgencyLink showAgentLink />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
