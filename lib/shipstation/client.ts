const DEFAULT_API_BASE = "https://ssapi.shipstation.com";

export const SUPPORTED_SERVICES = [
  "fedex_ground",
  "fedex_home_delivery",
  "fedex_2day",
  "fedex_2day_am",
  "fedex_standard_overnight",
  "fedex_priority_overnight",
  "fedex_first_overnight",
];

export type ShipStationAddress = {
  name: string;
  company?: string | null;
  street1: string;
  street2?: string | null;
  street3?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  residential?: boolean;
  addressVerified?: boolean;
};

export type ShipStationWeight = {
  value: number;
  units: "ounces" | "pounds" | "grams" | "kilograms";
  WeightUnits?: number;
};

export type CreateLabelPayload = {
  carrierCode: string;
  serviceCode: string;
  packageCode?: string;
  confirmation?: string;
  shipFrom: ShipStationAddress;
  shipTo: ShipStationAddress;
  weight: ShipStationWeight;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    units: "inches" | "centimeters";
  };
  testLabel?: boolean;
  externalOrderId?: string;
  insuranceOptions?: {
    insureShipment: boolean;
    insuredValue: number;
  };
};

export type ShipStationLabel = {
  shipmentId: number;
  orderId?: number;
  orderKey?: string;
  userId?: number;
  customerEmail?: string;
  orderNumber?: string;
  createDate?: string;
  shipDate?: string;
  shipmentCost: number;
  insuranceCost: number;
  trackingNumber?: string;
  isReturnLabel: boolean;
  batchNumber?: number;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  confirmation: string;
  warehouseId?: number;
  voided?: boolean;
  voidDate?: string;
  marketplaceNotified?: boolean;
  notifyErrorMessage?: string;
  shipTo: ShipStationAddress;
  weight: ShipStationWeight;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    units: "inches" | "centimeters";
  };
  insuranceOptions?: unknown;
  advancedOptions?: unknown;
  shipmentItems?: unknown[];
  labelData?: string;
};

export type ShipStationCarrier = {
  code: string;
  name: string;
  accountName?: string;
  accountNumber?: string;
  requiresFundedAccount?: boolean;
};

export type ShipStationService = {
  carrierCode: string;
  code: string;
  name: string;
  domestic: boolean;
  international: boolean;
};

export type ShipStationPackage = {
  carrierCode: string;
  packageCode: string;
  name: string;
  dimensionsRequired: boolean;
  domestic: boolean;
  international: boolean;
  code?: string;
};

function getConfig() {
  const apiKey = process.env.SHIPSTATION_API_KEY;
  const apiSecret = process.env.SHIPSTATION_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "ShipStation API credentials are not configured. Please set SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET."
    );
  }

  const base = process.env.SHIPSTATION_API_BASE ?? DEFAULT_API_BASE;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  return { base, auth };
}

async function shipStationRequest<TResponse>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
): Promise<TResponse> {
  const { base, auth } = getConfig();

  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...init.headers,
  };

  const response = await fetch(`${base}${path}`, {
    cache: "no-store",
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail: unknown = undefined;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    console.log("detail: ", detail);
    const message =
      typeof detail === "object" && detail !== null && "Message" in detail
        ? `ShipStation error: ${
            (detail as { Message: string; ExceptionMessage: string })
              .ExceptionMessage
          }`
        : `ShipStation request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function createLabel(
  payload: CreateLabelPayload
): Promise<ShipStationLabel> {
  return shipStationRequest<ShipStationLabel>("/shipments/createlabel", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listCarriers(): Promise<ShipStationCarrier[]> {
  const carrierRequest = shipStationRequest<ShipStationCarrier[]>(
    "/carriers"
  ).then((data) => data.filter((carrier) => carrier.code === "fedex"));
  return carrierRequest;
}

/**
 * Fetches the list of services for a given carrier from ShipStation.
 * 10/22 -> Reduced to only FedEx Carriers as shown in listCarriers
 * Filter for only select services
 * @param carrierCode The code of the carrier to list services for
 * @returns A promise that resolves to an array of ShipStationService objects
 */
export async function listServices(
  carrierCode: string
): Promise<ShipStationService[]> {
  const params = new URLSearchParams({ carrierCode });
  return shipStationRequest<ShipStationService[]>(
    `/carriers/listservices?${params.toString()}`
  ).then((data) =>
    data
      .filter((service) => SUPPORTED_SERVICES.includes(service.code))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}

export async function listPackages(
  carrierCode: string
): Promise<ShipStationPackage[]> {
  const params = new URLSearchParams({ carrierCode });
  return shipStationRequest<ShipStationPackage[]>(
    `/carriers/listpackages?${params.toString()}`
  );
}

export async function voidLabel(shipmentId: number): Promise<void> {
  return shipStationRequest<void>(`/shipments/voidlabel`, {
    method: "POST",
    body: JSON.stringify({ shipmentId }),
  });
}
