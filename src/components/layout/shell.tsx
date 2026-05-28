import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export function Sidebar({
  title,
  subtitle,
  items,
  activePath,
}: {
  title: string;
  subtitle?: string;
  items: NavItem[];
  activePath: string;
}) {
  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-slate-800 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          {subtitle}
        </p>
        <h1 className="mt-1 text-lg font-bold">{title}</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const active =
            activePath === item.href ||
            (item.href !== "/" && activePath.startsWith(item.href));
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
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
