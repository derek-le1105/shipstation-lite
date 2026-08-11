import { NextResponse, type NextRequest } from "next/server";

import { requireUserProfile } from "@/lib/auth";
import { getFedexCarrierId, getRates } from "@/lib/shipstation/client";
import { getUserUpcharge } from "@/lib/supabase/admin";
import { ShipStationRatesRequest } from "@/lib/shipstation/types";
import type { V2RateRequest } from "@/lib/shipstation/v2-types";
import { fetchProfileWarehouseRecord } from "@/lib/supabase/warehouses";
import type { WarehouseRecord } from "@/lib/supabase/warehouses";

const WEIGHT_UNIT_MAP: Record<
  string,
  V2RateRequest["shipment"]["packages"][number]["weight"]["unit"]
> = {
  ounces: "ounce",
  pounds: "pound",
  grams: "gram",
};

function toV2RateRequest(
  payload: ShipStationRatesRequest,
  shipFrom: WarehouseRecord,
): V2RateRequest {
  return {
    rate_options: {
      rate_type: "quick",
      carrier_ids: [],
      service_codes: payload.serviceCode ? [payload.serviceCode] : undefined,
    },
    shipment: {
      ship_from: {
        name: shipFrom.originAddress_name,
        company_name: shipFrom.originAddress_company || undefined,
        address_line1: shipFrom.originAddress_street1,
        address_line2: shipFrom.originAddress_street2 || undefined,
        city_locality: shipFrom.originAddress_city,
        state_province: shipFrom.originAddress_state,
        postal_code: shipFrom.originAddress_postalCode,
        country_code: shipFrom.originAddress_country || "US",
        phone: shipFrom.originAddress_phone || undefined,
        address_residential_indicator: shipFrom.originAddress_residential
          ? "yes"
          : "no",
      },
      ship_to: {
        name: payload.toName || "Recipient",
        company_name: payload.toCompany || undefined,
        address_line1: payload.toStreet1 || "",
        address_line2: payload.toStreet2 || undefined,
        city_locality: payload.toCity ?? "",
        state_province: payload.toState ?? "",
        postal_code: payload.toPostalCode,
        country_code: payload.toCountry,
        phone: payload.toPhone || undefined,
        address_residential_indicator: payload.residential ? "yes" : "no",
      },
      confirmation: payload.confirmation,
      packages: [
        {
          weight: {
            value: payload.weight.value,
            unit: WEIGHT_UNIT_MAP[payload.weight.units] ?? "pound",
          },
          ...(payload.dimensions && {
            dimensions: {
              unit:
                payload.dimensions.units === "centimeters"
                  ? "centimeter"
                  : "inch",
              length: payload.dimensions.length,
              width: payload.dimensions.width,
              height: payload.dimensions.height,
            },
          }),
        },
      ],
    },
  };
}

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
      { status: 400 },
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
      { status: 400 },
    );
  }

  if (payload.residential && payload.serviceCode === "fedex_ground")
    return NextResponse.json(
      {
        message:
          "FedEx Ground does not support residential addresses.\n Please use FedEx Home Delivery or switch to a commercial address.",
      },
      { status: 400 },
    );

  try {
    const carrierId = await getFedexCarrierId();
    if (!carrierId) {
      return NextResponse.json(
        { message: "FedEx carrier is not configured in ShipStation." },
        { status: 500 },
      );
    }
    const shipFrom = await fetchProfileWarehouseRecord(profile);
    const rateRequest = toV2RateRequest(payload, shipFrom);
    rateRequest.rate_options.carrier_ids = [carrierId];
    const rates = await getRates(rateRequest);
    console.log("RATES: ", rates);
    const userUpcharge = await getUserUpcharge(profile.id);
    const upcharge = {
      value: userUpcharge.value,
      unit: userUpcharge.unit,
    };
    const updatedRates = rates.map((rate) => ({
      ...rate,
      shipmentCost: calculateUpchargeCost(upcharge, rate.shipmentCost),
      otherCost: calculateUpchargeCost(upcharge, rate.otherCost ?? 0),
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
  totalShipmentCost: number | undefined,
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
