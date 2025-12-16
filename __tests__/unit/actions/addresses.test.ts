import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  requireUserProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/addresses", () => ({
  createAddress: vi.fn(),
  deleteAddress: vi.fn(),
  getAddressById: vi.fn(),
  updateAddress: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import {
  createAddressAction,
  deleteAddressAction,
  updateAddressAction,
} from "@/lib/actions/addresses";
import { requireUserProfile } from "@/lib/auth";
import {
  createAddress,
  deleteAddress,
  getAddressById,
  updateAddress,
  type AddressRecord,
} from "@/lib/supabase/addresses";

type MockUserProfile = Awaited<ReturnType<typeof requireUserProfile>>;

const profile: MockUserProfile = {
  id: "user-1",
  email: "user@example.com",
  full_name: "User",
  role: "user",
  created_at: "",
  updated_at: "",
  warehouse_id: null,
};

function setFormValue(formData: FormData, key: string, value: string) {
  formData.set(key, value);
}

function buildValidFormData(overrides?: Partial<Record<string, string>>) {
  const formData = new FormData();

  setFormValue(formData, "address_kind", "ship_from");
  setFormValue(formData, "label", "  Warehouse  ");
  setFormValue(formData, "contact_name", "  Jane Doe ");
  setFormValue(formData, "company", "  ");
  setFormValue(formData, "phone", "");
  setFormValue(formData, "email", " test@example.com ");
  setFormValue(formData, "address_line1", " 123 Main St ");
  setFormValue(formData, "address_line2", " Apt 1 ");
  setFormValue(formData, "city", " Austin ");
  setFormValue(formData, "state", " TX ");
  setFormValue(formData, "postal_code", " 78701 ");
  // country omitted to validate defaulting to US.
  setFormValue(formData, "is_residential", "on");
  setFormValue(formData, "is_validated", "true");

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      setFormValue(formData, key, value ?? "");
    }
  }

  return formData;
}

function buildAddressRecord(overrides?: Partial<AddressRecord>): AddressRecord {
  return {
    id: "addr-1",
    user_id: profile.id,
    label: "Warehouse",
    contact_name: "Jane Doe",
    company: null,
    phone: null,
    email: null,
    address_line1: "123 Main St",
    address_line2: null,
    city: "Austin",
    state: "TX",
    postal_code: "78701",
    country: "US",
    is_residential: false,
    is_validated: false,
    address_kind: "ship_from",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(requireUserProfile).mockResolvedValue(profile);
});

describe("createAddressAction", () => {
  it("creates an address and revalidates paths", async () => {
    const saved = buildAddressRecord({ id: "addr-123" });
    vi.mocked(createAddress).mockResolvedValue(saved);

    const formData = buildValidFormData();
    const result = await createAddressAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "success",
      message: "Address saved.",
      address: saved,
      addressId: "addr-123",
    });

    expect(vi.mocked(createAddress)).toHaveBeenCalledWith(
      profile.id,
      expect.objectContaining({
        label: "Warehouse",
        contact_name: "Jane Doe",
        company: null,
        phone: null,
        email: "test@example.com",
        address_line1: "123 Main St",
        address_line2: "Apt 1",
        city: "Austin",
        state: "TX",
        postal_code: "78701",
        country: "US",
        is_residential: true,
        is_validated: true,
        address_kind: "ship_from",
      })
    );

    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(
      "/dashboard/addresses"
    );
  });

  it("returns an error when required fields are missing", async () => {
    const formData = buildValidFormData({ city: "" });

    const result = await createAddressAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Missing required field: city",
    });
    expect(vi.mocked(createAddress)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("returns an error when address kind is invalid", async () => {
    const formData = buildValidFormData({ address_kind: "nope" });

    const result = await createAddressAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "A valid address type is required.",
    });
    expect(vi.mocked(createAddress)).not.toHaveBeenCalled();
  });
});

describe("updateAddressAction", () => {
  it("updates an address and revalidates paths", async () => {
    const existing = buildAddressRecord({
      id: "addr-1",
      address_kind: "ship_from",
    });
    const updated = buildAddressRecord({
      id: "addr-1",
      label: "Updated",
      address_kind: "ship_to",
    });

    vi.mocked(getAddressById).mockResolvedValue(existing);
    vi.mocked(updateAddress).mockResolvedValue(updated);

    const formData = buildValidFormData({
      address_id: "addr-1",
      address_kind: "ship_to",
      label: "Updated",
      is_residential: "0",
      is_validated: "1",
    });

    const result = await updateAddressAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "success",
      message: "Address updated.",
      address: updated,
      addressId: "addr-1",
    });

    expect(vi.mocked(getAddressById)).toHaveBeenCalledWith(
      "addr-1",
      profile.id
    );
    expect(vi.mocked(updateAddress)).toHaveBeenCalledWith(
      "addr-1",
      profile.id,
      expect.objectContaining({
        label: "Updated",
        address_kind: "ship_to",
        is_residential: false,
        is_validated: true,
      })
    );

    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(
      "/dashboard/addresses"
    );
  });

  it("falls back to existing address kind when missing from form data", async () => {
    const existing = buildAddressRecord({
      id: "addr-1",
      address_kind: "ship_from",
    });
    const updated = buildAddressRecord({
      id: "addr-1",
      address_kind: "ship_from",
    });

    vi.mocked(getAddressById).mockResolvedValue(existing);
    vi.mocked(updateAddress).mockResolvedValue(updated);

    const formData = buildValidFormData({
      address_id: "addr-1",
    });
    formData.delete("address_kind");

    const result = await updateAddressAction({ status: "idle" }, formData);

    expect(result.status).toBe("success");
    expect(vi.mocked(updateAddress)).toHaveBeenCalledWith(
      "addr-1",
      profile.id,
      expect.objectContaining({ address_kind: "ship_from" })
    );
  });

  it("returns an error when the address identifier is missing", async () => {
    const result = await updateAddressAction(
      { status: "idle" },
      buildValidFormData()
    );

    expect(result).toEqual({
      status: "error",
      message: "Address identifier is required.",
    });
    expect(vi.mocked(getAddressById)).not.toHaveBeenCalled();
    expect(vi.mocked(updateAddress)).not.toHaveBeenCalled();
  });

  it("returns an error when the address is not found", async () => {
    vi.mocked(getAddressById).mockResolvedValue(null);

    const formData = buildValidFormData({ address_id: "missing" });
    const result = await updateAddressAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Address not found.",
    });
    expect(vi.mocked(updateAddress)).not.toHaveBeenCalled();
  });
});

describe("deleteAddressAction", () => {
  it("deletes an address and revalidates paths", async () => {
    vi.mocked(deleteAddress).mockResolvedValue(undefined);

    const formData = new FormData();
    setFormValue(formData, "address_id", "addr-1");

    const result = await deleteAddressAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "success",
      message: "Address deleted.",
      address: null,
      addressId: "addr-1",
    });

    expect(vi.mocked(deleteAddress)).toHaveBeenCalledWith("addr-1", profile.id);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/dashboard");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(
      "/dashboard/addresses"
    );
  });

  it("returns an error when the address identifier is missing", async () => {
    const result = await deleteAddressAction(
      { status: "idle" },
      new FormData()
    );

    expect(result).toEqual({
      status: "error",
      message: "Address identifier is required.",
    });
    expect(vi.mocked(deleteAddress)).not.toHaveBeenCalled();
  });

  it("returns the fallback error message for non-Error throws", async () => {
    vi.mocked(deleteAddress).mockRejectedValue("boom");

    const formData = new FormData();
    setFormValue(formData, "address_id", "addr-1");

    const result = await deleteAddressAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Unable to delete address.",
    });
  });
});
