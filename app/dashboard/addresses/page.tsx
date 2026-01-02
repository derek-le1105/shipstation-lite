import { redirect } from "next/navigation";

import { AddressManager } from "@/components/dashboard/address-manager";
import { getCurrentProfile } from "@/lib/auth";
import { listUserAddresses } from "@/lib/supabase/addresses";
import { SiteHeaderSidebarTrigger } from "@/components/site-header-sidebar-trigger";

export const metadata = {
  title: "UNS Shipping Manager - Addresses",
};

export default async function AddressPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const [shipToAddresses] = await Promise.all([listUserAddresses(profile.id)]);

  return (
    <div className="space-y-2">
      <section className="space-y-2">
        <div className="flex items-center gap-2 h-6">
          <SiteHeaderSidebarTrigger />
          <span className="flex items-center font-semibold">Address Book</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your saved ship-to locations.
        </p>
      </section>

      <AddressManager shipTo={shipToAddresses} />
    </div>
  );
}
