const V1_API_BASE = "https://ssapi.shipstation.com";

type V1Order = Record<string, unknown> & {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
};

type V1OrdersListResponse = {
  orders: V1Order[];
  total: number;
  page: number;
  pages: number;
};

function getV1Config() {
  const apiKey = process.env.SHIPSTATION_API_KEY;
  const apiSecret = process.env.SHIPSTATION_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "ShipStation V1 API credentials are not configured. Please set SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET.",
    );
  }
  return { apiKey, apiSecret };
}

async function v1Request<TResponse>(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  } = {},
): Promise<TResponse> {
  const { apiKey, apiSecret } = getV1Config();
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...init.headers,
  };

  const response = await fetch(`${V1_API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    let detail: unknown = undefined;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    const message =
      typeof detail === "object" &&
      detail !== null &&
      "ExceptionMessage" in detail
        ? `ShipStation V1 error: ${(detail as { ExceptionMessage: string }).ExceptionMessage}`
        : `ShipStation V1 request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function listSeAutoOrdersPage(
  page: number,
): Promise<V1OrdersListResponse> {
  return v1Request<V1OrdersListResponse>(
    `/orders?orderNumber=SEAuto&orderStatus=awaiting_shipment&pageSize=500&page=${page}`,
  );
}
