import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const providers = [
  { id: "openai", name: "OpenAI", models: "GPT-4o, GPT-4o-mini", status: "available" },
  { id: "anthropic", name: "Anthropic", models: "Claude 3.5 Sonnet", status: "available" },
  { id: "google", name: "Google AI", models: "Gemini Pro", status: "coming_soon" },
];

export default function AdminAISettingsPage() {
  return (
    <div>
      <PageHeader
        title="AI Configuration"
        description="Platform-wide LLM providers, defaults, and safety policies"
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {p.name}
                <Badge variant={p.status === "available" ? "success" : "secondary"}>
                  {p.status === "available" ? "Available" : "Coming soon"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{p.models}</p>
              <Button variant="outline" size="sm" className="mt-4" disabled={p.status !== "available"}>
                Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default Platform Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SettingRow label="Default provider" value="Not set" />
            <SettingRow label="Default model" value="—" />
            <SettingRow label="Max tokens per request" value="4,096" />
            <SettingRow label="Confidence threshold" value="0.75" />
            <SettingRow label="Human approval for offers" value="Required" />
            <SettingRow label="Knowledge-grounded responses" value="Enabled" />
            <Button variant="outline" size="sm" className="mt-2">
              Save defaults
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety & Compliance Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Block legal/financial claims without human review</p>
            <p>Log all prompt and response pairs for audit</p>
            <p>Enforce tenant-level AI token quotas</p>
            <p>Disallow PII in training data exports</p>
            <p>Rate-limit AI calls per tenant</p>
            <Button variant="outline" size="sm" className="mt-4">
              Edit policies
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
