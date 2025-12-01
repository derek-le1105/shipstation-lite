import { UserProfile } from "../auth";
import { createClient } from "./server";

export async function getOwner(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfile | null) ?? null;
}

export async function listProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, shipping_labels(sum:total_shipment_cost)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const profileData = data as (UserProfile & {
    shipping_labels: { sum: number }[];
  })[];
  const profiles = profileData.map((profile) => ({
    ...profile,
    shipping_labels: {
      total: profile.shipping_labels.length,
      total_cost: profile.shipping_labels.reduce((acc, curr) => {
        return acc + curr.sum;
      }, 0),
    },
  }));
  return profiles;
}
