import type {
  ShipStationRatesRequest as RatesRequest,
  ShipStationLabel as Label,
  ShipStationCarrier as Carrier,
  ShipStationService as Service,
  ShipStationPackage as Package,
  ShipstationVoidLabelResponse as VoidLabelResponse,
  ShipStationRate as Rate,
  CreateLabelPayload,
} from "./types";

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

export async function createorder(payload: unknown): Promise<unknown> {
  return shipStationRequest<unknown>("/orders/createorder", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createLabelForOrder(
  payload: CreateLabelPayload
): Promise<Label> {
  return shipStationRequest<Label>("/shipments/createlabelfororder", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createLabel(payload: CreateLabelPayload): Promise<Label> {
  return shipStationRequest<Label>("/shipments/createlabel", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRates(request: RatesRequest): Promise<Rate[]> {
  return shipStationRequest<Rate[]>("/shipments/getrates", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function listCarriers(): Promise<Carrier[]> {
  const carrierRequest = shipStationRequest<Carrier[]>("/carriers").then(
    (data) => data.filter((carrier) => carrier.code === "fedex")
  );
  return carrierRequest;
}

/**
 * Fetches the list of services for a given carrier from ShipStation.
 * 10/22 -> Reduced to only FedEx Carriers as shown in listCarriers
 * Filter for only select services
 * @param carrierCode The code of the carrier to list services for
 * @returns A promise that resolves to an array of Service objects
 */
export async function listServices(carrierCode: string): Promise<Service[]> {
  const params = new URLSearchParams({ carrierCode });
  return shipStationRequest<Service[]>(
    `/carriers/listservices?${params.toString()}`
  ).then((data) =>
    data
      .filter((service) => SUPPORTED_SERVICES.includes(service.code))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}

export async function listPackages(carrierCode: string): Promise<Package[]> {
  const params = new URLSearchParams({ carrierCode });
  return shipStationRequest<Package[]>(
    `/carriers/listpackages?${params.toString()}`
  );
}

export async function voidLabel(
  shipmentId: number
): Promise<VoidLabelResponse> {
  return shipStationRequest<VoidLabelResponse>(`/shipments/voidlabel`, {
    method: "POST",
    body: JSON.stringify({ shipmentId }),
  });
}
