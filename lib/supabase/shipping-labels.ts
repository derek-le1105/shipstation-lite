import { UserProfile } from "../auth";
import { AdvancedOptions, InsuranceOption } from "../shipstation/types";
import { createClient } from "./server";

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
  length: number;
  width: number;
  height: number;
  units: "inches" | "centimeters";
  weight_value: number;
  weight_unit: string;
  confirmation: string | null;
  shipment_cost: number | null;
  insurance_cost: number | null;
  total_shipment_cost: number;
  total_insurance_cost: number;
  tracking_number: string | null;
  label_data_base64: string;
  created_at: string;
  shipment_id: number;
  voided_at: string | null;
  order_number?: string | null;
  is_address_validated: boolean;
  insurance_options: InsuranceOption | null;
  advanced_options: AdvancedOptions | null;
  paid_at: string | null;
  profiles?: Omit<UserProfile, "id" | "created_at" | "updated_at">;
};

type ShippingLabelInsert = Omit<
  ShippingLabelRecord,
  | "id"
  | "created_at"
  | "label_data_base64"
  | "insurance_options"
  | "advanced_options"
> & {
  label_data_base64?: string | null;
  insurance_options?: InsuranceOption | null;
  advanced_options?: AdvancedOptions | null;
};

export type ShippingLabelWithProfile = ShippingLabelRecord & {
  profiles?: {
    email: string | null;
    full_name: string | null;
    role: string | null;
  };
};

export type UserLabelStats = {
  totalSpent: number;
  totalPaid: number;
  labelCount: number;
};

const SHIPPING_LABEL_COLUMNS = [
  "id",
  "user_id",
  "from_address_id",
  "to_address_id",
  "ship_from_snapshot",
  "ship_to_snapshot",
  "carrier_code",
  "service_code",
  "package_code",
  "length",
  "width",
  "height",
  "units",
  "weight_value",
  "weight_unit",
  "confirmation",
  "order_number",
  "total_shipment_cost",
  "total_insurance_cost",
  "tracking_number",
  "label_data_base64",
  "created_at",
  "shipment_id",
  "voided_at",
  "paid_at",
] as const satisfies ReadonlyArray<keyof ShippingLabelRecord>;

type ListShippingLabelsOptions<
  Exclude extends keyof ShippingLabelRecord = never
> = {
  client?: ServerSupabaseClient;
  excludeColumns?: Exclude[];
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

export async function getShippingLabel(
  userId: string,
  client?: ServerSupabaseClient
): Promise<ShippingLabelRecord | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from("shipping_labels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data as ShippingLabelRecord | null;
}

export async function getUserLabelStats(
  userId: string,
  client?: ServerSupabaseClient
): Promise<UserLabelStats> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from("shipping_labels")
    .select("total_shipment_cost,total_insurance_cost,paid_at")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const stats = (data ?? []).reduce<UserLabelStats>(
    (acc, label) => {
      const shipmentCost = Number(label.total_shipment_cost) || 0;
      const insuranceCost = Number(label.total_insurance_cost) || 0;
      const total = shipmentCost + insuranceCost;

      acc.totalSpent += total;
      if (label.paid_at) {
        acc.totalPaid += total;
      }
      acc.labelCount += 1;

      return acc;
    },
    { totalSpent: 0, totalPaid: 0, labelCount: 0 }
  );

  return stats;
}

export async function getShippingLabelById(
  userId: string,
  labelId: string,
  client?: ServerSupabaseClient
): Promise<ShippingLabelRecord | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from("shipping_labels")
    .select("*")
    .eq("user_id", userId)
    .eq("id", labelId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return (data as ShippingLabelRecord | null) ?? null;
}

export async function listShippingLabelsForUser<
  Exclude extends keyof ShippingLabelRecord = never
>(
  userId: string,
  clientOrOptions?: ServerSupabaseClient | ListShippingLabelsOptions<Exclude>,
  maybeOptions?: ListShippingLabelsOptions<Exclude>
): Promise<Array<Omit<ShippingLabelRecord, Exclude>>> {
  const isSupabaseClient = (
    candidate: unknown
  ): candidate is ServerSupabaseClient =>
    typeof candidate === "object" &&
    candidate !== null &&
    "from" in candidate &&
    typeof (candidate as { from?: unknown }).from === "function";

  const options = (() => {
    if (isSupabaseClient(clientOrOptions)) {
      return maybeOptions ?? { client: clientOrOptions };
    }
    return clientOrOptions;
  })();

  const client =
    options?.client ??
    (isSupabaseClient(clientOrOptions) ? clientOrOptions : undefined);
  const excludeColumns = options?.excludeColumns ?? [];

  const supabase = await getClient(client);

  const excludeSet = new Set<keyof ShippingLabelRecord>(
    excludeColumns as (keyof ShippingLabelRecord)[]
  );
  const selectedColumns =
    excludeColumns.length > 0
      ? SHIPPING_LABEL_COLUMNS.filter((column) => !excludeSet.has(column))
      : undefined;

  const { data, error } = await supabase
    .from("shipping_labels")
    .select(
      selectedColumns && selectedColumns.length > 0
        ? selectedColumns.join(",")
        : "*"
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const records = (data ?? []) as Array<Partial<ShippingLabelRecord>>;

  if (excludeColumns.length === 0) {
    return records as Array<Omit<ShippingLabelRecord, Exclude>>;
  }

  return records.map((record) => {
    const filteredRecord: Partial<ShippingLabelRecord> = {
      ...(record as ShippingLabelRecord),
    };
    for (const column of excludeColumns) {
      delete filteredRecord[column];
    }
    return filteredRecord as Omit<ShippingLabelRecord, Exclude>;
  });
}

export async function listAllShippingLabels(
  referenceProfile?: boolean
): Promise<ShippingLabelWithProfile[]> {
  const supabase = await getClient();

  const shippingLabelsTable = supabase.from("shipping_labels");

  const { data, error } = await (referenceProfile
    ? shippingLabelsTable.select("*, profiles(full_name, email)")
    : shippingLabelsTable.select("*")
  ).order("created_at", { ascending: false });
  if (error) {
    throw error;
  }

  const labels = (data ?? []) as ShippingLabelRecord[];
  return labels;
}

export async function getNextOrderNumber() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("shipping_labels")
    .select("*", { count: "exact", head: true });
  return `UNS-SM-${count}`;
}
