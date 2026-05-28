import { requireOrgSession } from "@/lib/org";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const integrations = [
  {
    name: "Meta Business Suite",
    category: "Messaging",
    description: "WhatsApp Business API and Facebook Messenger",
    status: "available" as const,
  },
  {
    name: "Google Calendar",
    category: "Scheduling",
    description: "Sync meetings and booking reminders",
    status: "coming_soon" as const,
  },
  {
    name: "Stripe",
    category: "Payments",
    description: "Quotes, invoices, and payment links",
    status: "coming_soon" as const,
  },
  {
    name: "Zapier / Webhooks",
    category: "Automation",
    description: "Custom webhook endpoints and third-party triggers",
    status: "available" as const,
  },
  {
    name: "HubSpot / Salesforce",
    category: "CRM Sync",
    description: "Import/export contacts and deal sync",
    status: "coming_soon" as const,
  },
  {
    name: "Landing Page Builder",
    category: "Lead Capture",
    description: "Campaign pages with click-to-WhatsApp CTAs",
    status: "coming_soon" as const,
  },
];

export default async function OrgIntegrationsPage() {
  await requireOrgSession();

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect external services, webhooks, and data sources"
        actions={
          <Button asChild>
            <Link href="/org/channels">Manage Webhooks</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((item) => (
          <Card key={item.name}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <Badge variant="secondary">{item.category}</Badge>
                <Badge
                  variant={item.status === "available" ? "success" : "secondary"}
                >
                  {item.status === "available" ? "Available" : "Coming soon"}
                </Badge>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
              {item.status === "available" ? (
                <Button variant="default" size="sm" className="mt-4" asChild>
                  <Link
                    href={
                      item.name === "Meta Business Suite"
                        ? "/org/onboarding-settings"
                        : item.name === "Zapier / Webhooks"
                          ? "/org/campaigns"
                          : "/org/channels"
                    }
                  >
                    {item.name === "Zapier / Webhooks" ? "View campaigns" : "Configure"}
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="mt-4" disabled>
                  Notify me
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
