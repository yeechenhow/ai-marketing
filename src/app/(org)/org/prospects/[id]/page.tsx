import { requireOrgSession } from "@/lib/org";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateProfileButton } from "@/components/prospects/generate-profile-button";
import { ProspectAutomationPanel } from "@/components/prospects/prospect-automation-panel";
import { LIFECYCLE_STAGE_COLORS, LIFECYCLE_STAGE_LABELS } from "@/lib/constants";
import { prospectDisplayName } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function OrgProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await requireOrgSession();
  const { id } = await params;

  const prospect = await db.prospect.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      socialIdentities: true,
      socialProfiles: true,
      personalityProfile: true,
      leadScore: true,
      enrichmentRecords: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  if (!prospect) notFound();

  const profile = prospect.personalityProfile;
  const score = prospect.leadScore;

  return (
    <div>
      <PageHeader
        title={prospectDisplayName(
          prospect.firstName,
          prospect.lastName,
          prospect.email,
          prospect.phone,
          prospect.whatsappName,
          prospect.whatsappPhone,
        )}
        description="Customer 360 profile"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/org/prospects">← All prospects</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/prospects/${id}`}>Full CRM view</Link>
            </Button>
            {!profile && <GenerateProfileButton prospectId={id} />}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge className={LIFECYCLE_STAGE_COLORS[prospect.lifecycleStage]}>
          {LIFECYCLE_STAGE_LABELS[prospect.lifecycleStage]}
        </Badge>
        {prospect.registrationCompletedAt ? (
          <Badge variant="success">Registration complete</Badge>
        ) : prospect.whatsappPhone ? (
          <Badge variant="warning">Awaiting registration (Step 2)</Badge>
        ) : null}
      </div>

      <div className="mb-6">
        <ProspectAutomationPanel
          prospectId={id}
          organizationId={organization.id}
          workflowBuilderPrefix="/org/workflows"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer 360</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileRow label="Email" value={prospect.email} />
            <ProfileRow label="WhatsApp name" value={prospect.whatsappName} />
            <ProfileRow label="WhatsApp phone" value={prospect.whatsappPhone} />
            <ProfileRow
              label="Registration"
              value={
                prospect.registrationCompletedAt
                  ? `Completed ${formatDistanceToNow(prospect.registrationCompletedAt, { addSuffix: true })}`
                  : "Pending — open registration page and use Dev simulate sign-in"
              }
            />
            <ProfileRow label="Source" value={prospect.sourceDetail ?? prospect.source} />
            {prospect.socialIdentities.map((identity) => (
              <div key={identity.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-medium capitalize text-slate-900">
                  {identity.platformName.toLowerCase()}
                </p>
                <p className="text-xs text-slate-500">UID: {identity.platformUid}</p>
              </div>
            ))}
            {prospect.socialProfiles.map((sp) => {
              const signals = sp.signals as Record<string, unknown> | null;
              const email = signals?.email ? String(signals.email) : null;
              const name = signals?.name ? String(signals.name) : null;
              if (!email && !name) return null;
              return (
                <div key={sp.id} className="text-xs text-slate-600">
                  {email && <p>Email: {email}</p>}
                  {name && <p>Name: {name}</p>}
                </div>
              );
            })}
            {prospect.socialIdentities.length === 0 && !prospect.whatsappPhone && (
              <p className="text-slate-500">No onboarding data yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {profile ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>AI Personality Profile</CardTitle>
                <GenerateProfileButton prospectId={id} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ProfileRow label="Persona" value={profile.personaType} />
                <ProfileRow label="Decision style" value={profile.decisionStyle} />
                <ProfileRow label="Communication" value={profile.communicationPref} />
                <ProfileRow
                  label="Deal readiness"
                  value={profile.dealReadiness.replace("_", " ")}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AI Personality Profile</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-slate-500">
                  Generated automatically after registration, or click Generate below.
                </p>
                <div className="mt-4">
                  <GenerateProfileButton prospectId={id} />
                </div>
              </CardContent>
            </Card>
          )}

          {score && (
            <Card>
              <CardHeader>
                <CardTitle>Lead Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ScoreBar label="Conversion probability" value={score.conversionProb} highlight />
                <ScoreBar label="Profile fit" value={score.profileFitScore} />
                <ScoreBar label="Intent" value={score.intentScore} />
              </CardContent>
            </Card>
          )}

          {prospect.enrichmentRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent enrichment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-600">
                {prospect.enrichmentRecords.map((r) => (
                  <p key={r.id}>
                    {r.source} · {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-right text-slate-900">{value.replace(/-/g, " ")}</span>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  const pct = Math.round(value * 100);
  const color = highlight ? "bg-emerald-500" : "bg-indigo-500";

  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
