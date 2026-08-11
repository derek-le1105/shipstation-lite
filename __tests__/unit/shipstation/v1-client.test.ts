import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(
  data: unknown,
  init: ResponseInit & { headers?: HeadersInit } = {},
) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}
