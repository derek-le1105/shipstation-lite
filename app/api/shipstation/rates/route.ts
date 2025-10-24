import { NextResponse, type NextRequest } from "next/server";

import { requireUserProfile } from "@/lib/auth";
import {
  getRates,
  type ShipstationRatesRequest,
} from "@/lib/shipstation/client";

export async function POST(request: NextRequest) {
  try {
    await requireUserProfile();
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let payload: ShipstationRatesRequest;

  try {
    payload = (await request.json()) as ShipstationRatesRequest;
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

  try {
    console.log("Fetching rates with payload:", payload);
    const rates = await getRates(payload);
    console.log("Fetched rates:", rates);
    return NextResponse.json({ rates });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch rates.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
