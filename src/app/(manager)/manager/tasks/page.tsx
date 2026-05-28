import { requireManagerSession, getTeamAgentIds } from "@/lib/manager";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { prospectDisplayName } from "@/lib/utils";
import { formatDistanceToNow, isPast } from "date-fns";

export default async function ManagerTasksPage() {
  const { organization } = await requireManagerSession();
  const agentIds = await getTeamAgentIds(organization.id);

  const tasks = await db.task.findMany({
    where: {
      assigneeId: { in: agentIds },
      status: { in: ["TODO", "IN_PROGRESS"] },
      prospect: { organizationId: organization.id },
    },
    include: {
      assignee: true,
      prospect: true,
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
  });

  const overdue = tasks.filter((t) => t.dueAt && isPast(t.dueAt));

  return (
    <div>
      <PageHeader
        title="Team Tasks & Follow-ups"
        description="Monitor SLA compliance and overdue follow-ups across agents"
      />

      {overdue.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>{overdue.length} overdue</strong> of {tasks.length} open tasks
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((t) => {
          const isOverdue = t.dueAt && isPast(t.dueAt);
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-xl border bg-white p-4 ${
                isOverdue ? "border-red-200" : "border-slate-200"
              }`}
            >
              <div>
                <p className="font-medium text-slate-900">{t.title}</p>
                <p className="text-sm text-slate-500">
                  {t.assignee?.name ?? "Unassigned"}
                  {t.prospect && (
                    <>
                      {" "}
                      ·{" "}
                      {prospectDisplayName(
                        t.prospect.firstName,
                        t.prospect.lastName,
                        t.prospect.email,
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={t.priority === "URGENT" ? "destructive" : "secondary"}>
                  {t.priority}
                </Badge>
                {t.dueAt && (
                  <span
                    className={`text-xs ${isOverdue ? "font-medium text-red-600" : "text-slate-500"}`}
                  >
                    {isOverdue ? "Overdue · " : ""}
                    {formatDistanceToNow(t.dueAt, { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <p className="text-center text-sm text-slate-500">No open team tasks.</p>
        )}
      </div>
    </div>
  );
}
