import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LIFECYCLE_STAGE_LABELS, LIFECYCLE_STAGE_COLORS } from "@/lib/constants";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const orgId = session.user.organizationId;
  const isAgent = session.user.orgRole === "AGENT";

  const [prospectCount, openTasks, openConversations, recentProspects, recentActivities] =
    await Promise.all([
      db.prospect.count({
        where: {
          organizationId: orgId,
          ...(isAgent ? { assignedToId: session.user.id } : {}),
        },
      }),
      db.task.count({
        where: {
          status: { in: ["TODO", "IN_PROGRESS"] },
          ...(isAgent ? { assigneeId: session.user.id } : {}),
          prospect: { organizationId: orgId },
        },
      }),
      db.conversation.count({
        where: {
          organizationId: orgId,
          status: { in: ["OPEN", "PENDING", "ESCALATED"] },
        },
      }),
      db.prospect.findMany({
        where: {
          organizationId: orgId,
          ...(isAgent ? { assignedToId: session.user.id } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { leadScore: true },
      }),
      db.activity.findMany({
        where: { prospect: { organizationId: orgId } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { prospect: true, user: true },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="My Dashboard"
        description="Pipeline overview, tasks, and recent activity"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Prospects" value={prospectCount} />
        <StatCard label="Open Tasks" value={openTasks} hint="Due follow-ups" />
        <StatCard label="Active Conversations" value={openConversations} />
        <StatCard label="AI Assist" value="Ready" hint="Phase 1 — suggestions enabled" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Prospects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProspects.length === 0 ? (
              <p className="text-sm text-slate-500">No prospects yet.</p>
            ) : (
              recentProspects.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/prospects/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {prospectDisplayName(p.firstName, p.lastName, p.email, p.phone)}
                    </p>
                    <p className="text-xs text-slate-500">{p.source.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.leadScore && (
                      <span className="text-xs font-medium text-indigo-600">
                        {Math.round(p.leadScore.conversionProb * 100)}% fit
                      </span>
                    )}
                    <Badge className={LIFECYCLE_STAGE_COLORS[p.lifecycleStage]}>
                      {LIFECYCLE_STAGE_LABELS[p.lifecycleStage]}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              recentActivities.map((a) => (
                <div
                  key={a.id}
                  className="border-l-2 border-indigo-200 pl-3"
                >
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {prospectDisplayName(
                      a.prospect.firstName,
                      a.prospect.lastName,
                      a.prospect.email,
                    )}{" "}
                    · {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
