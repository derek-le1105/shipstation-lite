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

describe("cancelSeAutoOrders", () => {
  const priorEnv = {
    SHIPSTATION_API_KEY: process.env.SHIPSTATION_API_KEY,
    SHIPSTATION_API_SECRET: process.env.SHIPSTATION_API_SECRET,
  };

  beforeEach(() => {
    process.env.SHIPSTATION_API_KEY = "test-key";
    process.env.SHIPSTATION_API_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.SHIPSTATION_API_KEY = priorEnv.SHIPSTATION_API_KEY;
    process.env.SHIPSTATION_API_SECRET = priorEnv.SHIPSTATION_API_SECRET;
    vi.unstubAllGlobals();
  });

  it("throws when required env vars are missing", async () => {
    delete process.env.SHIPSTATION_API_KEY;
    delete process.env.SHIPSTATION_API_SECRET;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as any);

    const { cancelSeAutoOrders } = await import("@/lib/shipstation/v1-client");
    await expect(cancelSeAutoOrders()).rejects.toThrow(
      /ShipStation V1 API credentials are not configured/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists SEAuto orders with the correct filters and cancels each one", async () => {
    const order = {
      orderId: 500,
      orderNumber: "SEAuto-12345",
      orderStatus: "awaiting_shipment",
      orderKey: "abc-123",
      shipTo: { name: "Jane Doe" },
    };

    const fetchMock = vi.fn(async (url: any, init?: RequestInit) => {
      const parsed = new URL(url);
      if (init?.method === "POST") {
        return jsonResponse({ success: true, message: "ok" }, { status: 200 });
      }
      expect(parsed.pathname).toBe("/orders");
      expect(parsed.searchParams.get("orderNumber")).toBe("SEAuto");
      expect(parsed.searchParams.get("orderStatus")).toBe("awaiting_shipment");
      return jsonResponse(
        { orders: [order], total: 1, page: 1, pages: 1 },
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const { cancelSeAutoOrders } = await import("@/lib/shipstation/v1-client");
    const result = await cancelSeAutoOrders();

    expect(result).toEqual({ cancelled: 1, orderNumbers: ["SEAuto-12345"] });

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST"
    );
    expect(postCall).toBeDefined();
    const [postUrl, postInit] = postCall as [string, RequestInit];
    expect(new URL(postUrl).pathname).toBe("/orders/createorder");
    expect(JSON.parse(postInit.body as string)).toEqual({
      ...order,
      orderStatus: "cancelled",
    });

    const headers = postInit.headers as Record<string, string>;
    const expectedAuth = Buffer.from("test-key:test-secret").toString("base64");
    expect(headers.Authorization).toBe(`Basic ${expectedAuth}`);
  });

  it("only processes the first page of results, even when more pages exist", async () => {
    const orderA = {
      orderId: 1,
      orderNumber: "SEAuto-1",
      orderStatus: "awaiting_shipment",
    };
    const orderB = {
      orderId: 2,
      orderNumber: "SEAuto-2",
      orderStatus: "awaiting_shipment",
    };

    const fetchMock = vi.fn(async (url: any, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({ success: true }, { status: 200 });
      }
      const page = new URL(url).searchParams.get("page");
      if (page === "1") {
        return jsonResponse(
          { orders: [orderA], total: 2, page: 1, pages: 2 },
          { status: 200 }
        );
      }
      return jsonResponse(
        { orders: [orderB], total: 2, page: 2, pages: 2 },
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const { cancelSeAutoOrders } = await import("@/lib/shipstation/v1-client");
    const result = await cancelSeAutoOrders();

    expect(result).toEqual({ cancelled: 1, orderNumbers: ["SEAuto-1"] });

    const getCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method !== "POST"
    );
    expect(getCalls).toHaveLength(1);
    expect(new URL(getCalls[0][0] as string).searchParams.get("page")).toBe(
      "1"
    );
  });

  it("does not let one failed cancel stop the others from succeeding", async () => {
    const orderA = {
      orderId: 1,
      orderNumber: "SEAuto-1",
      orderStatus: "awaiting_shipment",
    };
    const orderB = {
      orderId: 2,
      orderNumber: "SEAuto-2",
      orderStatus: "awaiting_shipment",
    };

    const fetchMock = vi.fn(async (url: any, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        if (body.orderId === 1) {
          return jsonResponse({ message: "boom" }, { status: 500 });
        }
        return jsonResponse({ success: true }, { status: 200 });
      }
      return jsonResponse(
        { orders: [orderA, orderB], total: 2, page: 1, pages: 1 },
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const { cancelSeAutoOrders } = await import("@/lib/shipstation/v1-client");
    const result = await cancelSeAutoOrders();

    expect(result).toEqual({ cancelled: 1, orderNumbers: ["SEAuto-2"] });
  });
});
