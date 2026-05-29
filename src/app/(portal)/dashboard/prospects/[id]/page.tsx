import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateProfileButton } from "@/components/prospects/generate-profile-button";
import { ApplyRecommendationButton } from "@/components/prospects/apply-recommendation-button";
import { AddNoteForm, AddTaskForm } from "@/components/prospects/prospect-activity-forms";
import { CompleteTaskButton } from "@/components/prospects/complete-task-button";
import { ProspectAutomationPanel } from "@/components/prospects/prospect-automation-panel";
import { LIFECYCLE_STAGE_COLORS, LIFECYCLE_STAGE_LABELS } from "@/lib/constants";
import { prospectDisplayName } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const { id } = await params;

  const prospect = await db.prospect.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      assignedTo: true,
      company: true,
      socialIdentities: true,
      socialProfiles: true,
      enrichmentRecords: { orderBy: { createdAt: "desc" }, take: 5 },
      consentRecords: { orderBy: { recordedAt: "desc" }, take: 3 },
      activities: { orderBy: { createdAt: "desc" }, take: 20, include: { user: true } },
      tasks: { where: { status: { not: "CANCELLED" } }, orderBy: { dueAt: "asc" } },
      personalityProfile: true,
      leadScore: true,
      recommendations: { where: { isApplied: false }, orderBy: { priority: "desc" } },
      conversations: { include: { messages: { take: 1, orderBy: { createdAt: "desc" } } } },
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
        description={[
          prospect.email,
          prospect.phone ?? prospect.whatsappPhone,
          prospect.occupation,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/prospects/${id}/edit`}>Edit</Link>
            </Button>
            {!profile && <GenerateProfileButton prospectId={id} />}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge className={LIFECYCLE_STAGE_COLORS[prospect.lifecycleStage]}>
          {LIFECYCLE_STAGE_LABELS[prospect.lifecycleStage]}
        </Badge>
        {prospect.registrationCompletedAt && (
          <Badge variant="success">Customer 360 registered</Badge>
        )}
        {prospect.whatsappPhone && (
          <Badge variant="secondary">WhatsApp onboarding</Badge>
        )}
        {prospect.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
            </CardHeader>
            <CardContent>
              <AddNoteForm prospectId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prospect.activities.map((a) => (
                <div key={a.id} className="border-l-2 border-indigo-200 pl-4">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  {a.body && <p className="text-sm text-slate-600">{a.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {a.user?.name ?? "System"} ·{" "}
                    {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                  </p>
                </div>
              ))}
              {prospect.activities.length === 0 && (
                <p className="text-sm text-slate-500">No activity recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ProspectAutomationPanel
            prospectId={id}
            organizationId={session.user.organizationId}
            workflowBuilderPrefix="/org/workflows"
          />

          <Card>
            <CardHeader>
              <CardTitle>Customer 360</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ProfileRow label="WhatsApp name" value={prospect.whatsappName} />
              <ProfileRow label="WhatsApp phone" value={prospect.whatsappPhone} />
              <ProfileRow
                label="Registration"
                value={
                  prospect.registrationCompletedAt
                    ? formatDistanceToNow(prospect.registrationCompletedAt, { addSuffix: true })
                    : "Pending — user has not completed OAuth"
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
                <div className="border-t border-slate-100 pt-3">
                  <ScoreBar label="Urgency" value={profile.urgencyScore} />
                  <ScoreBar label="Trust" value={profile.trustScore} />
                  <ScoreBar label="Budget sensitivity" value={profile.budgetSensitivity} />
                  <ScoreBar label="AI confidence" value={profile.confidenceScore} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AI Personality Profile</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-slate-500">
                  No profile yet. Generate one from this prospect&apos;s data.
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
                <ScoreBar label="Profile fit" value={score.profileFitScore} />
                <ScoreBar label="Intent" value={score.intentScore} />
                <ScoreBar label="Engagement" value={score.engagementScore} />
                <ScoreBar label="Conversion probability" value={score.conversionProb} highlight />
                <ScoreBar label="Churn risk" value={score.churnRiskScore} danger />
              </CardContent>
            </Card>
          )}

          {prospect.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Next Best Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prospect.recommendations.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-indigo-100 bg-indigo-50 p-3"
                  >
                    <p className="text-sm font-medium text-indigo-900">{r.action}</p>
                    {r.reason && (
                      <p className="mt-1 text-xs text-indigo-700">{r.reason}</p>
                    )}
                    <div className="mt-2">
                      <ApplyRecommendationButton recommendationId={r.id} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Open Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddTaskForm prospectId={id} />
              <div className="border-t border-slate-100 pt-4 space-y-3">
                {prospect.tasks.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      {t.dueAt && (
                        <p className="text-xs text-slate-500">
                          Due {formatDistanceToNow(t.dueAt, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <CompleteTaskButton taskId={t.id} />
                  </div>
                ))}
                {prospect.tasks.length === 0 && (
                  <p className="text-sm text-slate-500">No open tasks.</p>
                )}
              </div>
            </CardContent>
          </Card>
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
      <span className="font-medium capitalize text-slate-900">{value.replace(/-/g, " ")}</span>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  const pct = Math.round(value * 100);
  const color = danger
    ? "bg-red-500"
    : highlight
      ? "bg-emerald-500"
      : "bg-indigo-500";

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
