import { requireAdminSession } from "@/lib/admin";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Bot,
  FileText,
  BarChart3,
  ScrollText,
  ShieldCheck,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/organizations", label: "Organizations", icon: <Building2 className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/admin/ai-settings", label: "AI Settings", icon: <Bot className="h-4 w-4" /> },
  { href: "/admin/templates", label: "Templates", icon: <FileText className="h-4 w-4" /> },
  { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: <ScrollText className="h-4 w-4" /> },
  { href: "/admin/compliance", label: "Compliance", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar
        title="Platform Admin"
        subtitle="Control Center"
        items={navItems}
      />
      <div className="flex flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
