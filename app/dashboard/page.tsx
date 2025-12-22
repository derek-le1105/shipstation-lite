import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";
import { listUserAddresses } from "@/lib/supabase/addresses";
import { listCarriers } from "@/lib/shipstation/client";
import {
  type ShipStationCarrier,
  type ShipStationService,
} from "@/lib/shipstation/types";
import { FEDEX_SERVICES } from "@/lib/shipstation/fedex";
import { listPackages } from "@/lib/supabase/packages";
import { getNextOrderNumber } from "@/lib/supabase/shipping-labels";
import CreateLabelWizard from "@/components/shipping/create-label-wizard";

type CarrierMetadata = {
  carrier: ShipStationCarrier | null;
  services: ShipStationService[];
};

export const metadata = {
  title: "UNS Shipping Manager - Dashboard",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }
  const [savedFromAddresses, savedToAddresses, savedPackages, nextOrderNumber] =
    await Promise.all([
      listUserAddresses(profile.id, "ship_from"),
      listUserAddresses(profile.id, "ship_to"),
      listPackages(profile.id),
      getNextOrderNumber(),
    ]);

  let carriers: ShipStationCarrier[] = [];
  let metadata: CarrierMetadata = {
    carrier: null,
    services: [],
  };
  let carrierError: string | null = null;

  try {
    carriers = await listCarriers();

    if (carriers.length > 0) {
      const carrier = carriers[0]!;
      const services = FEDEX_SERVICES;
      metadata = {
        carrier,
        services,
      };
    }
  } catch (error) {
    carrierError =
      error instanceof Error
        ? error.message
        : "Unable to load carrier details. Verify your ShipStation API keys.";
  }
  return (
    <div className="space-y-10">
      <CreateLabelWizard
        fromAddresses={savedFromAddresses}
        toAddresses={savedToAddresses}
        carriers={carriers}
        services={metadata.services}
        packages={savedPackages}
      />
    </div>
  );
}
