import { requireOrgSession } from "@/lib/org";
import { OrgSidebar } from "@/components/layout/org-sidebar";
import { PortalHeader } from "@/components/layout/portal-header";
import {
  LayoutDashboard,
  Users,
  Radio,
  Kanban,
  Megaphone,
  Bot,
  FileText,
  BarChart3,
  Plug,
  Settings,
  Sparkles,
  UserPlus,
} from "lucide-react";

const navItems = [
  { href: "/org", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/org/team", label: "Team", icon: <Users className="h-4 w-4" /> },
  { href: "/org/channels", label: "Channels", icon: <Radio className="h-4 w-4" /> },
  { href: "/org/pipelines", label: "Pipelines", icon: <Kanban className="h-4 w-4" /> },
  { href: "/org/campaigns", label: "Campaigns", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/org/prospects", label: "Prospects", icon: <UserPlus className="h-4 w-4" /> },
  { href: "/org/onboarding-settings", label: "Onboarding", icon: <Plug className="h-4 w-4" /> },
  { href: "/org/ai-agents", label: "AI Agents", icon: <Bot className="h-4 w-4" /> },
  { href: "/org/ai-settings", label: "AI Settings", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/org/templates", label: "Templates", icon: <FileText className="h-4 w-4" /> },
  { href: "/org/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/org/integrations", label: "Integrations", icon: <Plug className="h-4 w-4" /> },
  { href: "/org/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOrgSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <OrgSidebar
        title="Company Admin"
        subtitle="AI Sales OS"
        items={navItems}
      />
      <div className="flex flex-1 flex-col">
        <PortalHeader portalLabel="Company Admin Portal" showAgentLink />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
