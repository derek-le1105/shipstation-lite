import { UserProfile } from "../auth";
import { createClient } from "./server";

export async function listProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const profiles = data as UserProfile[];

  return profiles;
}
