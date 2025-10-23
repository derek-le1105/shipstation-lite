import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "user" | "admin";
};

async function ensureProfileRecord(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
  fullName: string | null
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as UserProfile;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role: "user",
    })
    .select("id, email, full_name, role")
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted as UserProfile;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const email = user.email ?? null;

  const fullName =
    (typeof user.user_metadata?.full_name === "string"
      ? (user.user_metadata.full_name as string)
      : null) ?? null;

  return ensureProfileRecord(supabase, user.id, email, fullName);
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
