import { requireManagerSession } from "@/lib/manager";
import { ManagerSidebar } from "@/components/layout/manager-sidebar";
import { ManagerHeader } from "@/components/layout/manager-header";
import {
  LayoutDashboard,
  Kanban,
  Trophy,
  MessageSquare,
  Lightbulb,
  CheckSquare,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/manager", label: "Team Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/manager/pipeline", label: "Team Pipeline", icon: <Kanban className="h-4 w-4" /> },
  { href: "/manager/agents", label: "Leaderboard", icon: <Trophy className="h-4 w-4" /> },
  { href: "/manager/conversations", label: "Conversations", icon: <MessageSquare className="h-4 w-4" /> },
  { href: "/manager/coaching", label: "Coaching", icon: <Lightbulb className="h-4 w-4" /> },
  { href: "/manager/tasks", label: "Team Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  { href: "/manager/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
];

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireManagerSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ManagerSidebar
        title="Manager Portal"
        subtitle="AI Sales OS"
        items={navItems}
      />
      <div className="flex flex-1 flex-col bg-slate-50">
        <ManagerHeader />
        <main className="flex-1 overflow-auto bg-slate-50 p-8">{children}</main>
      </div>
    </div>
  );
}
