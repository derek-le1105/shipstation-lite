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
