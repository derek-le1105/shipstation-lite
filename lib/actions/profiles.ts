"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile, UserProfile } from "../auth";
import { createClient } from "../supabase/server";

export async function updateProfileAction(formData: FormData) {
  const userId = formData.get("user_id") as string;

  const profile = await requireAdminProfile();
  if (profile.id !== userId && profile.role !== "admin")
    throw new Error("You do not have permission to update this profile.");

  const email = formData.get("email") as string;
  const full_name = formData.get("full_name") as string;
  const role = formData.get("role") as "user" | "admin";
  const upcharge_value = Number(formData.get("upcharge_value"));
  const upcharge_unit = formData.get("upcharge_unit") as "dollar" | "percent";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      email,
      full_name,
      role,
      upcharge_value,
      upcharge_unit,
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/admin/users");
  return data as UserProfile;
}
