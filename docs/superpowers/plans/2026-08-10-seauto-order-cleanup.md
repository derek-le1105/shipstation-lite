# SEAuto Order Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After every successful ShipStation V2 label creation, automatically cancel any `SEAuto-`-prefixed placeholder orders that ShipStation auto-generates in its own dashboard, without ever blocking or failing the label-creation flow.

**Architecture:** A new, standalone V1 (legacy) ShipStation API client module handles Basic-Auth requests to `https://ssapi.shipstation.com`. `createShippingLabelAction` calls one function from it, wrapped in a try/catch that only logs on failure, right after the V2 label is successfully created.

**Tech Stack:** TypeScript, Next.js server actions, Vitest (`vitest run` / `npm run test:run`), existing `fetch`-based ShipStation client pattern (see `lib/shipstation/client.ts`).

## Global Constraints

- Reuse the existing `SHIPSTATION_API_KEY` / `SHIPSTATION_API_SECRET` env vars already present in `.env` for V1 Basic Auth — do not introduce new env var names (per spec §3).
- The V1 API base URL is `https://ssapi.shipstation.com` (per spec, matches `ssapi.shipstation.com` used previously in this project's pre-migration V1 client).
- Cleanup must never change `CreateShippingLabelState.status` or `message`, or throw out of `createShippingLabelAction` (per spec "Error handling").
- `GET /orders` matching: `orderNumber=SEAuto` (starts-with match) AND `orderStatus=awaiting_shipment` — no other filters (per spec §1, "Risks" section — prefix-only matching is an accepted trade-off, not a bug to fix).
- `POST /orders/createorder` requires the full order object, not a partial patch — only mutate `orderStatus` to `"cancelled"` on the object returned by the list call (per spec §1 step 3).
- Individual cancel failures must not stop other orders in the same batch from being cancelled — use `Promise.allSettled`, not `Promise.all` (per spec §1 step 4).
- No Supabase schema changes (per spec "Non-goals").
- `__tests__/unit/actions/shipping.test.ts` is already stale/broken against the current post-V2-migration codebase (it mocks functions like `createLabelForOrder`, `listOrders`, `cancelOrder` that no longer exist in `lib/shipstation/client.ts`). Do not attempt to fix or extend it as part of this plan — it is unrelated pre-existing breakage. Add new tests in a fresh, isolated file instead.

---

### Task 1: V1 ShipStation client — `cancelSeAutoOrders`

**Files:**
- Create: `lib/shipstation/v1-client.ts`
- Test: `__tests__/unit/shipstation/v1-client.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks (this is the foundational module).
- Produces: `export async function cancelSeAutoOrders(): Promise<{ cancelled: number; orderNumbers: string[] }>` — the sole export Task 2 will import and call.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/unit/shipstation/v1-client.test.ts`:

```ts
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

  it("pages through multiple result pages", async () => {
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

    expect(result.cancelled).toBe(2);
    expect(result.orderNumbers.sort()).toEqual(["SEAuto-1", "SEAuto-2"]);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- __tests__/unit/shipstation/v1-client.test.ts`
Expected: FAIL — `Cannot find module '@/lib/shipstation/v1-client'` (or similar resolution error), since the module doesn't exist yet.

- [ ] **Step 3: Implement `lib/shipstation/v1-client.ts`**

```ts
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
      "ShipStation V1 API credentials are not configured. Please set SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET."
    );
  }
  return { apiKey, apiSecret };
}

async function v1Request<TResponse>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
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
  });

  if (!response.ok) {
    let detail: unknown = undefined;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    const message =
      typeof detail === "object" && detail !== null && "ExceptionMessage" in detail
        ? `ShipStation V1 error: ${(detail as { ExceptionMessage: string }).ExceptionMessage}`
        : `ShipStation V1 request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function listSeAutoOrdersPage(page: number): Promise<V1OrdersListResponse> {
  return v1Request<V1OrdersListResponse>(
    `/orders?orderNumber=SEAuto&orderStatus=awaiting_shipment&pageSize=500&page=${page}`
  );
}

async function listAllSeAutoOrders(): Promise<V1Order[]> {
  const allOrders: V1Order[] = [];
  let page = 1;
  while (true) {
    const { orders, pages } = await listSeAutoOrdersPage(page);
    allOrders.push(...orders);
    if (page >= pages) break;
    page += 1;
  }
  return allOrders;
}

/**
 * Cancels every SEAuto- prefixed, still-open ShipStation order.
 * See docs/superpowers/specs/2026-08-10-seauto-order-cleanup-design.md.
 */
export async function cancelSeAutoOrders(): Promise<{
  cancelled: number;
  orderNumbers: string[];
}> {
  const orders = await listAllSeAutoOrders();

  const results = await Promise.allSettled(
    orders.map((order) =>
      v1Request("/orders/createorder", {
        method: "POST",
        body: JSON.stringify({ ...order, orderStatus: "cancelled" }),
      }).then(() => order.orderNumber)
    )
  );

  const orderNumbers: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      orderNumbers.push(result.value);
    } else {
      console.log("Failed to cancel SEAuto order:", result.reason);
    }
  }

  return { cancelled: orderNumbers.length, orderNumbers };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- __tests__/unit/shipstation/v1-client.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/shipstation/v1-client.ts __tests__/unit/shipstation/v1-client.test.ts
git commit -m "feat: add ShipStation V1 client for cancelling SEAuto orders"
```

---

### Task 2: Wire `cancelSeAutoOrders` into `createShippingLabelAction`

**Files:**
- Modify: `lib/actions/shipping.ts:1-33` (imports), `lib/actions/shipping.ts:364-402` (post-`createShipment` block)
- Test: `__tests__/unit/actions/shipping.seauto-cleanup.test.ts` (new, isolated file — see Global Constraints on why not to touch the existing stale `shipping.test.ts`)

**Interfaces:**
- Consumes: `cancelSeAutoOrders(): Promise<{ cancelled: number; orderNumbers: string[] }>` from `@/lib/shipstation/v1-client` (Task 1).
- Produces: nothing new for later tasks — this is the final integration point.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/unit/actions/shipping.seauto-cleanup.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  requireUserProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/addresses", () => ({
  createAddress: vi.fn(),
  getAddressById: vi.fn(),
}));

vi.mock("@/lib/supabase/shipping-labels", () => ({
  incrementOrderNumberSequence: vi.fn(),
  getNextOrderNumber: vi.fn(),
  insertShippingLabel: vi.fn(),
}));

vi.mock("@/lib/shipstation/client", () => ({
  createShipment: vi.fn(),
  voidLabel: vi.fn(),
}));

vi.mock("@/lib/shipstation/v1-client", () => ({
  cancelSeAutoOrders: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getUserUpcharge: vi.fn(),
}));

vi.mock("@/lib/supabase/packages", () => ({
  createPackage: vi.fn(),
  getPackageById: vi.fn(),
  updatePackage: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/warehouses", () => ({
  fetchProfileWarehouseRecord: vi.fn(),
}));

import { requireUserProfile } from "@/lib/auth";
import { getAddressById } from "@/lib/supabase/addresses";
import {
  getNextOrderNumber,
  incrementOrderNumberSequence,
  insertShippingLabel,
} from "@/lib/supabase/shipping-labels";
import { createShipment } from "@/lib/shipstation/client";
import { cancelSeAutoOrders } from "@/lib/shipstation/v1-client";
import { getUserUpcharge } from "@/lib/supabase/admin";
import { fetchProfileWarehouseRecord } from "@/lib/supabase/warehouses";
import { createShippingLabelAction } from "@/lib/actions/shipping";

function setFormValue(formData: FormData, key: string, value: string) {
  formData.set(key, value);
}

function buildFormData() {
  const formData = new FormData();
  setFormValue(formData, "carrierCode", "fedex");
  setFormValue(formData, "serviceCode", "fedex_ground");
  setFormValue(formData, "packages.count", "1");
  setFormValue(formData, "addressId", "new-address");
  setFormValue(formData, "contact_name", "Jane Doe");
  setFormValue(formData, "address_line1", "123 Main St");
  setFormValue(formData, "city", "Austin");
  setFormValue(formData, "state", "TX");
  setFormValue(formData, "postal_code", "78701");
  setFormValue(formData, "country", "US");
  setFormValue(formData, "package-0.id", "new-package");
  setFormValue(formData, "package-0.weight.value", "2.5");
  setFormValue(formData, "package-0.weight.unit", "pounds");
  setFormValue(formData, "package-0.dimensions.length", "10");
  setFormValue(formData, "package-0.dimensions.width", "6");
  setFormValue(formData, "package-0.dimensions.height", "4");
  setFormValue(formData, "package-0.dimensions.unit", "inches");
  return formData;
}

function buildV2LabelResponse() {
  return {
    shipment_id: "se-123",
    label_id: "se-456",
    tracking_number: "TRACK123",
    shipment_cost: { amount: 10, currency: "usd" },
    insurance_cost: { amount: 0, currency: "usd" },
    label_download: { pdf: "base64pdf" },
    packages: [{ tracking_number: "TRACK123" }],
  };
}

const profile = {
  id: "user-1",
  email: "user@example.com",
  full_name: "User",
  role: "user",
  created_at: "",
  updated_at: "",
  warehouse_id: 321,
};

beforeEach(() => {
  vi.mocked(requireUserProfile).mockResolvedValue(profile as any);
  vi.mocked(getUserUpcharge).mockResolvedValue({
    user_id: profile.id,
    unit: "dollars",
    value: 0,
    created_at: "",
    updated_at: "",
  } as any);
  vi.mocked(getNextOrderNumber).mockResolvedValue("ORDER-1");
  vi.mocked(fetchProfileWarehouseRecord).mockResolvedValue({
    originAddress_name: "Warehouse",
    originAddress_company: "",
    originAddress_street1: "1 Warehouse Way",
    originAddress_street2: "",
    originAddress_city: "Austin",
    originAddress_state: "TX",
    originAddress_postalCode: "78701",
    originAddress_country: "US",
    originAddress_phone: "",
    originAddress_residential: false,
  } as any);
  vi.mocked(getAddressById).mockResolvedValue(null as any);
  vi.mocked(createShipment).mockResolvedValue(buildV2LabelResponse() as any);
  vi.mocked(insertShippingLabel).mockResolvedValue({ id: "label-1" } as any);
  vi.mocked(cancelSeAutoOrders).mockResolvedValue({
    cancelled: 0,
    orderNumbers: [],
  });
});

describe("createShippingLabelAction SEAuto cleanup", () => {
  it("calls cancelSeAutoOrders after a successful label creation", async () => {
    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      buildFormData()
    );

    expect(result.status).toBe("success");
    expect(vi.mocked(cancelSeAutoOrders)).toHaveBeenCalledTimes(1);
  });

  it("still returns success when cancelSeAutoOrders rejects", async () => {
    vi.mocked(cancelSeAutoOrders).mockRejectedValue(new Error("V1 API down"));

    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      buildFormData()
    );

    expect(result.status).toBe("success");
    expect(vi.mocked(incrementOrderNumberSequence)).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- __tests__/unit/actions/shipping.seauto-cleanup.test.ts`
Expected: FAIL — `expect(vi.mocked(cancelSeAutoOrders)).toHaveBeenCalledTimes(1)` fails with 0 calls, since `createShippingLabelAction` doesn't call it yet.

- [ ] **Step 3: Add the import and wire the call**

In `lib/actions/shipping.ts`, add the import alongside the existing `createShipment`/`voidLabel` import (near line 18):

```ts
import { createShipment, voidLabel } from "@/lib/shipstation/client";
import { cancelSeAutoOrders } from "@/lib/shipstation/v1-client";
```

Then, in `createShippingLabelAction`, immediately after the `try { labelResponse = await createShipment(...) } catch { ... }` block succeeds (i.e. right after that try/catch, before `const upchargedShipmentCost = ...`, around what is currently line 391), add:

```ts
    try {
      const { cancelled, orderNumbers } = await cancelSeAutoOrders();
      if (cancelled > 0) {
        console.log("Cancelled SEAuto orders:", orderNumbers);
      }
    } catch (cleanupErr) {
      console.log("cancelSeAutoOrders failed:", cleanupErr);
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- __tests__/unit/actions/shipping.seauto-cleanup.test.ts`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full unit test suite to confirm no unrelated regressions**

Run: `npm run test:run`
Expected: The pre-existing failures in `__tests__/unit/actions/shipping.test.ts` are unchanged in count/nature from before this change (confirm by comparing failure output — no *new* failures introduced by this task's edits to `shipping.ts`). All other test files, including the two new ones from this plan, pass.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/shipping.ts __tests__/unit/actions/shipping.seauto-cleanup.test.ts
git commit -m "feat: cancel SEAuto ShipStation orders after label creation"
```

---

## Manual Validation (post-implementation, not automated)

Per spec — no ShipStation sandbox exists for V1/V2 platform users, so this needs a real production check:

1. Create a real multi-package label through the app's UI.
2. Log into ShipStation's dashboard and confirm any `SEAuto-` orders produced by that shipment show status `cancelled` shortly after.
3. Confirm the label/tracking numbers shown in this app's own dashboard are unaffected (unchanged behavior — this was already covered by Task 2's tests, but worth eyeballing once for confidence).
