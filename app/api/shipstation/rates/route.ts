import { NextResponse, type NextRequest } from "next/server";

import { requireUserProfile } from "@/lib/auth";
import { getRates } from "@/lib/shipstation/client";
import { getUserUpcharge } from "@/lib/supabase/admin";
import { ShipStationRatesRequest } from "@/lib/shipstation/types";

export async function POST(request: NextRequest) {
  let profile = null;
  try {
    profile = await requireUserProfile();
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let payload: ShipStationRatesRequest;

  try {
    payload = (await request.json()) as ShipStationRatesRequest;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  if (
    !payload?.carrierCode ||
    !payload.fromPostalCode ||
    !payload.toPostalCode ||
    !payload.toCountry ||
    !payload.weight ||
    typeof payload.weight.value !== "number"
  ) {
    return NextResponse.json(
      { message: "Missing required rate parameters." },
      { status: 400 }
    );
  }

  if (payload.residential && payload.serviceCode === "fedex_ground")
    return NextResponse.json(
      {
        message:
          "FedEx Ground does not support residential addresses.\n Please use FedEx Home Delivery or switch to a commercial address.",
      },
      { status: 400 }
    );

  try {
    const rates = await getRates(payload);
    const userUpcharge = await getUserUpcharge(profile.id);
    const upcharge = {
      value: userUpcharge.value,
      unit: userUpcharge.unit,
    };
    const updatedRates = rates.map((rate) => ({
      ...rate,
      shipmentCost: calculateUpchargeCost(upcharge, rate.shipmentCost),
    }));
    return NextResponse.json({ rates: updatedRates });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch rates.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

function calculateUpchargeCost(
  upcharge: { value: number; unit: string },
  totalShipmentCost: number | undefined
) {
  if (totalShipmentCost === undefined) return 0;
  const { value: upchargeValue, unit: upchargeUnit } = upcharge;
  if (
    Number.isFinite(upchargeValue) &&
    upchargeValue > 0 &&
    (upchargeUnit === "dollars" || upchargeUnit === "percent")
  ) {
    if (upchargeUnit === "dollars") {
      return totalShipmentCost + upchargeValue;
    } else if (upchargeUnit === "percent") {
      return totalShipmentCost * (1 + upchargeValue / 100);
    }
  }
  return totalShipmentCost;
}
