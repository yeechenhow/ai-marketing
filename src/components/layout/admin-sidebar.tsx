"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export function AdminSidebar({
  title,
  subtitle,
  items,
  basePath = "/admin",
}: {
  title: string;
  subtitle?: string;
  items: NavItem[];
  basePath?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white">
      <div className="border-b border-slate-800 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
          {subtitle}
        </p>
        <h1 className="mt-1 text-lg font-bold">{title}</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== basePath && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-violet-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
