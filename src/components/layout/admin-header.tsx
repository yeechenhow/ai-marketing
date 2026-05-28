import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export async function AdminHeader() {
  const session = await auth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3 text-sm">
        <Shield className="h-4 w-4 text-violet-600" />
        <div>
          <span className="font-medium text-slate-900">AI Sales OS Platform</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-slate-500">Super Admin</span>
        </div>
        <span className="rounded bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
          SUPER_ADMIN
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-slate-500 sm:inline">
          {session?.user.name ?? session?.user.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
