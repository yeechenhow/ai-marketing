import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReplyForm } from "@/components/inbox/reply-form";
import { ConversationActions } from "@/components/inbox/conversation-actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";

export default async function InboxThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const conversation = await db.conversation.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      prospect: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  const name =
    [conversation.prospect.firstName, conversation.prospect.lastName]
      .filter(Boolean)
      .join(" ") ||
    conversation.prospect.email ||
    "Unknown";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title={name}
        description={`${conversation.channel.replace("_", " ")} · ${conversation.prospect.email ?? conversation.prospect.phone ?? "No contact"}`}
        actions={
          <div className="flex items-center gap-2">
            <ConversationActions conversationId={conversation.id} status={conversation.status} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/prospects/${conversation.prospectId}`}>View prospect</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/inbox">Back to inbox</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex gap-2">
        <Badge variant="secondary">{conversation.channel.replace("_", " ")}</Badge>
        <Badge
          variant={
            conversation.status === "OPEN"
              ? "success"
              : conversation.status === "ESCALATED"
                ? "warning"
                : "secondary"
          }
        >
          {conversation.status}
        </Badge>
        {conversation.aiHandled && <Badge variant="secondary">AI handled</Badge>}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  msg.direction === "OUTBOUND"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`mt-1 text-xs ${
                    msg.direction === "OUTBOUND" ? "text-violet-200" : "text-slate-400"
                  }`}
                >
                  {format(msg.sentAt ?? msg.createdAt, "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          ))}
          {conversation.messages.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">No messages yet.</p>
          )}
        </div>
        {conversation.status !== "RESOLVED" && <ReplyForm conversationId={conversation.id} />}
      </div>
    </div>
  );
}
