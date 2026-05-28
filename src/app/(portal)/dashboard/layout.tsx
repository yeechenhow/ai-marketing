import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { PortalHeader } from "@/components/layout/portal-header";
import {
  LayoutDashboard,
  Users,
  Inbox,
  Kanban,
  CheckSquare,
  Sparkles,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/dashboard/prospects", label: "Prospects", icon: <Users className="h-4 w-4" /> },
  { href: "/dashboard/inbox", label: "Inbox", icon: <Inbox className="h-4 w-4" /> },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: <Kanban className="h-4 w-4" /> },
  { href: "/dashboard/tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  { href: "/dashboard/ai", label: "AI Insights", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/dashboard/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar
        title="Agent Portal"
        subtitle="AI Sales OS"
        items={navItems}
      />
      <div className="flex flex-1 flex-col">
        <PortalHeader portalLabel="Agent Portal" showOrgLink />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
