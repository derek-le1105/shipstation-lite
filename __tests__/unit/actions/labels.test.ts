import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/shipstation/client", () => ({
  voidLabel: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { voidLabel } from "@/lib/shipstation/client";

import {
  bulkUpdatePaidStatus,
  bulkVoidShippingLabels,
  updatePaidStatus,
  voidShippingLabel,
} from "@/lib/actions/labels";

type SupabaseResponse<T> = { data: T; error: { message: string } | null };

function createSupabaseShippingLabelsStub() {
  const responses = {
    maybeSingleQueue: [] as Array<SupabaseResponse<any>>,
    singleQueue: [] as Array<SupabaseResponse<any>>,
    selectAwaitQueue: [] as Array<SupabaseResponse<any>>,
  };

  const defaultResponse: SupabaseResponse<any> = { data: null, error: null };

  const query: any = {
    select: vi.fn((_columns?: string) => query),
    update: vi.fn((_values: unknown) => query),
    eq: vi.fn((_col: string, _val: unknown) => query),
    in: vi.fn((_col: string, _val: unknown[]) => query),
    maybeSingle: vi.fn(
      async () => responses.maybeSingleQueue.shift() ?? defaultResponse
    ),
    single: vi.fn(async () => responses.singleQueue.shift() ?? defaultResponse),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(responses.selectAwaitQueue.shift() ?? defaultResponse).then(
        onFulfilled,
        onRejected
      ),
  };

  const supabase = {
    from: vi.fn((_table: string) => query),
  };

  return { supabase, query, responses };
}

beforeEach(() => {
  vi.mocked(voidLabel).mockResolvedValue({ approved: true, message: "" } as any);
});

describe("updatePaidStatus", () => {
  it("throws when fetching the label fails", async () => {
    const { supabase, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingleQueue.push({
      data: null,
      error: { message: "DB down" },
    });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(updatePaidStatus(123, "paid")).rejects.toThrow("DB down");
    expect(console.log).toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("throws when the label is not found", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingleQueue.push({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(updatePaidStatus(123, "paid")).rejects.toThrow(
      "Label not found!"
    );
    expect(query.update).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("returns early when the label is already paid", async () => {
    const paidAt = "2025-01-02T00:00:00.000Z";

    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingleQueue.push({
      data: { id: "label-1", shipment_id: 123, paid_at: paidAt },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(updatePaidStatus(123, "unpaid")).resolves.toEqual({
      message: `Label already paid on ${new Date(paidAt).toDateString()}`,
      shipment_id: 123,
      success: true,
    });

    expect(query.update).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("returns an error when the update fails", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingleQueue.push({
      data: { id: "label-1", shipment_id: 123, paid_at: null },
      error: null,
    });
    responses.singleQueue.push({ data: null, error: { message: "Update failed" } });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(updatePaidStatus(123, "paid")).resolves.toEqual({
      message: "Update failed",
      success: false,
      shipment_id: 123,
    });

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        paid_at: expect.any(String),
      })
    );
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("updates the label and revalidates", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.maybeSingleQueue.push({
      data: { id: "label-1", shipment_id: 123, paid_at: null },
      error: null,
    });
    responses.singleQueue.push({
      data: { id: "label-1", shipment_id: 999, paid_at: new Date().toISOString() },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(updatePaidStatus(123, "paid")).resolves.toEqual({
      message: "Succesfully updated label.",
      shipment_id: 999,
      success: true,
    });

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        paid_at: expect.any(String),
      })
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/labels");
  });
});

describe("bulkUpdatePaidStatus", () => {
  it("throws when fetching labels fails", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.selectAwaitQueue.push({ data: null, error: { message: "DB down" } });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(bulkUpdatePaidStatus([1, 2], "paid")).rejects.toThrow("DB down");
    expect(query.update).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("throws when labels are missing", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.selectAwaitQueue.push({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(bulkUpdatePaidStatus([1, 2], "paid")).rejects.toThrow(
      "Labels not found!"
    );
    expect(query.update).not.toHaveBeenCalled();
  });

  it("returns an error when the bulk update fails", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.selectAwaitQueue.push({ data: [{ id: "x" }], error: null });
    responses.selectAwaitQueue.push({
      data: null,
      error: { message: "Update failed" },
    });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(bulkUpdatePaidStatus([1, 2], "paid")).resolves.toEqual({
      message: "Update failed",
      success: false,
    });

    expect(query.update).toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("updates and revalidates on success", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    responses.selectAwaitQueue.push({ data: [{ id: "x" }], error: null });
    responses.selectAwaitQueue.push({ data: [{ id: "x" }], error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(bulkUpdatePaidStatus([1, 2], "unpaid")).resolves.toEqual({
      message: "Succesfully updated label.",
      success: true,
    });

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        paid_at: null,
      })
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/labels");
  });
});

describe("voidShippingLabel", () => {
  it("returns a failure when the carrier denies voiding", async () => {
    const { supabase, query } = createSupabaseShippingLabelsStub();
    vi.mocked(createClient).mockResolvedValue(supabase as any);
    vi.mocked(voidLabel).mockResolvedValue({
      approved: false,
      message: "Denied",
    } as any);

    await expect(voidShippingLabel(123, "admin")).resolves.toEqual({
      message: "Denied",
      success: false,
    });

    expect(vi.mocked(voidLabel)).toHaveBeenCalledWith(123);
    expect(query.update).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("returns a failure when the database update fails", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    vi.mocked(createClient).mockResolvedValue(supabase as any);
    responses.singleQueue.push({ data: null, error: { message: "DB error" } });

    await expect(voidShippingLabel(123, "admin")).resolves.toEqual({
      message: "DB error",
      success: false,
    });

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        voided_at: expect.any(String),
      })
    );
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("voids the label and revalidates on success", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    vi.mocked(createClient).mockResolvedValue(supabase as any);
    responses.singleQueue.push({ data: { id: "label-1" }, error: null });

    await expect(voidShippingLabel(456, "dashboard")).resolves.toEqual({
      message: "Succesfully voided label",
      success: true,
    });

    expect(vi.mocked(voidLabel)).toHaveBeenCalledWith(456);
    expect(query.update).toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("dashboard/labels");
  });

  it("returns undefined when voiding throws", async () => {
    const { supabase, query } = createSupabaseShippingLabelsStub();
    vi.mocked(createClient).mockResolvedValue(supabase as any);
    vi.mocked(voidLabel).mockRejectedValue(new Error("Boom"));

    await expect(voidShippingLabel(123, "admin")).resolves.toBeUndefined();
    expect(query.update).not.toHaveBeenCalled();
  });
});

describe("bulkVoidShippingLabels", () => {
  it("voids multiple labels and revalidates on success", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    vi.mocked(createClient).mockResolvedValue(supabase as any);
    responses.selectAwaitQueue.push({ data: [{ id: "label-1" }], error: null });
    vi.mocked(voidLabel)
      .mockResolvedValueOnce({ approved: true, message: "" } as any)
      .mockResolvedValueOnce({ approved: true, message: "" } as any);

    await expect(
      bulkVoidShippingLabels([1, 2], "dashboard")
    ).resolves.toEqual({
      message: "Succesfully voided label",
      success: true,
    });

    expect(vi.mocked(voidLabel)).toHaveBeenCalledWith(1);
    expect(vi.mocked(voidLabel)).toHaveBeenCalledWith(2);
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        voided_at: expect.any(String),
      })
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("dashboard/labels");
  });

  it("returns a failure when the database update fails", async () => {
    const { supabase, query, responses } = createSupabaseShippingLabelsStub();
    vi.mocked(createClient).mockResolvedValue(supabase as any);
    responses.selectAwaitQueue.push({ data: null, error: { message: "DB error" } });

    await expect(bulkVoidShippingLabels([1, 2], "admin")).resolves.toEqual({
      message: "DB error",
      success: false,
    });

    expect(query.update).toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("returns undefined when voiding throws", async () => {
    const { supabase, query } = createSupabaseShippingLabelsStub();
    vi.mocked(createClient).mockResolvedValue(supabase as any);
    vi.mocked(voidLabel).mockRejectedValue(new Error("Boom"));

    await expect(bulkVoidShippingLabels([1, 2], "admin")).resolves.toBeUndefined();
    expect(query.update).not.toHaveBeenCalled();
  });
});

