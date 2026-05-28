import { requireManagerSession } from "@/lib/manager";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { prospectDisplayName } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default async function ManagerConversationsPage() {
  const { organization } = await requireManagerSession();

  const conversations = await db.conversation.findMany({
    where: { organizationId: organization.id },
    include: {
      prospect: { include: { assignedTo: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const escalated = conversations.filter((c) => c.status === "ESCALATED").length;
  const aiHandled = conversations.filter((c) => c.aiHandled).length;

  return (
    <div>
      <PageHeader
        title="Conversation Quality"
        description="Review team conversations, escalations, and AI handoffs"
      />

      <div className="mb-6 flex gap-4 text-sm">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
          <span className="text-slate-500">Total tracked:</span>{" "}
          <span className="font-semibold">{conversations.length}</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
          <span className="text-slate-500">Escalated:</span>{" "}
          <span className="font-semibold text-red-600">{escalated}</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
          <span className="text-slate-500">AI-handled:</span>{" "}
          <span className="font-semibold">{aiHandled}</span>
        </div>
      </div>

      {conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {prospectDisplayName(
                      c.prospect.firstName,
                      c.prospect.lastName,
                      c.prospect.email,
                      c.prospect.phone,
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.prospect.assignedTo?.name ?? "Unassigned"} · {c.channel}
                  </p>
                  {c.messages[0] && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {c.messages[0].content}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge
                    variant={
                      c.status === "ESCALATED"
                        ? "destructive"
                        : c.status === "OPEN"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {c.status}
                  </Badge>
                  {c.aiHandled && <Badge variant="secondary">AI</Badge>}
                  {c.lastMessageAt && (
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(c.lastMessageAt, { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="font-medium text-slate-900">No conversations yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Conversations appear here once messaging channels are connected.
          </p>
        </div>
      )}
    </div>
  );
}
