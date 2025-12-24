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
import CreateLabelWizard from "@/components/shipping/create-label-wizard";
import { fetchProfileWarehouseRecord } from "@/lib/supabase/warehouses";
import { CreateLabelForm } from "@/components/shipping/create-label-form";

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
  const [savedToAddresses, savedPackages, shipFrom] = await Promise.all([
    listUserAddresses(profile.id),
    listPackages(profile.id),
    fetchProfileWarehouseRecord(profile),
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
      {/* <CreateLabelForm
        shipFrom={shipFrom}
        toAddresses={savedToAddresses}
        carriers={carriers}
        services={metadata.services}
        packages={savedPackages}
      /> */}
      <CreateLabelWizard
        shipFrom={shipFrom}
        toAddresses={savedToAddresses}
        carriers={carriers}
        services={metadata.services}
        packages={savedPackages}
      />
    </div>
  );
}
