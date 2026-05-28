import { requireOrgSession } from "@/lib/org";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import type { ReactNode } from "react";

export default async function OrgSettingsPage() {
  const { organization } = await requireOrgSession();

  return (
    <div>
      <PageHeader
        title="Organization Settings"
        description="Workspace configuration, quotas, and preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Organization name" value={organization.name} />
            <SettingRow label="Slug" value={organization.slug} />
            <SettingRow label="Plan" value={organization.plan} />
            <SettingRow
              label="Status"
              value={
                <Badge variant={organization.isActive ? "success" : "destructive"}>
                  {organization.isActive ? "Active" : "Suspended"}
                </Badge>
              }
            />
            <SettingRow
              label="Created"
              value={formatDistanceToNow(organization.createdAt, { addSuffix: true })}
            />
            <Button variant="outline" size="sm">
              Edit workspace
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotas & Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Agent seats" value="Unlimited (Growth plan)" />
            <SettingRow label="AI agent seats" value="3 included" />
            <SettingRow label="Message credits" value="10,000 / month" />
            <SettingRow label="AI tokens" value="500K / month" />
            <SettingRow label="Storage" value="5 GB" />
            <Button variant="outline" size="sm">
              Upgrade plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>Require template approval before outbound WhatsApp messages</p>
            <p>Enforce 24-hour customer service window rules</p>
            <p>Track marketing consent per prospect</p>
            <p>Data retention: 24 months (configurable)</p>
            <Button variant="outline" size="sm" className="mt-2">
              Compliance settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <SettingRow label="Default LLM" value="Not configured" />
            <SettingRow label="Confidence threshold" value="0.75" />
            <SettingRow label="Human approval for offers" value="Enabled" />
            <Button variant="outline" size="sm" className="mt-2">
              AI settings
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
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
