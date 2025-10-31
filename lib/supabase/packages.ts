import { createClient } from "./server";

export type PackageInput = Omit<
  PackageRecord,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export type PackageRecord = {
  id: string;
  user_id: string;
  length: number;
  width: number;
  height: number;
  dimension_unit: "inches" | "centimeters";
  weight: number;
  weight_unit: "pounds" | "ounces" | "grams";
  created_at: string;
  updated_at: string;
  nickname: string;
};

export async function listPackages(userId: string): Promise<PackageRecord[]> {
  const supabase = await createClient();

  const query = supabase
    .from("packages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  const { data, error } = await query;

  if (error && !data) {
    throw error;
  }

  return data as PackageRecord[];
}

export async function getPackageById(
  id: string,
  userId: string
): Promise<PackageRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    throw error;
  }
  if (!data) return null;

  const pkg = data as PackageRecord;

  if (pkg.user_id !== userId)
    throw new Error("Unauthorized access to package.");

  return pkg;
}

export async function createPackage(
  userId: string,
  input: PackageInput
): Promise<PackageRecord> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .insert({
      ...input,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PackageRecord;
}

export async function updatePackage(
  id: string,
  userId: string,
  input: PackageInput
): Promise<PackageRecord> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .update({
      ...input,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.log("error:", error);
    throw error;
  }

  return data as PackageRecord;
}

export async function deletePackage(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("packages")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
