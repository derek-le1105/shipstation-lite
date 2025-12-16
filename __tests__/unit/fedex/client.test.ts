import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(
  data: unknown,
  init: ResponseInit & { headers?: HeadersInit } = {}
) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function textResponse(
  text: string,
  init: ResponseInit & { headers?: HeadersInit } = {}
) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "text/plain");
  return new Response(text, { ...init, headers });
}

function oauthTokenResponse(accessToken: string, expiresInSeconds = 3600) {
  return jsonResponse(
    {
      access_token: accessToken,
      expires_in: expiresInSeconds,
      token_type: "bearer",
    },
    { status: 200, statusText: "OK" }
  );
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("FedExClient", () => {
  beforeEach(() => {
    process.env.FEDEX_API_KEY = "test-api-key";
    process.env.FEDEX_SECRET_KEY = "test-secret-key";
  });

  it("throws when required env vars are missing", async () => {
    vi.resetModules();
    delete process.env.FEDEX_API_KEY;
    delete process.env.FEDEX_SECRET_KEY;

    const { FedExClient } = await import("@/lib/fedex/client");

    expect(() => new FedExClient({ fetchFn: vi.fn() as any })).toThrow(
      /Missing FEDEX_API_KEY and\/or FEDEX_SECRET_KEY/
    );
  });

  it("requests an OAuth token and sends authorized requests with query params", async () => {
    const fetchFn = vi.fn(async (url: any, _init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) {
        return oauthTokenResponse("token-1");
      }
      return jsonResponse({ ok: true }, { status: 200, statusText: "OK" });
    });

    const { FedExClient } = await import("@/lib/fedex/client");
    const client = new FedExClient({ fetchFn });

    await client.get("/rate/v1/rates/quotes", {
      query: { a: 1, b: true, c: undefined, d: null, e: "x" },
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);

    const oauthCall = fetchFn.mock.calls[0]!;
    const oauthUrl = String(oauthCall[0]);
    const oauthInit = oauthCall[1] as RequestInit;
    expect(oauthUrl).toBe("https://apis.fedex.com/oauth/token");
    expect(oauthInit.method).toBe("POST");
    expect(oauthInit.headers).toEqual(
      expect.objectContaining({
        "content-type": "application/x-www-form-urlencoded",
      })
    );
    expect(oauthInit.body).toBeInstanceOf(URLSearchParams);
    const oauthBody = oauthInit.body as URLSearchParams;
    expect(oauthBody.get("grant_type")).toBe("client_credentials");
    expect(oauthBody.get("client_id")).toBe("test-api-key");
    expect(oauthBody.get("client_secret")).toBe("test-secret-key");

    const apiCall = fetchFn.mock.calls[1]!;
    const apiUrl = String(apiCall[0]);
    const apiInit = apiCall[1] as RequestInit;
    const parsed = new URL(apiUrl);
    expect(parsed.origin).toBe("https://apis.fedex.com");
    expect(parsed.pathname).toBe("/rate/v1/rates/quotes");
    expect(parsed.searchParams.get("a")).toBe("1");
    expect(parsed.searchParams.get("b")).toBe("true");
    expect(parsed.searchParams.get("c")).toBeNull();
    expect(parsed.searchParams.get("d")).toBeNull();
    expect(parsed.searchParams.get("e")).toBe("x");
    expect(apiInit.headers).toEqual(
      expect.objectContaining({
        authorization: "Bearer token-1",
      })
    );
  });

  it("JSON-stringifies request bodies by default and sets content-type if missing", async () => {
    const fetchFn = vi.fn(async (url: any, init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) {
        return oauthTokenResponse("token-1");
      }

      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
        })
      );
      expect(init?.body).toBe(JSON.stringify({ hello: "world" }));

      return jsonResponse({ ok: true }, { status: 200, statusText: "OK" });
    });

    const { FedExClient } = await import("@/lib/fedex/client");
    const client = new FedExClient({ fetchFn });

    await client.post("/some/endpoint", { hello: "world" });
  });

  it("does not JSON-stringify when json:false and preserves caller headers", async () => {
    const fetchFn = vi.fn(async (url: any, init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) {
        return oauthTokenResponse("token-1");
      }

      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "text/plain",
        })
      );
      expect(init?.body).toBe("raw-payload");

      return textResponse("ok", { status: 200, statusText: "OK" });
    });

    const { FedExClient } = await import("@/lib/fedex/client");
    const client = new FedExClient({ fetchFn });

    await client.post("/upload", "raw-payload", {
      json: false,
      headers: { "content-type": "text/plain" },
    });
  });

  it("retries once on 401 by refreshing the token", async () => {
    let oauthCallCount = 0;
    let apiCallCount = 0;

    const fetchFn = vi.fn(async (url: any, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/oauth/token")) {
        oauthCallCount += 1;
        const token = oauthCallCount === 1 ? "token-1" : "token-2";
        return oauthTokenResponse(token);
      }

      apiCallCount += 1;
      if (apiCallCount === 1) {
        expect(init?.headers).toEqual(
          expect.objectContaining({ authorization: "Bearer token-1" })
        );
        return textResponse("unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        });
      }

      expect(init?.headers).toEqual(
        expect.objectContaining({ authorization: "Bearer token-2" })
      );
      return jsonResponse({ ok: true }, { status: 200, statusText: "OK" });
    });

    const { FedExClient } = await import("@/lib/fedex/client");
    const client = new FedExClient({ fetchFn });

    await client.get("/anything");
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it("caches access tokens until near expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const fetchFn = vi.fn(async (url: any, _init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) {
        return oauthTokenResponse("token-1", 3600);
      }
      return jsonResponse({ ok: true }, { status: 200, statusText: "OK" });
    });

    const { FedExClient } = await import("@/lib/fedex/client");
    const client = new FedExClient({ fetchFn });

    await client.get("/one");
    await client.get("/two");

    const oauthCalls = fetchFn.mock.calls.filter((c) =>
      String(c[0]).includes("/oauth/token")
    );
    expect(oauthCalls).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("throws parsed JSON errors for non-OK responses", async () => {
    const fetchFn = vi.fn(async (url: any, _init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) {
        return oauthTokenResponse("token-1");
      }
      return jsonResponse(
        { errors: [{ message: "bad request" }] },
        { status: 400, statusText: "Bad Request" }
      );
    });

    const { FedExClient } = await import("@/lib/fedex/client");
    const client = new FedExClient({ fetchFn });

    await expect(client.get("/bad")).rejects.toEqual({
      errors: [{ message: "bad request" }],
    });
  });

  it("throws a string body for non-JSON errors", async () => {
    const fetchFn = vi.fn(async (url: any, _init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) {
        return oauthTokenResponse("token-1");
      }
      return textResponse("boom", { status: 500, statusText: "Server Error" });
    });

    const { FedExClient } = await import("@/lib/fedex/client");
    const client = new FedExClient({ fetchFn });

    await expect(client.get("/error")).rejects.toBe("boom");
  });
});

describe("getFedExClient", () => {
  it("returns a singleton unless opts are provided", async () => {
    vi.resetModules();
    process.env.FEDEX_API_KEY = "test-api-key";
    process.env.FEDEX_SECRET_KEY = "test-secret-key";

    const fetchFnA = vi.fn(async (url: any, _init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) return oauthTokenResponse("a");
      return jsonResponse({ ok: true }, { status: 200, statusText: "OK" });
    });
    const fetchFnB = vi.fn(async (url: any, _init?: RequestInit) => {
      if (String(url).includes("/oauth/token")) return oauthTokenResponse("b");
      return jsonResponse({ ok: true }, { status: 200, statusText: "OK" });
    });

    const { getFedExClient } = await import("@/lib/fedex/client");

    const first = getFedExClient({ fetchFn: fetchFnA });
    const second = getFedExClient();
    expect(second).toBe(first);

    const third = getFedExClient({ fetchFn: fetchFnB });
    expect(third).not.toBe(first);
  });
});
