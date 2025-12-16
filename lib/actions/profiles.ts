"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth";
import { UserState } from "./admin-users";
import { createAdminClient, upsertUserUpcharge } from "@/lib/supabase/admin";

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
  const warehouse_id = parseInt(formData.get("warehouse_id") as string);
  const upcharge_value = Number(formData.get("upcharge_value"));
  const upcharge_unit = formData.get("upcharge_unit") as "dollars" | "percent";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      email,
      full_name,
      role,
      warehouse_id,
    })
    .eq("id", userId)
    .select("*")
    .single();

  const updatedCharge = await upsertUserUpcharge(
    userId,
    upcharge_unit,
    upcharge_value
  );

  if (updatedCharge.error) throw updatedCharge.error;

  if (error) throw error;
  revalidatePath("/admin/users");
  return {
    status: "success",
    userId: data.id,
    email,
    message: "Profile updated.",
  };
}
