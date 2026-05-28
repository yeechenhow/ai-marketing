import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { CompleteTaskButton } from "@/components/prospects/complete-task-button";
import { formatDistanceToNow, isPast } from "date-fns";
import Link from "next/link";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const tasks = await db.task.findMany({
    where: {
      prospect: { organizationId: session.user.organizationId },
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    include: { prospect: true, assignee: true },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Tasks & Reminders"
        description="Follow-ups, SLAs, and AI-created tasks"
      />
      <div className="space-y-3">
        {tasks.map((t) => {
          const overdue = t.dueAt && isPast(t.dueAt);
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-xl border bg-white p-4 ${
                overdue ? "border-red-200" : "border-slate-200"
              }`}
            >
              <div>
                <p className="font-medium text-slate-900">{t.title}</p>
                <p className="text-sm text-slate-500">
                  {t.prospect ? (
                    <Link
                      href={`/dashboard/prospects/${t.prospect.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {[t.prospect.firstName, t.prospect.lastName].filter(Boolean).join(" ")}
                    </Link>
                  ) : (
                    "General task"
                  )}
                  {t.assignee && ` · ${t.assignee.name}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={t.priority === "URGENT" ? "destructive" : "secondary"}>
                  {t.priority}
                </Badge>
                {t.dueAt && (
                  <span
                    className={`text-xs ${overdue ? "font-medium text-red-600" : "text-slate-500"}`}
                  >
                    {formatDistanceToNow(t.dueAt, { addSuffix: true })}
                  </span>
                )}
                <CompleteTaskButton taskId={t.id} />
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <p className="text-center text-sm text-slate-500">No open tasks.</p>
        )}
      </div>
    </div>
  );
}
