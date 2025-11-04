/* eslint-disable @typescript-eslint/no-explicit-any */
/*
  FedEx API utility client

  - Reads credentials from env: `FEDEX_API_KEY`, `FEDEX_SECRET_KEY`.
  - Obtains and caches OAuth access tokens using client_credentials.
  - Exposes thin request helpers: get/post/put/delete + generic request.
  - Allows overriding base URLs for sandbox/production via options or env.

  Note: Only import and use this on the server. Never expose your FedEx
  credentials to client-side bundles.
*/

import { OAuthTokenResponse } from "./types";

type FetchFn = typeof fetch;

export type FedExClientOptions = {
  // Base API host (defaults to production or sandbox based on FEDEX_ENV)
  baseUrl?: string;
  // OAuth token URL (defaults based on FEDEX_ENV)
  oauthUrl?: string;
  // Optional custom fetch (e.g., for testing)
  fetchFn?: FetchFn;
  // Optional user agent string
  userAgent?: string;
};

export type RequestOptions = {
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string | undefined>;
  // For JSON payloads, pass an object. For other content types, pass a string/Blob.
  body?: unknown;
  // If false, do not JSON.stringify the body or set content-type.
  json?: boolean;
  // Optional signal for cancellation
  signal?: AbortSignal;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number; // epoch millis
};

function assertServerSide() {
  if (typeof window !== "undefined") {
    // Not throwing to avoid runtime crashes if accidentally imported on client,
    // but warn loudly to help catch issues early.
    // eslint-disable-next-line no-console
    console.warn("FedEx client should only be used server-side.");
  }
}

function encodeQuery(query?: RequestOptions["query"]) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export class FedExClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly oauthUrl: string;
  private readonly fetchFn: FetchFn;
  private readonly userAgent?: string;
  private token?: TokenCache;

  constructor(opts: FedExClientOptions = {}) {
    assertServerSide();

    const apiKey = process.env.FEDEX_API_KEY;
    const apiSecret = process.env.FEDEX_SECRET_KEY;
    if (!apiKey || !apiSecret) {
      throw new Error(
        "Missing FEDEX_API_KEY and/or FEDEX_SECRET_KEY in environment."
      );
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = "https://apis.fedex.com";
    this.oauthUrl = "https://apis.fedex.com/oauth/token";
    this.fetchFn = opts.fetchFn || fetch;
    this.userAgent = opts.userAgent;
  }

  // Returns a valid access token, refreshing if needed.
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt > now + 10_000) {
      return this.token.accessToken;
    }

    const body = new URLSearchParams();
    body.set("grant_type", "client_credentials");
    body.set("client_id", this.apiKey);
    body.set("client_secret", this.apiSecret);

    const res = await this.fetchFn(this.oauthUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(this.userAgent ? { "user-agent": this.userAgent } : {}),
      },
      body,
    });

    if (!res.ok) {
      const text = await safeReadText(res);
      throw new Error(
        `FedEx OAuth failed: ${res.status} ${res.statusText} - ${text}`
      );
    }

    const data = await safeReadJson<OAuthTokenResponse>(res);
    if (!data || data === undefined)
      throw new Error("Failed to parse FedEx OAuth response");
    const accessToken: string = data.access_token;
    const expiresInSeconds: number = Number(data.expires_in || 3000);
    if (!accessToken)
      throw new Error("FedEx OAuth response missing access_token");

    const expiresAt = Date.now() + Math.max(30_000, expiresInSeconds * 1000);
    this.token = { accessToken, expiresAt };
    return accessToken;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}${encodeQuery(query)}`;
  }

  // Generic request helper. Retries once on 401 by refreshing token.
  async request<T = any>(
    method: string,
    path: string,
    opts: RequestOptions = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = this.buildUrl(path, opts.query);

    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      ...(this.userAgent ? { "user-agent": this.userAgent } : {}),
      ...(opts.headers || {}),
    };

    let body: BodyInit | undefined;
    const wantsJson = opts.json !== false;
    if (opts.body !== undefined) {
      if (wantsJson) {
        headers["content-type"] = headers["content-type"] || "application/json";
        body = JSON.stringify(opts.body);
      } else {
        // Assume caller set content-type in headers as needed
        body = opts.body as any;
      }
    }

    const doFetch = () =>
      this.fetchFn(url, {
        method,
        headers,
        body,
        signal: opts.signal,
      });

    let res = await doFetch();
    if (res.status === 401) {
      // Try refreshing token once
      this.token = undefined;
      const newToken = await this.getAccessToken();
      headers["authorization"] = `Bearer ${newToken}`;
      res = await doFetch();
    }

    if (!res.ok) {
      // Attempt to parse JSON error; fall back to text.
      const errBody = (await tryReadBody(res)) ?? {
        message: await safeReadText(res),
      };
      const msg =
        typeof errBody === "string"
          ? errBody
          : errBody?.message || errBody?.errors || JSON.stringify(errBody);
      const error = new Error(
        `FedEx API error: ${res.status} ${res.statusText} - ${msg}`
      );
      throw error;
    }

    return (await tryReadBody(res)) as T;
  }

  // Convenience helpers
  get<T = any>(path: string, opts: RequestOptions = {}) {
    return this.request<T>("GET", path, opts);
  }

  post<T = any>(path: string, body?: unknown, opts: RequestOptions = {}) {
    return this.request<T>("POST", path, { ...opts, body });
  }

  put<T = any>(path: string, body?: unknown, opts: RequestOptions = {}) {
    return this.request<T>("PUT", path, { ...opts, body });
  }

  patch<T = any>(path: string, body?: unknown, opts: RequestOptions = {}) {
    return this.request<T>("PATCH", path, { ...opts, body });
  }

  delete<T = any>(path: string, opts: RequestOptions = {}) {
    return this.request<T>("DELETE", path, opts);
  }
}

// Singleton factory with default env-based configuration.
let defaultClient: FedExClient | null = null;
export function getFedExClient(opts?: FedExClientOptions) {
  if (opts || !defaultClient) {
    defaultClient = new FedExClient(opts);
  }
  return defaultClient;
}

// Helpers to safely parse responses
async function tryReadBody(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return safeReadJson(res);
  }
  return safeReadText(res);
}

async function safeReadJson<T>(res: Response): Promise<T | undefined> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export default FedExClient;
