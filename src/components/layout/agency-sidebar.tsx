"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Kanban,
  GitBranch,
  Megaphone,
} from "lucide-react";

const navItems = [
  { href: "/agency", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agency/clients", label: "Clients", icon: Building2 },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/org/workflows", label: "Workflows", icon: GitBranch },
  { href: "/org/campaigns", label: "Campaigns", icon: Megaphone },
];

export function AgencySidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-slate-800 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          AI Sales OS
        </p>
        <h1 className="mt-1 text-lg font-bold">Agency Portal</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/agency" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
