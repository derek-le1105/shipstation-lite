import { redirect } from "next/navigation";

import { AddressManager } from "@/components/dashboard/address-manager";
import { getCurrentProfile } from "@/lib/auth";
import { listAddresses } from "@/lib/supabase/addresses";

export const metadata = {
  title: "Manage Shipping Addresses",
};

export default async function AddressPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const [shipFromAddresses, shipToAddresses] = await Promise.all([
    listAddresses(profile.id, "ship_from"),
    listAddresses(profile.id, "ship_to"),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Address book
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your saved ship-from and ship-to locations. Updates here are
          available when you create future labels.
        </p>
      </section>

      <AddressManager
        shipFrom={shipFromAddresses}
        shipTo={shipToAddresses}
      />
    </div>
  );
}
