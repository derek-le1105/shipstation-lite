"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth";
import {
  createPackage,
  deletePackage,
  getPackageById,
  PackageInput,
  PackageRecord,
  updatePackage,
} from "../supabase/packages";

function parsePackageInput(formData: FormData): PackageInput {
  const getNumber = (key: string): number => {
    const value = formData.get(key);
    if (typeof value !== "string") {
      throw new Error(`Missing form value for ${key}`);
    }
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number for ${key}`);
    }
    return parsed;
  };

  return {
    length: getNumber("length"),
    width: getNumber("width"),
    height: getNumber("height"),
    dimension_unit: formData.get("dimension_unit") as "inches" | "centimeters",
    weight: getNumber("weight"),
    weight_unit: formData.get("weight_unit") as "pounds" | "ounces" | "grams",
    nickname: formData.get("nickname") as string,
    service_code: formData.get("service_code") as string | null,
    carrier_code: formData.get("carrier_code") as string | null,
  };
}

export type PackageMutationState =
  | { status: "idle" }
  | {
      status: "success";
      message: string;
      package: PackageRecord | null;
      packageId: string | null;
    }
  | { status: "error"; message: string };

export async function createPackageAction(
  _prev: PackageMutationState,
  formData: FormData
): Promise<PackageMutationState> {
  try {
    const profile = await requireUserProfile();
    const input = parsePackageInput(formData);
    console.log("input:", input);
    const pkg = await createPackage(profile.id, input);
    revalidatePath("/dashboard/packages");
    return {
      status: "success",
      message: "Package created successfully.",
      package: pkg,
      packageId: pkg.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: (error as Error).message,
    };
  }
}

export async function updatePackageAction(
  _prev: PackageMutationState,
  formData: FormData
): Promise<PackageMutationState> {
  try {
    const profile = await requireUserProfile();
    const idRaw = formData.get("package_id");

    if (typeof idRaw !== "string" || idRaw.trim().length === 0) {
      throw new Error("Package identifier is required.");
    }

    const pkg = await getPackageById(idRaw, profile.id);
    if (!pkg) throw new Error("Package not found.");

    const input = parsePackageInput(formData);
    const updated = await updatePackage(pkg.id, profile.id, input);
    revalidatePath("/dashboard/packages");

    return {
      status: "success",
      message: "Package updated successfully.",
      package: updated,
      packageId: updated.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: (error as Error).message,
    };
  }
}

export async function deletePackageAction(
  _prev: PackageMutationState,
  formData: FormData
): Promise<PackageMutationState> {
  try {
    const profile = await requireUserProfile();
    const idRaw = formData.get("package_id");
    if (typeof idRaw !== "string" || idRaw.trim().length === 0) {
      throw new Error("Package identifier is required.");
    }
    await deletePackage(idRaw, profile.id);
    revalidatePath("/dashboard/packages");
    return {
      status: "success",
      message: "Package deleted successfully.",
      package: null,
      packageId: idRaw,
    };
  } catch (error) {
    return {
      status: "error",
      message: (error as Error).message,
    };
  }
}
