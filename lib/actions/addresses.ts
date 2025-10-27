"use server";

import { revalidatePath } from "next/cache";

import { requireUserProfile } from "@/lib/auth";
import {
  createAddress,
  deleteAddress,
  getAddressById,
  updateAddress,
  type AddressInput,
  type AddressRecord,
} from "@/lib/supabase/addresses";

export type AddressMutationState =
  | { status: "idle" }
  | {
      status: "success";
      message: string;
      address: AddressRecord | null;
      addressId: string | null;
    }
  | { status: "error"; message: string };

function parseAddressKind(
  value: FormDataEntryValue | null
): AddressInput["address_kind"] {
  if (value === "ship_from" || value === "ship_to") {
    return value;
  }

  throw new Error("A valid address type is required.");
}

function parseCheckbox(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized === "true" || normalized === "on" || normalized === "1";
}

function toNullable(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseAddressInput(
  formData: FormData,
  kind: AddressInput["address_kind"]
): AddressInput {
  const getString = (key: string): string | null => {
    const raw = formData.get(key);
    return typeof raw === "string" ? raw.trim() : null;
  };

  const required = [
    "contact_name",
    "address_line1",
    "city",
    "state",
    "postal_code",
  ];
  for (const field of required) {
    const value = getString(field);
    if (!value) {
      throw new Error(`Missing required field: ${field.replaceAll("_", " ")}`);
    }
  }

  return {
    label: toNullable(getString("label")),
    contact_name: getString("contact_name")!,
    company: toNullable(getString("company")),
    phone: toNullable(getString("phone")),
    email: toNullable(getString("email")),
    address_line1: getString("address_line1")!,
    address_line2: toNullable(getString("address_line2")),
    city: getString("city")!,
    state: getString("state")!,
    postal_code: getString("postal_code")!,
    country: getString("country") ?? "US",
    is_residential: parseCheckbox(formData.get("is_residential")),
    address_kind: kind,
  };
}

function handleError(error: unknown, fallback: string): AddressMutationState {
  const message = error instanceof Error ? error.message : fallback;
  return {
    status: "error",
    message,
  };
}

function revalidateAddressPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/addresses");
}

export async function createAddressAction(
  _prev: AddressMutationState,
  formData: FormData
): Promise<AddressMutationState> {
  try {
    const profile = await requireUserProfile();
    const kind = parseAddressKind(formData.get("address_kind"));
    const input = parseAddressInput(formData, kind);

    const address = await createAddress(profile.id, input);
    revalidateAddressPaths();

    return {
      status: "success",
      message: "Address saved.",
      address,
      addressId: address.id,
    };
  } catch (error) {
    return handleError(error, "Unable to save address.");
  }
}

export async function updateAddressAction(
  _prev: AddressMutationState,
  formData: FormData
): Promise<AddressMutationState> {
  try {
    const profile = await requireUserProfile();
    const idRaw = formData.get("address_id");

    if (typeof idRaw !== "string" || idRaw.trim().length === 0) {
      throw new Error("Address identifier is required.");
    }

    const address = await getAddressById(idRaw, profile.id);

    if (!address) {
      throw new Error("Address not found.");
    }

    const kind = parseAddressKind(
      formData.get("address_kind") ?? address.address_kind
    );
    const input = parseAddressInput(formData, kind);
    const updated = await updateAddress(address.id, profile.id, input);

    revalidateAddressPaths();

    return {
      status: "success",
      message: "Address updated.",
      address: updated,
      addressId: updated.id,
    };
  } catch (error) {
    return handleError(error, "Unable to update address.");
  }
}

export async function deleteAddressAction(
  _prev: AddressMutationState,
  formData: FormData
): Promise<AddressMutationState> {
  try {
    const profile = await requireUserProfile();
    const idRaw = formData.get("address_id");

    if (typeof idRaw !== "string" || idRaw.trim().length === 0) {
      throw new Error("Address identifier is required.");
    }

    await deleteAddress(idRaw, profile.id);

    revalidateAddressPaths();

    return {
      status: "success",
      message: "Address deleted.",
      address: null,
      addressId: idRaw,
    };
  } catch (error) {
    console.log(error);
    return handleError(error, "Unable to delete address.");
  }
}
