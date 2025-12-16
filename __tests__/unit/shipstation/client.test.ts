import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(
  data: unknown,
  init: ResponseInit & { headers?: HeadersInit } = {}
) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}

describe("ShipStation client", () => {
  const priorEnv = {
    SHIPSTATION_API_KEY: process.env.SHIPSTATION_API_KEY,
    SHIPSTATION_API_SECRET: process.env.SHIPSTATION_API_SECRET,
    SHIPSTATION_API_BASE: process.env.SHIPSTATION_API_BASE,
  };

  beforeEach(() => {
    process.env.SHIPSTATION_API_KEY = "test-key";
    process.env.SHIPSTATION_API_SECRET = "test-secret";
    delete process.env.SHIPSTATION_API_BASE;
  });

  afterEach(() => {
    process.env.SHIPSTATION_API_KEY = priorEnv.SHIPSTATION_API_KEY;
    process.env.SHIPSTATION_API_SECRET = priorEnv.SHIPSTATION_API_SECRET;
    process.env.SHIPSTATION_API_BASE = priorEnv.SHIPSTATION_API_BASE;
    vi.unstubAllGlobals();
  });

  it("throws when required env vars are missing", async () => {
    delete process.env.SHIPSTATION_API_KEY;
    delete process.env.SHIPSTATION_API_SECRET;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as any);

    const { listWarehouses } = await import("@/lib/shipstation/client");
    await expect(listWarehouses()).rejects.toThrow(
      /ShipStation API credentials are not configured/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends Basic auth and query params for listOrders", async () => {
    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) =>
      jsonResponse({ orders: [], total: 0, page: 1, pages: 1 }, { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock as any);

    const { listOrders } = await import("@/lib/shipstation/client");
    await listOrders({ page: 2, orderStatus: "awaiting_shipment" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://ssapi.shipstation.com");
    expect(parsed.pathname).toBe("/orders");
    expect(parsed.searchParams.get("page")).toBe("2");
    expect(parsed.searchParams.get("orderStatus")).toBe("awaiting_shipment");

    const headers = init.headers as Record<string, string>;
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(headers.Accept).toBe("application/json");
    expect(headers["Content-Type"]).toBe("application/json");

    const expectedAuth = Buffer.from("test-key:test-secret").toString("base64");
    expect(headers.Authorization).toBe(`Basic ${expectedAuth}`);
  });

  it("uses SHIPSTATION_API_BASE when set", async () => {
    process.env.SHIPSTATION_API_BASE = "https://example.test";

    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) =>
      jsonResponse([], { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock as any);

    const { listWarehouses } = await import("@/lib/shipstation/client");
    await listWarehouses();

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.test/warehouses");
  });

  it.each([
    [
      "createOrder",
      async () => {
        const { createOrder } = await import("@/lib/shipstation/client");
        await createOrder({ orderNumber: "ORDER-1" } as any);
      },
      "/orders/createorder",
      "POST",
      JSON.stringify({ orderNumber: "ORDER-1" }),
    ],
    [
      "createLabelForOrder",
      async () => {
        const { createLabelForOrder } = await import("@/lib/shipstation/client");
        await createLabelForOrder({ orderId: 123 } as any);
      },
      "/orders/createlabelfororder",
      "POST",
      JSON.stringify({ orderId: 123 }),
    ],
    [
      "createLabel",
      async () => {
        const { createLabel } = await import("@/lib/shipstation/client");
        await createLabel({ carrierCode: "fedex" } as any);
      },
      "/shipments/createlabel",
      "POST",
      JSON.stringify({ carrierCode: "fedex" }),
    ],
    [
      "getRates",
      async () => {
        const { getRates } = await import("@/lib/shipstation/client");
        await getRates({ carrierCode: "fedex" } as any);
      },
      "/shipments/getrates",
      "POST",
      JSON.stringify({ carrierCode: "fedex" }),
    ],
    [
      "voidLabel",
      async () => {
        const { voidLabel } = await import("@/lib/shipstation/client");
        await voidLabel(999);
      },
      "/shipments/voidlabel",
      "POST",
      JSON.stringify({ shipmentId: 999 }),
    ],
  ])("%s hits the expected endpoint", async (_name, call, path, method, body) => {
    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) =>
      jsonResponse({ ok: true }, { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock as any);

    await call();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://ssapi.shipstation.com${path}`);
    expect(init.method).toBe(method);
    expect(init.body).toBe(body);
  });

  it("filters listCarriers to FedEx carriers only", async () => {
    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) =>
      jsonResponse(
        [
          { code: "fedex", name: "FedEx" },
          { code: "ups", name: "UPS" },
        ],
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock as any);

    const { listCarriers } = await import("@/lib/shipstation/client");
    await expect(listCarriers()).resolves.toEqual([{ code: "fedex", name: "FedEx" }]);
  });

  it("filters and sorts listServices by supported service codes", async () => {
    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) =>
      jsonResponse(
        [
          {
            carrierCode: "fedex",
            code: "fedex_priority_overnight",
            name: "Priority Overnight",
            domestic: true,
            international: false,
          },
          {
            carrierCode: "fedex",
            code: "fedex_2day",
            name: "2Day",
            domestic: true,
            international: false,
          },
          {
            carrierCode: "fedex",
            code: "fedex_ground",
            name: "Ground",
            domestic: true,
            international: false,
          },
          {
            carrierCode: "fedex",
            code: "fedex_smartpost",
            name: "SmartPost",
            domestic: true,
            international: false,
          },
        ],
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock as any);

    const { listServices } = await import("@/lib/shipstation/client");
    const services = await listServices("fedex");

    expect(services.map((s) => s.code)).toEqual([
      "fedex_2day",
      "fedex_ground",
      "fedex_priority_overnight",
    ]);
  });

  it("throws ShipStation errors with ExceptionMessage when present", async () => {
    const response = {
      ok: false,
      status: 400,
      json: vi.fn(async () => ({
        Message: "Unhandled exception",
        ExceptionMessage: "Bad request",
      })),
      text: vi.fn(async () => "ignored"),
    };

    const fetchMock = vi.fn(async () => response as any);
    vi.stubGlobal("fetch", fetchMock as any);

    const { listWarehouses } = await import("@/lib/shipstation/client");
    await expect(listWarehouses()).rejects.toThrow("ShipStation error: Bad request");
    expect(console.log).toHaveBeenCalled();
  });

  it("falls back to a status-based error message when the detail does not match", async () => {
    const response = {
      ok: false,
      status: 500,
      json: vi.fn(async () => {
        throw new Error("not json");
      }),
      text: vi.fn(async () => "boom"),
    };

    const fetchMock = vi.fn(async () => response as any);
    vi.stubGlobal("fetch", fetchMock as any);

    const { listWarehouses } = await import("@/lib/shipstation/client");
    await expect(listWarehouses()).rejects.toThrow(
      "ShipStation request failed with status 500"
    );
    expect(response.text).toHaveBeenCalled();
  });

  it("returns undefined for 204 responses", async () => {
    const response = { ok: true, status: 204, json: vi.fn() };
    const fetchMock = vi.fn(async () => response as any);
    vi.stubGlobal("fetch", fetchMock as any);

    const { voidLabel } = await import("@/lib/shipstation/client");
    await expect(voidLabel(1)).resolves.toBeUndefined();
    expect(response.json).not.toHaveBeenCalled();
  });
});

