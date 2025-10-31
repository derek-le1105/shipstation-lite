"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "../auth";
import { UserState } from "./admin-users";
import { createAdminClient } from "../supabase/admin";

export async function updateProfileAction(
  _prev: UserState,
  formData: FormData
): Promise<UserState> {
  const userId = formData.get("user_id") as string;
  const profile = await requireAdminProfile();
  if (profile.role !== "admin")
    throw new Error("You do not have permission to update this profile.");

  const email = formData.get("email") as string;
  const full_name = formData.get("full_name") as string;
  const role = formData.get("role") as "user" | "admin";
  const upcharge_value = Number(formData.get("upcharge_value"));
  const upcharge_unit = formData.get("upcharge_unit") as "dollars" | "percent";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      email,
      full_name,
      role,
    })
    .eq("id", userId)
    .select("*")
    .single();

  const { error: upchargeError } = await supabase
    .schema("private")
    .from("user_upcharges")
    .update({
      value: upcharge_value,
      unit: upcharge_unit,
    })
    .eq("user_id", userId);

  if (upchargeError) throw upchargeError;

  if (error) throw error;
  revalidatePath("/admin/users");
  return {
    status: "success",
    userId: data.id,
    email,
    message: "Profile updated.",
  };
}
