import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateProfileButton } from "@/components/prospects/generate-profile-button";
import { prospectDisplayName } from "@/lib/utils";
import Link from "next/link";

export default async function AIInsightsPage() {
  const session = await auth();
  if (!session?.user.organizationId) redirect("/login");

  const orgId = session.user.organizationId;

  const [prospects, recommendationCount, profileCount] = await Promise.all([
    db.prospect.findMany({
      where: { organizationId: orgId },
      include: {
        personalityProfile: true,
        leadScore: true,
        recommendations: { where: { isApplied: false }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.recommendation.count({
      where: { prospect: { organizationId: orgId }, isApplied: false },
    }),
    db.personalityProfile.count({
      where: { prospect: { organizationId: orgId } },
    }),
  ]);

  const withoutProfile = prospects.filter((p) => !p.personalityProfile);

  return (
    <div>
      <PageHeader
        title="AI Insights"
        description="Personality profiles, lead scores, and next-best-actions powered by your org LLM"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Profiles generated</p>
          <p className="text-2xl font-bold">{profileCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending recommendations</p>
          <p className="text-2xl font-bold">{recommendationCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Needs profiling</p>
          <p className="text-2xl font-bold">{withoutProfile.length}</p>
        </div>
      </div>

      {withoutProfile.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Prospects without AI profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {withoutProfile.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <Link
                  href={`/dashboard/prospects/${p.id}`}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  {prospectDisplayName(p.firstName, p.lastName, p.email, p.phone)}
                </Link>
                <GenerateProfileButton prospectId={p.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All prospect profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {prospects.length === 0 ? (
            <p className="text-sm text-slate-500">
              No prospects yet.{" "}
              <Link href="/dashboard/prospects/new" className="text-indigo-600 hover:underline">
                Add one
              </Link>
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Prospect</th>
                    <th className="px-4 py-3">Persona</th>
                    <th className="px-4 py-3">Readiness</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/prospects/${p.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {prospectDisplayName(p.firstName, p.lastName, p.email, p.phone)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {p.personalityProfile?.personaType?.replace(/-/g, " ") ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {p.personalityProfile ? (
                          <Badge variant="secondary">
                            {p.personalityProfile.dealReadiness.replace("_", " ")}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.leadScore
                          ? `${Math.round(p.leadScore.conversionProb * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.recommendations[0]?.action ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
