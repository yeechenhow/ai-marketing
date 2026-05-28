import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { redirect } from "next/navigation";

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const conversations = await db.conversation.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      prospect: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Unified Inbox"
        description="WhatsApp, Messenger, and web chat conversations"
      />

      {conversations.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {conversations.map((conv) => {
              const lastMsg = conv.messages[0];
              const name =
                [conv.prospect.firstName, conv.prospect.lastName].filter(Boolean).join(" ") ||
                conv.prospect.email ||
                "Unknown";

              return (
                <li key={conv.id}>
                  <Link
                    href={`/dashboard/inbox/${conv.id}`}
                    className="flex items-start gap-4 px-4 py-4 hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-slate-900">{name}</p>
                        {conv.lastMessageAt && (
                          <span className="shrink-0 text-xs text-slate-400">
                            {formatDistanceToNow(conv.lastMessageAt, { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {conv.channel.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={
                            conv.status === "OPEN"
                              ? "success"
                              : conv.status === "ESCALATED"
                                ? "warning"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {conv.status}
                        </Badge>
                      </div>
                      {lastMsg && (
                        <p className="mt-1 truncate text-sm text-slate-500">{lastMsg.content}</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No conversations yet. Demo threads appear after running{" "}
            <code className="rounded bg-slate-100 px-1">npm run db:seed</code>, or start one from
            a prospect profile.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
