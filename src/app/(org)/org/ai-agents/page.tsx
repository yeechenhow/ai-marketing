import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleAgentButton } from "@/components/org/toggle-agent-button";
import Link from "next/link";

export default async function OrgAIAgentsPage() {
  const { organization } = await requireOrgSession();

  const agents = await db.aIAgent.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="AI Agent Setup"
        description="Configure digital sales agents — personas, escalation, and knowledge base"
        actions={
          <Button asChild>
            <Link href="/org/ai-agents/new">Create AI Agent</Link>
          </Button>
        }
      />

      {agents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                  <Badge variant={agent.isActive ? "success" : "secondary"}>
                    {agent.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    <span className="text-slate-400">Tone:</span> {agent.tone ?? "Default"}
                  </p>
                  <p>
                    <span className="text-slate-400">Language:</span> {agent.language}
                  </p>
                  {agent.persona && (
                    <p className="line-clamp-2 text-xs text-slate-500">{agent.persona}</p>
                  )}
                </div>
                <div className="mt-4">
                  <ToggleAgentButton agentId={agent.id} isActive={agent.isActive} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No AI agents configured"
          description="Set up a digital sales agent to handle inbound leads, qualify prospects, and escalate to humans."
          action={
            <Button asChild>
              <Link href="/org/ai-agents/new">Create AI Agent</Link>
            </Button>
          }
        />
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">AI Agent Capabilities</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-slate-600">
          <li>Auto-reply to inbound leads</li>
          <li>Qualification question flows</li>
          <li>FAQ and product suggestions</li>
          <li>Nurture until human handoff</li>
          <li>Escalation rule engine</li>
          <li>Policy-aware messaging (WhatsApp/Messenger)</li>
        </ul>
      </div>
    </div>
  );
}
