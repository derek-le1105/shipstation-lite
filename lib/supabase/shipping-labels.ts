import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ShipStationAddressSnapshot = {
  name?: string | null;
  company?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  residential?: boolean | null;
  [key: string]: unknown;
};

export type ShippingLabelRecord = {
  id: string;
  user_id: string;
  from_address_id: string | null;
  to_address_id: string | null;
  ship_from_snapshot: ShipStationAddressSnapshot;
  ship_to_snapshot: ShipStationAddressSnapshot;
  carrier_code: string;
  service_code: string;
  package_code: string | null;
  weight_value: number;
  weight_unit: string;
  confirmation: string | null;
  shipment_cost: number | null;
  insurance_cost: number | null;
  tracking_number: string | null;
  label_data_base64: string | null;
  created_at: string;
  shipment_id: number;
  voided: boolean;
};

type ShippingLabelInsert = Omit<
  ShippingLabelRecord,
  "id" | "created_at" | "label_data_base64"
> & {
  label_data_base64?: string | null;
};

export type ShippingLabelWithProfile = ShippingLabelRecord & {
  profiles?: {
    email: string | null;
    full_name: string | null;
    role: string | null;
  };
};

async function getClient(
  client?: ServerSupabaseClient
): Promise<ServerSupabaseClient> {
  if (client) return client;
  return createClient();
}

export async function insertShippingLabel(
  input: ShippingLabelInsert,
  client?: ServerSupabaseClient
): Promise<ShippingLabelRecord> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("shipping_labels")
    .insert({
      ...input,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ShippingLabelRecord;
}

export async function listShippingLabelsForUser(
  userId: string,
  client?: ServerSupabaseClient
): Promise<ShippingLabelRecord[]> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("shipping_labels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ShippingLabelRecord[];
}

export async function listAllShippingLabels(
  client?: ServerSupabaseClient
): Promise<ShippingLabelWithProfile[]> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("shipping_labels")
    .select(
      "*, profiles!shipping_labels_user_id_fkey ( email, full_name, role )"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ShippingLabelWithProfile[];
}
