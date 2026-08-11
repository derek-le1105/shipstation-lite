import type {
  ShipStationCarrier as Carrier,
  ShipStationService as Service,
  ShipStationPackage as Package,
  ShipstationVoidLabelResponse as VoidLabelResponse,
  ShipStationRate as Rate,
  Warehouse,
} from "./types";
import type {
  V2CreateShipmentPayload,
  V2LabelResponse,
  V2Carrier,
  V2RateRequest,
  V2RateResponse,
  V2Warehouse,
} from "./v2-types";

const DEFAULT_API_BASE = "https://api.shipstation.com";

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
  const apiKey = process.env.SHIPSTATION_V2_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ShipStation V2 API credentials are not configured. Please set SHIPSTATION_V2_API_KEY.",
    );
  }

  const base = process.env.SHIPSTATION_API_BASE ?? DEFAULT_API_BASE;

  return { base, apiKey };
}

async function shipStationRequest<TResponse>(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  } = {},
): Promise<TResponse> {
  const { base, apiKey } = getConfig();

  const headers = {
    "API-Key": apiKey,
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
      typeof detail === "object" && detail !== null && "message" in detail
        ? `ShipStation error: ${(detail as { message: string }).message}`
        : `ShipStation request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

/**
 * Create a shipment label via V2. When payload.shipment.packages has more
 * than one entry, ShipStation returns a shipment-level parent tracking_number
 * plus a tracking_number per package in the packages[] array.
 */
export async function createShipment(
  payload: V2CreateShipmentPayload,
): Promise<V2LabelResponse> {
  return shipStationRequest<V2LabelResponse>("/v2/labels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function voidLabel(labelId: string): Promise<VoidLabelResponse> {
  const result = await shipStationRequest<{
    approved: boolean;
    message?: string;
  }>(`/v2/labels/${labelId}/void`, { method: "PUT" });
  return result;
}

/**
 * Cancels a V2 shipment. Any labels on the shipment must already be voided -
 * ShipStation rejects the cancel otherwise. Responds 204 on success.
 */
export async function cancelShipment(shipmentId: string): Promise<void> {
  await shipStationRequest<void>(`/v2/shipments/${shipmentId}/cancel`, {
    method: "PUT",
  });
}

/**
 * Looks up a shipment by our client-generated external_shipment_id.
 * Used as V2's replacement for V1's orderNumber-based dedup - returns null
 * when no shipment exists yet for this id (nothing to reuse).
 */
export async function getShipmentByExternalId(
  externalShipmentId: string,
): Promise<{ shipment_id: string } | null> {
  try {
    return await shipStationRequest<{ shipment_id: string }>(
      `/v2/shipments/external_shipment_id/${externalShipmentId}`,
      { method: "GET" },
    );
  } catch {
    return null;
  }
}

async function fetchFedexCarrier(): Promise<V2Carrier | null> {
  const { carriers } = await shipStationRequest<{ carriers: V2Carrier[] }>(
    "/v2/carriers",
  );
  return carriers.find((carrier) => carrier.carrier_code === "fedex") ?? null;
}

/** V2's rate/carrier-scoped endpoints need the opaque carrier_id, not carrier_code. */
export async function getFedexCarrierId(): Promise<string | null> {
  const carrier = await fetchFedexCarrier();
  return carrier?.carrier_id ?? null;
}

export async function listCarriers(): Promise<Carrier[]> {
  const carrier = await fetchFedexCarrier();
  if (!carrier) return [];
  return [{ code: carrier.carrier_code, name: carrier.friendly_name }];
}

/**
 * Fetches the list of services for a given carrier from ShipStation V2.
 * Filtered down to the subset this app supports.
 */
export async function listServices(carrierCode: string): Promise<Service[]> {
  if (carrierCode !== "fedex") return [];
  const carrier = await fetchFedexCarrier();
  if (!carrier) return [];
  return carrier.services
    .filter((service) => SUPPORTED_SERVICES.includes(service.service_code))
    .map((service) => ({
      carrierCode: service.carrier_code,
      code: service.service_code,
      name: service.name,
      domestic: service.domestic,
      international: service.international,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listPackages(carrierCode: string): Promise<Package[]> {
  if (carrierCode !== "fedex") return [];
  const carrier = await fetchFedexCarrier();
  if (!carrier) return [];
  return carrier.packages.map((pkg) => ({
    carrierCode: carrier.carrier_code,
    packageCode: pkg.package_code,
    name: pkg.name,
    dimensionsRequired: pkg.dimensions_required,
    domestic: pkg.domestic,
    international: pkg.international,
  }));
}

function mapV2Warehouse(warehouse: V2Warehouse): Warehouse {
  const mapAddress = (address: V2Warehouse["origin_address"]) => ({
    name: address.name,
    company: address.company_name ?? "",
    street1: address.address_line1,
    street2: address.address_line2 ?? "",
    street3: "",
    city: address.city_locality,
    state: address.state_province,
    postalCode: address.postal_code,
    country: address.country_code,
    phone: address.phone ?? "",
    residential: address.address_residential_indicator === "yes",
    addressVerified: null,
  });

  return {
    warehouseId: warehouse.warehouse_id,
    warehouseName: warehouse.name,
    originAddress: mapAddress(warehouse.origin_address),
    returnAddress: mapAddress(warehouse.return_address),
    createDate: "",
    isDefault: warehouse.is_default,
    sellerIntegrationId: null,
    extInventoryIdentity: null,
    registerFedexMeter: null,
  };
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const { warehouses } = await shipStationRequest<{
    warehouses: V2Warehouse[];
  }>("/v2/warehouses");
  return warehouses.map(mapV2Warehouse);
}

export async function getRates(request: V2RateRequest): Promise<Rate[]> {
  const response = await shipStationRequest<V2RateResponse>("/v2/rates", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return response.rate_response.rates.map((rate) => ({
    carrierCode: "fedex",
    serviceCode: rate.service_code,
    serviceName: rate.service_type,
    shipmentCost: rate.shipping_amount.amount,
    otherCost: rate.confirmation_amount?.amount,
    deliveryDays: rate.delivery_days ?? null,
  }));
}
