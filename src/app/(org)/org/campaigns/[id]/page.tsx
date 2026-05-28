import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildCampaignWebhookUrl,
  isWhatsAppOnboardingConfig,
} from "@/lib/onboarding/campaign-config";
import { buildWhatsAppOnboardingQrUrl } from "@/lib/onboarding/qr-link";
import { getAppBaseUrl } from "@/lib/onboarding/config";
import { LaunchCampaignButton } from "@/components/org/launch-campaign-button";
import { TestOnboardingButton } from "@/components/org/test-onboarding-button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { notFound } from "next/navigation";

export default async function OrgCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrgSession();

  const campaign = await db.campaign.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!campaign) notFound();

  const baseUrl = getAppBaseUrl();
  const isOnboarding = isWhatsAppOnboardingConfig(campaign.config);
  const onboardingConfig = isOnboarding
    ? (campaign.config as import("@/lib/onboarding/campaign-config").WhatsAppOnboardingCampaignConfig)
    : null;
  const webhookUrl = onboardingConfig
    ? buildCampaignWebhookUrl(baseUrl, organization.slug, campaign.id)
    : null;
  const qrUrl =
    onboardingConfig?.businessPhone
      ? buildWhatsAppOnboardingQrUrl({
          businessPhone: onboardingConfig.businessPhone,
          prefilledMessage: onboardingConfig.prefilledMessage,
        })
      : null;

  const simulateCurl = webhookUrl && onboardingConfig
    ? `curl -s -X POST http://localhost:3000/api/dev/simulate-whatsapp \\
  -H "Content-Type: application/json" \\
  -d '{"orgSlug":"${organization.slug}","campaignId":"${campaign.id}","from":"6591234567","profileName":"Test User","messageBody":"${onboardingConfig.prefilledMessage.replace(/"/g, '\\"')}"}'`
    : null;

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={campaign.description ?? "Campaign details"}
        actions={
          <Button variant="outline" asChild>
            <Link href="/org/campaigns">Back to campaigns</Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{campaign.status}</Badge>
        {isOnboarding && <Badge variant="success">WhatsApp onboarding hook</Badge>}
        <span className="text-sm text-slate-500">
          Created {formatDistanceToNow(campaign.createdAt, { addSuffix: true })}
        </span>
      </div>

      {isOnboarding ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meta webhook (this org)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1 text-slate-500">Callback URL</p>
                <code className="block overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-300">
                  {webhookUrl}
                </code>
                <p className="mt-2 text-xs text-slate-500">
                  Paste this in Meta → WhatsApp → Configuration → Webhook. Each org/campaign
                  gets its own URL.
                </p>
              </div>
              <div>
                <p className="mb-1 text-slate-500">Verify token</p>
                <code className="block rounded-lg bg-slate-100 p-3 text-xs text-slate-800">
                  {onboardingConfig?.webhookVerifyToken}
                </code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">QR & prefilled message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1 text-slate-500">Prefilled message</p>
                <p className="rounded-lg bg-slate-50 p-3 text-slate-800">
                  {onboardingConfig?.prefilledMessage}
                </p>
              </div>
              {qrUrl ? (
                <div>
                  <p className="mb-1 text-slate-500">WhatsApp QR link (wa.me)</p>
                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block break-all text-indigo-600 hover:underline"
                  >
                    {qrUrl}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-amber-700">
                  Add a business phone number on campaign create to generate the wa.me QR link.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Test on localhost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                Make sure <code className="rounded bg-slate-100 px-1">npm run dev</code> is
                running, then click the button below. This simulates someone sending your WhatsApp
                message — no Terminal or curl required.
              </p>
              <p className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-900">
                After <strong>Test now</strong>, use the green <strong>View Customer 360</strong>{" "}
                button — or open <strong>Prospects</strong> in the left sidebar.
              </p>

              {onboardingConfig && (
                <TestOnboardingButton
                  orgSlug={organization.slug}
                  campaignId={campaign.id}
                  prefilledMessage={onboardingConfig.prefilledMessage}
                />
              )}

              {simulateCurl && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700">
                    Or paste this in Mac Terminal / Cursor terminal
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">
                    {simulateCurl}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <p className="text-sm text-slate-600">Standard campaign — launch when ready.</p>
            {campaign.status === "draft" && <LaunchCampaignButton campaignId={campaign.id} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
