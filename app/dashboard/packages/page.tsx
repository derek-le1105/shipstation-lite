import { PackageManager } from "@/components/dashboard/package-manager";
import { getCurrentProfile } from "@/lib/auth";
import { listPackages } from "@/lib/supabase/packages";
import { redirect } from "next/navigation";

export default async function PackagesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  const packages = await listPackages(profile.id);
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
        <p className="text-sm text-muted-foreground">
          Manage your saved packages. Updates here are available when you create
          future labels.
        </p>
        <PackageManager packages={packages} />
      </section>
    </div>
  );
}
