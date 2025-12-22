"use server";

import { UserProfile } from "../auth";
import { createClient } from "./server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type WarehouseRecord = {
  warehouseId: number;
  warehouseName: string;
  createDate: string;
  isDefault: boolean;
  sellerIntegrationId: null;
  extInventoryIdentity: null;
  registerFedexMeter: null;
  originAddress_name: string;
  originAddress_company: string;
  originAddress_street1: string;
  originAddress_street2: string;
  originAddress_street3: null;
  originAddress_city: string;
  originAddress_state: string;
  originAddress_postalCode: string;
  originAddress_country: string;
  originAddress_phone: string;
  originAddress_residential: boolean;
  originAddress_addressVerified: null;
  returnAddress_name: string;
  returnAddress_company: string;
  returnAddress_street1: string;
  returnAddress_street2: string;
  returnAddress_street3: null;
  returnAddress_city: string;
  returnAddress_state: string;
  returnAddress_postalCode: string;
  returnAddress_country: string;
  returnAddress_phone: string;
  returnAddress_residential: null;
  returnAddress_addressVerified: null;
};

async function getClient(
  client?: ServerSupabaseClient
): Promise<ServerSupabaseClient> {
  if (client) return client;
  return createClient();
}

export async function fetchProfileWarehouseRecord(profile: UserProfile) {
  if (!profile?.warehouse_id) return fetchDefaultWarehouseRecord();
  return fetchWarehouseRecord(profile.warehouse_id);
}

export async function fetchWarehouseRecord(
  warehouseId: number,
  client?: ServerSupabaseClient
) {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("warehouseId", warehouseId)
    .single();

  if (error) throw error;

  return data as WarehouseRecord;
}

export async function fetchDefaultWarehouseRecord(
  client?: ServerSupabaseClient
) {
  const supabase = await getClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("warehouseName", "My Default Location")
    .single();

  if (error) throw error;

  return data as WarehouseRecord;
}
