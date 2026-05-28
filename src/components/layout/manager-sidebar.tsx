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

export function ManagerSidebar({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-amber-950 text-white">
      <div className="border-b border-amber-900 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          {subtitle}
        </p>
        <h1 className="mt-1 text-lg font-bold">{title}</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/manager" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-600 text-white"
                  : "text-amber-100/80 hover:bg-amber-900 hover:text-white",
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
