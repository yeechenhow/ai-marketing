import { requireOrgSession } from "@/lib/org";
import { PageHeader } from "@/components/layout/shell";
import { OrgOnboardingSettingsForm } from "@/components/org/onboarding-settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getOAuthProviderStatusForOrg,
  getOAuthRedirectUris,
  getOrgOnboardingSettings,
  getPublicOnboardingSettings,
} from "@/lib/onboarding/org-settings";

export default async function OrgOnboardingSettingsPage() {
  const { organization } = await requireOrgSession();
  const settings = await getOrgOnboardingSettings(organization.id);
  const publicSettings = getPublicOnboardingSettings(settings);
  const status = await getOAuthProviderStatusForOrg(organization.id);
  const redirectUris = getOAuthRedirectUris();

  return (
    <div>
      <PageHeader
        title="Onboarding Settings"
        description="OAuth and WhatsApp credentials for QR registration campaigns — stored per organization"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status.google ? "success" : "warning"}>
              {status.google ? "Ready" : "Not configured"}
            </Badge>
            {status.googleSource && (
              <p className="mt-2 text-xs capitalize text-slate-500">Source: {status.googleSource}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facebook</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status.facebook ? "success" : "warning"}>
              {status.facebook ? "Ready" : "Not configured"}
            </Badge>
            {status.facebookSource && (
              <p className="mt-2 text-xs capitalize text-slate-500">
                Source: {status.facebookSource}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WhatsApp send</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={publicSettings.hasWhatsappAccessToken ? "success" : "warning"}>
              {publicSettings.hasWhatsappAccessToken ? "Ready" : "Not configured"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <OrgOnboardingSettingsForm
        {...publicSettings}
        redirectUris={redirectUris}
      />
    </div>
  );
}
