import { PageHeader } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Team, channels, and automation preferences" />
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Organization settings, channel integrations, and template library — coming in Sprint Cluster 2–5.
        </CardContent>
      </Card>
    </div>
  );
}
