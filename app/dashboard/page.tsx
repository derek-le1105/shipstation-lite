import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { listUserAddresses } from "@/lib/supabase/addresses";
import { listCarriers } from "@/lib/shipstation/client";
import {
  type ShipStationCarrier,
  type ShipStationService,
} from "@/lib/shipstation/types";
import { CreateLabelForm } from "@/components/shipping/create-label-form";
import { FEDEX_SERVICES } from "@/lib/shipstation/fedex";
import { listPackages } from "@/lib/supabase/packages";
import { getNextOrderNumber } from "@/lib/supabase/shipping-labels";

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
      <section className="grid md:grid-cols-[2fr_1fr] gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Create a shipping label
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateLabelForm
              fromAddresses={savedFromAddresses}
              toAddresses={savedToAddresses}
              carriers={carriers}
              services={metadata.services}
              packages={savedPackages}
              nextOrderNumber={nextOrderNumber}
            />
            {carrierError ? (
              <div className="mt-4 flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle size={16} />
                {carrierError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
