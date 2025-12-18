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
  createLabel: vi.fn(),
  createLabelForOrder: vi.fn(),
  createOrder: vi.fn(),
  listOrders: vi.fn(),
  voidLabel: vi.fn(),
  cancelOrder: vi.fn(),
  deleteOrder: vi.fn(),
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

import { revalidatePath } from "next/cache";

import { requireUserProfile } from "@/lib/auth";
import { createAddress, getAddressById } from "@/lib/supabase/addresses";
import {
  getNextOrderNumber,
  insertShippingLabel,
} from "@/lib/supabase/shipping-labels";
import {
  createLabel,
  createLabelForOrder,
  createOrder,
  listOrders,
  voidLabel,
  cancelOrder,
} from "@/lib/shipstation/client";

import { getUserUpcharge } from "@/lib/supabase/admin";
import {
  createPackage,
  getPackageById,
  updatePackage,
} from "@/lib/supabase/packages";
import { createClient } from "@/lib/supabase/server";

import {
  createShippingLabelAction,
  deleteShippingLabel,
  voidShippingLabelAction,
} from "@/lib/actions/shipping";

type MockUserProfile = Awaited<ReturnType<typeof requireUserProfile>>;

function setFormValue(formData: FormData, key: string, value: string) {
  formData.set(key, value);
}

function buildNewAddress(formData: FormData, prefix: "from" | "to") {
  setFormValue(formData, `${prefix}.contact_name`, "Jane Doe");
  setFormValue(formData, `${prefix}.address_line1`, "123 Main St");
  setFormValue(formData, `${prefix}.city`, "Austin");
  setFormValue(formData, `${prefix}.state`, "TX");
  setFormValue(formData, `${prefix}.postal_code`, "78701");
  setFormValue(formData, `${prefix}.country`, "US");
}

function buildBaseFormData() {
  const formData = new FormData();

  setFormValue(formData, "carrierCode", "fedex");
  setFormValue(formData, "serviceCode", "fedex_ground");
  setFormValue(formData, "packages.count", "1");

  setFormValue(formData, "from.addressId", "new-address");
  setFormValue(formData, "to.addressId", "new-address");
  buildNewAddress(formData, "from");
  buildNewAddress(formData, "to");

  setFormValue(formData, "package-0.id", "new-package");
  setFormValue(formData, "package-0.weight.value", "2.5");
  setFormValue(formData, "package-0.weight.unit", "pounds");
  setFormValue(formData, "package-0.dimensions.length", "10");
  setFormValue(formData, "package-0.dimensions.width", "6");
  setFormValue(formData, "package-0.dimensions.height", "4");
  setFormValue(formData, "package-0.dimensions.unit", "inches");

  return formData;
}

function buildShipStationLabelResponse(
  overrides?: Partial<Record<string, unknown>>
) {
  return {
    shipmentId: 123,
    shipmentCost: 10,
    insuranceCost: 1,
    trackingNumber: "TRACK123",
    labelData: "base64pdf",
    ...overrides,
  };
}

function buildShipStationOrder(overrides?: Partial<Record<string, unknown>>) {
  return {
    orderId: 99,
    orderNumber: "ORDER-1",
    orderStatus: "awaiting_shipment",
    ...overrides,
  };
}

function buildSavedLabel(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "label-1",
    user_id: "user-1",
    from_address_id: null,
    to_address_id: null,
    ship_from_snapshot: {},
    ship_to_snapshot: {},
    carrier_code: "fedex",
    service_code: "fedex_ground",
    package_code: "package",
    length: 10,
    width: 6,
    height: 4,
    units: "inches",
    weight_value: 2.5,
    weight_unit: "pounds",
    confirmation: "delivery",
    shipment_cost: 10,
    insurance_cost: 1,
    total_shipment_cost: 10,
    total_insurance_cost: 1,
    tracking_number: "TRACK123",
    label_data_base64: "base64pdf",
    created_at: new Date().toISOString(),
    shipment_id: 123,
    voided_at: null,
    paid_at: null,
    is_address_validated: false,
    insurance_options: {
      provider: "none",
      insureShipment: false,
      insuredValue: 0,
    },
    advanced_options: { saturdayDelivery: false },
    ...overrides,
  };
}

function createSupabaseShippingLabelsStub() {
  const responses = {
    maybeSingle: { data: null as any, error: null as any },
    single: { data: null as any, error: null as any },
    selectAwait: { data: null as any, error: null as any },
  };

  const query: any = {
    select: vi.fn((_columns?: string) => query),
    update: vi.fn((_values: unknown) => query),
    eq: vi.fn((_col: string, _val: unknown) => query),
    maybeSingle: vi.fn(async () => responses.maybeSingle),
    single: vi.fn(async () => responses.single),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(responses.selectAwait).then(onFulfilled, onRejected),
  };

  const supabase = {
    from: vi.fn((_table: string) => query),
  };

  return { supabase, query, responses };
}

const profile: MockUserProfile = {
  id: "user-1",
  email: "user@example.com",
  full_name: "User",
  role: "user",
  created_at: "",
  updated_at: "",
  warehouse_id: 321,
};

beforeEach(() => {
  vi.mocked(requireUserProfile).mockResolvedValue(profile);
  vi.mocked(getUserUpcharge).mockResolvedValue({
    user_id: profile.id,
    unit: "dollars",
    value: 0,
    created_at: "",
    updated_at: "",
  });

  vi.mocked(getNextOrderNumber).mockResolvedValue("ORDER-1");
  vi.mocked(listOrders).mockResolvedValue({ total: 0, orders: [] } as any);
  vi.mocked(createOrder).mockResolvedValue(
    buildShipStationOrder({ orderId: 101 }) as any
  );

  vi.mocked(createLabelForOrder).mockResolvedValue(
    buildShipStationLabelResponse() as any
  );
  vi.mocked(createLabel).mockResolvedValue(
    buildShipStationLabelResponse({ shipmentId: 555 }) as any
  );
  vi.mocked(insertShippingLabel).mockResolvedValue(buildSavedLabel() as any);

  vi.mocked(createAddress).mockResolvedValue({ id: "addr-1" } as any);
  vi.mocked(getAddressById).mockResolvedValue({ id: "addr-1" } as any);

  vi.mocked(createPackage).mockResolvedValue({ id: "pkg-1" } as any);
  vi.mocked(updatePackage).mockResolvedValue({ id: "pkg-1" } as any);
  vi.mocked(getPackageById).mockResolvedValue(null as any);
});

describe("createShippingLabelAction", () => {
  it("returns an error when carrierCode is missing", async () => {
    const formData = buildBaseFormData();
    formData.delete("carrierCode");

    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      formData
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Carrier code is required.");
  });

  it("creates an order + label-for-order and inserts upcharged totals", async () => {
    const formData = buildBaseFormData();

    vi.mocked(getUserUpcharge).mockResolvedValue({
      user_id: profile.id,
      unit: "percent",
      value: 10,
      created_at: "",
      updated_at: "",
    });
    vi.mocked(createOrder).mockResolvedValue(
      buildShipStationOrder({ orderId: 777 }) as any
    );
    vi.mocked(createLabelForOrder).mockResolvedValue(
      buildShipStationLabelResponse({
        shipmentId: 42,
        shipmentCost: 10,
        insuranceCost: 1,
      }) as any
    );

    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      formData
    );
    console.log("result: ", result);
    expect(result.status).toBe("success");
    expect(result.items?.length).toBe(1);
    expect(vi.mocked(createLabelForOrder)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createLabel)).not.toHaveBeenCalled();

    expect(vi.mocked(insertShippingLabel)).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: profile.id,
        shipment_id: 42,
        total_shipment_cost: 11,
        total_insurance_cost: 1.1,
        carrier_code: "fedex",
        service_code: "fedex_ground",
      })
    );

    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
  });

  it("reuses an existing non-cancelled ShipStation order", async () => {
    const formData = buildBaseFormData();

    vi.mocked(listOrders).mockResolvedValue({
      total: 1,
      orders: [{ orderId: 500, orderStatus: "awaiting_shipment" }],
    } as any);

    await createShippingLabelAction({ status: "idle" } as any, formData);

    expect(vi.mocked(createOrder)).not.toHaveBeenCalled();
    expect(vi.mocked(createLabelForOrder)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 500,
      })
    );
  });

  it("uses createLabel when getNextOrderNumber returns an empty string", async () => {
    const formData = buildBaseFormData();

    vi.mocked(getNextOrderNumber).mockResolvedValue("");

    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      formData
    );

    expect(result.status).toBe("success");
    expect(vi.mocked(createLabel)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createLabelForOrder)).not.toHaveBeenCalled();
  });

  it("creates a saved package when package id is new-package and save is on", async () => {
    const formData = buildBaseFormData();
    setFormValue(formData, "package-0.save", "on");
    setFormValue(formData, "package-0.nickname", "My Box");

    await createShippingLabelAction({ status: "idle" } as any, formData);

    expect(vi.mocked(createPackage)).toHaveBeenCalledWith(
      profile.id,
      expect.objectContaining({
        nickname: "My Box",
        weight: 2.5,
        weight_unit: "pounds",
        length: 10,
        width: 6,
        height: 4,
        dimension_unit: "inches",
      })
    );
  });

  it("uses a saved package when save is off", async () => {
    const formData = buildBaseFormData();
    setFormValue(formData, "package-0.id", "pkg-123");

    vi.mocked(getPackageById).mockResolvedValue({
      id: "pkg-123",
      user_id: profile.id,
      weight: 3,
      weight_unit: "pounds",
      length: 9,
      width: 8,
      height: 7,
      dimension_unit: "inches",
    } as any);

    await createShippingLabelAction({ status: "idle" } as any, formData);

    expect(vi.mocked(getPackageById)).toHaveBeenCalledWith(
      "pkg-123",
      profile.id
    );
    expect(vi.mocked(createLabelForOrder)).toHaveBeenCalledWith(
      expect.objectContaining({
        weight: expect.objectContaining({ value: 3, units: "pounds" }),
        dimensions: expect.objectContaining({
          length: 9,
          width: 8,
          height: 7,
          units: "inches",
        }),
      })
    );
  });

  it("updates an existing package when save is on for a non-new id", async () => {
    const formData = buildBaseFormData();
    setFormValue(formData, "package-0.id", "pkg-123");
    setFormValue(formData, "package-0.save", "on");
    setFormValue(formData, "package-0.nickname", "Updated");

    await createShippingLabelAction({ status: "idle" } as any, formData);

    expect(vi.mocked(updatePackage)).toHaveBeenCalledWith(
      "pkg-123",
      profile.id,
      expect.objectContaining({
        nickname: "Updated",
        weight: 2.5,
        weight_unit: "pounds",
      })
    );
    expect(vi.mocked(getPackageById)).not.toHaveBeenCalled();
  });

  it("includes carrier insurance when provider is carrier and insuredValue is positive", async () => {
    const formData = buildBaseFormData();
    setFormValue(formData, "package-0.insuranceOptions.provider", "carrier");
    setFormValue(formData, "package-0.insuranceOptions.insuredValue", "123.45");

    await createShippingLabelAction({ status: "idle" } as any, formData);

    expect(vi.mocked(createLabelForOrder)).toHaveBeenCalledWith(
      expect.objectContaining({
        insuranceOptions: {
          provider: "carrier",
          insureShipment: true,
          insuredValue: 123.45,
        },
      })
    );

    expect(vi.mocked(insertShippingLabel)).toHaveBeenCalledWith(
      expect.objectContaining({
        insurance_options: {
          provider: "carrier",
          insureShipment: true,
          insuredValue: 123.45,
        },
      })
    );
  });

  it("returns partial when some packages fail", async () => {
    const formData = buildBaseFormData();
    setFormValue(formData, "packages.count", "2");
    setFormValue(formData, "package-1.id", "new-package");
    setFormValue(formData, "package-1.weight.value", "1");
    setFormValue(formData, "package-1.weight.unit", "pounds");

    vi.mocked(createLabelForOrder)
      .mockResolvedValueOnce(
        buildShipStationLabelResponse({ shipmentId: 1 }) as any
      )
      .mockRejectedValueOnce(new Error("ShipStation down"));

    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      formData
    );

    expect(result.status).toBe("partial");
    expect(result.message).toBe("1/2 labels created.");
    expect(result.items?.length).toBe(2);
    expect(result.items?.[1]).toEqual(
      expect.objectContaining({
        ok: false,
        error: "ShipStation down",
      })
    );
  });

  it("creates labels for multiple packages when user provides details for each package", async () => {
    const formData = buildBaseFormData();
    setFormValue(formData, "packages.count", "2");

    setFormValue(formData, "package-1.id", "new-package");
    setFormValue(formData, "package-1.weight.value", "1.25");
    setFormValue(formData, "package-1.weight.unit", "pounds");
    setFormValue(formData, "package-1.dimensions.length", "12");
    setFormValue(formData, "package-1.dimensions.width", "8");
    setFormValue(formData, "package-1.dimensions.height", "5");
    setFormValue(formData, "package-1.dimensions.unit", "inches");

    vi.mocked(createLabelForOrder)
      .mockResolvedValueOnce(
        buildShipStationLabelResponse({ shipmentId: 111 }) as any
      )
      .mockResolvedValueOnce(
        buildShipStationLabelResponse({ shipmentId: 222 }) as any
      );

    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      formData
    );

    expect(result.status).toBe("success");
    expect(result.items?.length).toBe(2);
    expect(result.items?.every((item) => item.ok)).toBe(true);

    expect(vi.mocked(createLabelForOrder)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createLabelForOrder)).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        weight: expect.objectContaining({ value: 2.5, units: "pounds" }),
        dimensions: expect.objectContaining({
          length: 10,
          width: 6,
          height: 4,
          units: "inches",
        }),
      })
    );
    expect(vi.mocked(createLabelForOrder)).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        weight: expect.objectContaining({ value: 1.25, units: "pounds" }),
        dimensions: expect.objectContaining({
          length: 12,
          width: 8,
          height: 5,
          units: "inches",
        }),
      })
    );

    expect(vi.mocked(insertShippingLabel)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(insertShippingLabel)).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        shipment_id: 111,
        weight_value: 2.5,
        weight_unit: "pounds",
      })
    );
    expect(vi.mocked(insertShippingLabel)).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        shipment_id: 222,
        weight_value: 1.25,
        weight_unit: "pounds",
      })
    );
  });

  it("rolls back the carrier label when database insert fails", async () => {
    const formData = buildBaseFormData();

    vi.mocked(createLabelForOrder).mockResolvedValue(
      buildShipStationLabelResponse({ shipmentId: 808 }) as any
    );
    vi.mocked(insertShippingLabel).mockRejectedValue(new Error("db fail"));
    vi.mocked(voidLabel).mockResolvedValue({ approved: true } as any);

    const result = await createShippingLabelAction(
      { status: "idle" } as any,
      formData
    );

    expect(result.status).toBe("error");
    expect(result.items?.[0]).toEqual(
      expect.objectContaining({
        ok: false,
        error: "db fail",
      })
    );
    expect(vi.mocked(voidLabel)).toHaveBeenCalledWith(808);
  });
});

describe("voidShippingLabelAction", () => {
  it("returns a failure result when no shipment IDs are provided", async () => {
    const formData = new FormData();
    setFormValue(formData, "shipment_ids", "[]");
    setFormValue(formData, "path", "/dashboard");

    const result = await voidShippingLabelAction(formData);

    expect(result).toEqual({
      success: false,
      message: "No shipment IDs provided.",
    });
    expect(vi.mocked(requireUserProfile)).not.toHaveBeenCalled();
  });

  it("does nothing when already voided (no carrier call, no update)", async () => {
    const formData = new FormData();
    setFormValue(formData, "shipment_ids", "[123]");
    setFormValue(formData, "path", "/dashboard");

    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingle = {
      data: {
        id: "x",
        user_id: profile.id,
        voided_at: "2025-01-01T00:00:00Z",
        order_id: null,
      },
      error: null,
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await voidShippingLabelAction(formData);

    expect(result).toEqual({
      success: true,
      message: "Labels voided successfully.",
    });
    expect(vi.mocked(voidLabel)).not.toHaveBeenCalled();
    expect(query.update).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
  });

  it("voids the label and does not cancel the order when not all labels are voided", async () => {
    const formData = new FormData();
    setFormValue(formData, "shipment_ids", "[123]");
    setFormValue(formData, "path", "/dashboard");

    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingle = {
      data: {
        id: "x",
        user_id: profile.id,
        voided_at: null,
        order_id: 999,
      },
      error: null,
    };
    responses.single = {
      data: { id: "x", voided_at: new Date().toISOString() },
      error: null,
    };
    responses.selectAwait = {
      data: [
        { shipment_id: 123, voided_at: null },
        { shipment_id: 456, voided_at: null },
      ],
      error: null,
    };

    vi.mocked(createClient).mockResolvedValue(supabase as any);
    vi.mocked(voidLabel).mockResolvedValue({ approved: true } as any);

    const result = await voidShippingLabelAction(formData);

    expect(result).toEqual({
      success: true,
      message: "Labels voided successfully.",
    });
    expect(vi.mocked(voidLabel)).toHaveBeenCalledWith(123);
    expect(query.update).toHaveBeenCalled();
    expect(vi.mocked(cancelOrder)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
  });

  it("voids the label and cancels the order when all labels are voided or being voided", async () => {
    const formData = new FormData();
    setFormValue(formData, "shipment_ids", "[123]");
    setFormValue(formData, "path", "/dashboard");

    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingle = {
      data: {
        id: "x",
        user_id: profile.id,
        voided_at: null,
        order_id: 999,
      },
      error: null,
    };
    responses.single = {
      data: { id: "x", voided_at: new Date().toISOString() },
      error: null,
    };
    responses.selectAwait = {
      data: [{ shipment_id: 123, voided_at: "VOIDED" }],
      error: null,
    };

    vi.mocked(createClient).mockResolvedValue(supabase as any);
    vi.mocked(voidLabel).mockResolvedValue({ approved: true } as any);

    const result = await voidShippingLabelAction(formData);

    expect(result).toEqual({
      success: true,
      message: "Labels voided successfully.",
    });
    expect(vi.mocked(voidLabel)).toHaveBeenCalledWith(123);
    expect(query.update).toHaveBeenCalled();
    expect(vi.mocked(cancelOrder)).toHaveBeenCalledWith(999);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
  });
});

describe("deleteShippingLabel", () => {
  it("marks a label as deleted", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.selectAwait = { data: [{ id: "label-1" }], error: null };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(deleteShippingLabel("label-1")).resolves.toBeUndefined();

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      })
    );
  });

  it("throws when the database update fails", async () => {
    const { supabase, responses } = createSupabaseShippingLabelsStub();
    responses.selectAwait = { data: null, error: { message: "DB error" } };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(deleteShippingLabel("label-1")).rejects.toThrow("DB error");
  });
});
