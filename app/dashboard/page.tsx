import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth";
import { listAddresses, type AddressRecord } from "@/lib/supabase/addresses";
import { listShippingLabelsForUser } from "@/lib/supabase/shipping-labels";
import {
  listCarriers,
  listServices,
  type ShipStationCarrier,
  type ShipStationService,
} from "@/lib/shipstation/client";
import { CreateLabelForm } from "@/components/shipping/create-label-form";
import { LabelHistory } from "@/components/dashboard/label-history";

type CarrierMetadata = {
  carrier: ShipStationCarrier | null;
  services: ShipStationService[];
};

function AddressList({
  title,
  addresses,
}: {
  title: string;
  addresses: AddressRecord[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved addresses yet.
          </p>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className="border rounded-md p-4 text-sm space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {address.label ?? address.contact_name ?? "Untitled"}
                </span>
                <Badge variant="outline">
                  {address.address_kind === "ship_from"
                    ? "Ship From"
                    : "Ship To"}
                </Badge>
              </div>
              <div>{address.address_line1}</div>
              {address.address_line2 ? (
                <div>{address.address_line2}</div>
              ) : null}
              <div>
                {address.city}, {address.state} {address.postal_code}
              </div>
              <div>{address.country}</div>
              {address.phone ? <div>Phone: {address.phone}</div> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// function getSnapshotName(snapshot: ShipStationAddressSnapshot) {
//   if (!snapshot) return "N/A";
//   if (
//     snapshot.name &&
//     typeof snapshot.name === "string" &&
//     snapshot.name.length > 0
//   ) {
//     return snapshot.name;
//   }
//   if (
//     snapshot.company &&
//     typeof snapshot.company === "string" &&
//     snapshot.company.length > 0
//   ) {
//     return snapshot.company;
//   }
//   if (
//     snapshot.street1 &&
//     typeof snapshot.street1 === "string" &&
//     snapshot.street1.length > 0
//   ) {
//     return snapshot.street1;
//   }
//   return "N/A";
// }

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const [savedFromAddresses, savedToAddresses, labels] = await Promise.all([
    listAddresses(profile.id, "ship_from"),
    listAddresses(profile.id, "ship_to"),
    listShippingLabelsForUser(profile.id),
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
      const [services] = await Promise.all([listServices(carrier.code)]);
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
              initialServices={metadata.services}
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

      <section className="grid md:grid-cols-2 gap-6">
        <AddressList
          title="Saved ship-from addresses"
          addresses={savedFromAddresses}
        />
        <AddressList
          title="Saved ship-to addresses"
          addresses={savedToAddresses}
        />
      </section>

      <section>
        <LabelHistory labels={labels} />
      </section>
    </div>
  );
}
