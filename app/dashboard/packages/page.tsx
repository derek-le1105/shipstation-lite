import { PackageManager } from "@/components/dashboard/package-manager";
import { SiteHeaderSidebarTrigger } from "@/components/site-header-sidebar-trigger";
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
        <div className="flex items-center gap-2 h-6">
          <SiteHeaderSidebarTrigger />
          <span className="flex items-center font-semibold">Packages</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your saved packages.
        </p>
        <PackageManager packages={packages} />
      </section>
    </div>
  );
}
