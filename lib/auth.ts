import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/supabase.types";
import { WarehouseRecord } from "./supabase/warehouses";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
  warehouse_id: number | null;
  warehouses?: WarehouseRecord;
};

type WarehouseRow = Database["public"]["Tables"]["warehouses"]["Row"];
type ProfileWithWarehouse = UserProfile & {
  warehouses: WarehouseRecord | null;
};

async function ensureProfileRecord(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserProfile>;
async function ensureProfileRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  getWarehouseForeignTable: boolean
): Promise<ProfileWithWarehouse>;
async function ensureProfileRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  getWarehouseForeignTable?: boolean
) {
  const { data, error } = getWarehouseForeignTable
    ? await supabase
        .from("profiles")
        .select("*, warehouses(*)")
        .eq("id", userId)
        .maybeSingle()
    : await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Profile not found for current user.");
  }

  return data as UserProfile;
}

export async function getCurrentProfile(
  getWarehouseForeignTable?: boolean
): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return ensureProfileRecord(
    supabase,
    user.id,
    getWarehouseForeignTable ?? false
  );
}

export async function requireUserProfile(): Promise<UserProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("You must be signed in to perform this action.");
  }

  return profile;
}

export async function requireAdminProfile(): Promise<UserProfile> {
  const profile = await requireUserProfile();

  if (profile.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return profile;
}
