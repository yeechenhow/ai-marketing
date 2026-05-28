import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterCompletePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <CardTitle className="text-2xl">Profile linked</CardTitle>
          <CardDescription>
            Your social account has been connected. We&apos;ll use your public profile data to
            personalize your messaging experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            You can return to WhatsApp — our team will follow up with tailored recommendations.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
