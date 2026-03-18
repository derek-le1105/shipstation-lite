import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AddressRecord = {
  id: string;
  user_id: string;
  label: string | null;
  contact_name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_residential: boolean;
  is_validated: boolean;
  created_at: string;
};

export type AddressInput = Omit<AddressRecord, "id" | "user_id" | "created_at">;

async function getClient(
  client?: ServerSupabaseClient,
): Promise<ServerSupabaseClient> {
  if (client) return client;
  return createClient();
}

export async function listAllAddresses(
  client?: ServerSupabaseClient,
): Promise<AddressRecord[]> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
  if (error) {
    throw error;
  }
  return (data ?? []) as AddressRecord[];
}

export async function listUserAddresses(
  userId: string,
  client?: ServerSupabaseClient,
): Promise<AddressRecord[]> {
  const supabase = await getClient(client);

  let query = supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("label", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as AddressRecord[];
}

export async function createAddress(
  userId: string,
  input: AddressInput,
  client?: ServerSupabaseClient,
): Promise<AddressRecord> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      ...input,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as AddressRecord;
}

/**
 * Get an address by its ID.
 * @param id Address ID
 * @returns Address record or null
 */
export async function getAddress(id: string): Promise<AddressRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AddressRecord | null) ?? null;
}

/**
 * Get an address by its ID and user's ID.
 * @param id Address ID
 * @param userId User ID
 * @param client Supabase client
 * @returns Address record or null
 */
export async function getAddressById(
  id: string,
  userId: string,
  client?: ServerSupabaseClient,
): Promise<AddressRecord | null> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const address = data as AddressRecord;

  if (address.user_id !== userId) {
    throw new Error("Address not accessible.");
  }

  return address;
}

export async function updateAddress(
  id: string,
  userId: string,
  input: AddressInput,
  client?: ServerSupabaseClient,
): Promise<AddressRecord> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("addresses")
    .update({
      ...input,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as AddressRecord;
}

export async function deleteAddress(
  id: string,
  userId: string,
  client?: ServerSupabaseClient,
): Promise<void> {
  const supabase = await getClient(client);

  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
