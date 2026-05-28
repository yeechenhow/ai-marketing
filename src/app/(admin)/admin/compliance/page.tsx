import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminCompliancePage() {
  const [consentCount, marketingConsent, auditCount, orgCount] = await Promise.all([
    db.consentRecord.count(),
    db.consentRecord.count({ where: { type: "MARKETING", granted: true } }),
    db.auditLog.count(),
    db.organization.count(),
  ]);

  return (
    <div>
      <PageHeader
        title="Compliance & Data Control"
        description="Consent tracking, retention policies, and privacy controls"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <StatCard label="Consent Records" value={consentCount} />
        <StatCard label="Marketing Opt-ins" value={marketingConsent} />
        <StatCard label="Audit Entries" value={auditCount} />
        <StatCard label="Tenants Monitored" value={orgCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Compliance Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <PolicyItem title="WhatsApp messaging rules" status="Enforced per tenant" />
            <PolicyItem title="24-hour service window" status="Engine-aware" />
            <PolicyItem title="Marketing consent required" status="Enabled" />
            <PolicyItem title="Do-not-contact suppression" status="Enabled" />
            <PolicyItem title="Data retention default" status="24 months" />
            <PolicyItem title="GDPR export/delete requests" status="Manual (Phase 2)" />
            <Button variant="outline" size="sm" className="mt-2">
              Edit platform policies
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Enrichment Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>Public data only — no uncontrolled social scraping</p>
            <p>Tenants can disable enrichment sources individually</p>
            <p>All enrichment actions logged in audit trail</p>
            <p>Explicit consent required for marketing data use</p>
            <Button variant="outline" size="sm" className="mt-2">
              Configure enrichment rules
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Consent Records</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsentList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function ConsentList() {
  const records = await db.consentRecord.findMany({
    take: 10,
    orderBy: { recordedAt: "desc" },
    include: {
      prospect: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          organizationId: true,
        },
      },
    },
  });

  if (records.length === 0) {
    return <p className="text-sm text-slate-500">No consent records yet.</p>;
  }

  return (
    <div className="space-y-2">
      {records.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm"
        >
          <span>
            {[r.prospect.firstName, r.prospect.lastName].filter(Boolean).join(" ") ||
              r.prospect.email ||
              "Unknown"}
          </span>
          <span className="text-slate-500">
            {r.type} · {r.granted ? "Granted" : "Revoked"} · {r.channel ?? "All channels"}
          </span>
        </div>
      ))}
    </div>
  );
}

function PolicyItem({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span>{title}</span>
      <span className="font-medium text-slate-900">{status}</span>
    </div>
  );
}
