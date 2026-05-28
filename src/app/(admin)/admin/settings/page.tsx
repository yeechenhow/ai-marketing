import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Platform Settings"
        description="Global configuration, feature flags, and maintenance"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SettingRow label="Platform name" value="AI Sales OS" />
            <SettingRow label="Support email" value="support@example.com" />
            <SettingRow label="Default timezone" value="UTC" />
            <SettingRow label="Maintenance mode" value={<Badge variant="success">Off</Badge>} />
            <Button variant="outline" size="sm">
              Edit general settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FeatureFlag name="AI digital agents" enabled />
            <FeatureFlag name="Workflow builder" enabled={false} />
            <FeatureFlag name="Campaign automation" enabled={false} />
            <FeatureFlag name="Offline agent module" enabled={false} />
            <FeatureFlag name="Voice note transcription" enabled={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Quotas (New Tenants)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SettingRow label="Agent seats (Starter)" value="5" />
            <SettingRow label="AI agent seats (Starter)" value="1" />
            <SettingRow label="Message credits/mo" value="5,000" />
            <SettingRow label="AI tokens/mo" value="500,000" />
            <SettingRow label="Storage" value="1 GB" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations (Platform)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>Meta Business API — app credentials</p>
            <p>Email provider (SendGrid / Resend)</p>
            <p>Payment gateway (Stripe)</p>
            <p>Webhook signing secret</p>
            <Button variant="outline" size="sm" className="mt-2">
              Manage integrations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function FeatureFlag({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{name}</span>
      <Badge variant={enabled ? "success" : "secondary"}>
        {enabled ? "Enabled" : "Disabled"}
      </Badge>
    </div>
  );
}
