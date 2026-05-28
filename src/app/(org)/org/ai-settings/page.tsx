import { requireOrgSession } from "@/lib/org";
import { getOrgAiSettings, getPublicAiSettings, resolveAiConfig } from "@/lib/ai/settings";
import { PageHeader } from "@/components/layout/shell";
import { OrgAiSettingsForm } from "@/components/org/ai-settings-form";
import type { AiProvider } from "@/lib/ai/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrgAiSettingsPage() {
  const { organization } = await requireOrgSession();
  const orgAi = await getOrgAiSettings(organization.id);
  const publicSettings = getPublicAiSettings(orgAi);
  const resolved = await resolveAiConfig(organization.id);

  return (
    <div>
      <PageHeader
        title="AI Settings"
        description="Configure LLM provider, model, and API key for profiles, insights, and inbox suggestions"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <Badge variant={resolved ? "success" : "warning"}>
                {resolved ? "Ready" : "Not configured"}
              </Badge>
            </div>
            {resolved && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source</span>
                  <span className="font-medium capitalize">{resolved.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Provider</span>
                  <span className="font-medium capitalize">{resolved.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Model</span>
                  <span className="font-medium">{resolved.model}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Powered features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-600">
            <p>Generate AI prospect profiles</p>
            <p>AI Insights recommendations</p>
            <p>Inbox “Suggest reply” with prospect context</p>
          </CardContent>
        </Card>
      </div>

      <OrgAiSettingsForm
        provider={publicSettings.provider as AiProvider}
        model={publicSettings.model}
        hasApiKey={publicSettings.hasApiKey}
        apiKeyMask={publicSettings.apiKeyMask}
      />
    </div>
  );
}
