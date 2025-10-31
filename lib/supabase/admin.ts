import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface UserUpcharge {
  user_id: string;
  unit: "dollars" | "percent";
  value: number;
  created_at: string;
  updated_at: string;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase service role configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getUserUpcharge(userId: string): Promise<UserUpcharge> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .schema("private")
    .from("user_upcharges")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Error fetching user upcharge:", error);
    throw error;
  }
  if (!data) {
    return {
      user_id: userId,
      unit: "dollars",
      value: 0,
      created_at: "",
      updated_at: "",
    };
  }
  return data;
}

export async function upsertUserUpcharge(
  userId: string,
  unit: "dollars" | "percent",
  value: number
) {
  const supabase = createAdminClient();
  const upsert = await supabase
    .schema("private")
    .from("user_upcharges")
    .upsert({ user_id: userId, unit, value }, { onConflict: "user_id" });
  if (upsert.error) throw upsert.error;
  return upsert;
}

export async function listUpcharges(): Promise<UserUpcharge[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .schema("private")
    .from("user_upcharges")
    .select("*");
  if (error) throw error;
  return data;
}
