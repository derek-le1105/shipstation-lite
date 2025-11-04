"use server";

import { revalidatePath } from "next/cache";

import { requireUserProfile, UserProfile } from "@/lib/auth";
import {
  createAddress,
  getAddressById,
  type AddressInput,
  type AddressRecord,
} from "@/lib/supabase/addresses";
import {
  insertShippingLabel,
  type ShippingLabelRecord,
} from "@/lib/supabase/shipping-labels";
import {
  createLabel,
  voidLabel,
  type ShipStationAddress,
  type ShipStationLabel,
  type ShipStationWeight,
} from "@/lib/shipstation/client";
import { createClient } from "../supabase/server";
import { getUserUpcharge } from "../supabase/admin";
import { getPackageById } from "../supabase/packages";

type AddressMode = "saved" | "new";

const PACKAGE_CODE = "package";
const CONFIRMATION = "delivery";

const REQUIRED_ADDRESS_FIELDS = [
  "contact_name",
  "address_line1",
  "city",
  "state",
  "postal_code",
] as const;

function parseAddressInput(
  formData: FormData,
  prefix: string,
  kind: AddressInput["address_kind"]
): AddressInput {
  const get = (key: string) => {
    const value = formData.get(`${prefix}.${key}`);
    return typeof value === "string" && value.length > 0 ? value.trim() : null;
  };

  const contactName = get("contact_name");
  const addressLine1 = get("address_line1");
  const city = get("city");
  const state = get("state");
  const postal = get("postal_code");

  for (const key of REQUIRED_ADDRESS_FIELDS) {
    const value = get(key);
    if (!value) {
      throw new Error(
        `Missing required field for ${prefix.replace(".", " ")}: ${key}`
      );
    }
  }

  return {
    label: get("label"),
    contact_name: contactName,
    company: get("company"),
    phone: get("phone"),
    email: get("email"),
    address_line1: addressLine1!,
    address_line2: get("address_line2"),
    city: city!,
    state: state!,
    postal_code: postal!,
    country: get("country") ?? "US",
    is_residential: get("is_residential") === "true",
    address_kind: kind,
  };
}

function recordToShipStationAddress(record: AddressRecord): ShipStationAddress {
  return {
    name: record.contact_name ?? "",
    company: record.company,
    street1: record.address_line1,
    street2: record.address_line2 ?? undefined,
    city: record.city,
    state: record.state,
    postalCode: record.postal_code,
    country: record.country,
    phone: record.phone ?? undefined,
    residential: record.is_residential,
  };
}

function inputToShipStationAddress(input: AddressInput): ShipStationAddress {
  return {
    name: input.contact_name ?? "",
    company: input.company ?? undefined,
    street1: input.address_line1,
    street2: input.address_line2 ?? undefined,
    city: input.city,
    state: input.state,
    postalCode: input.postal_code,
    country: input.country,
    phone: input.phone ?? undefined,
    residential: input.is_residential,
  };
}

function parseWeight(formData: FormData, prefix: string): ShipStationWeight {
  const valueRaw = formData.get(`${prefix}.weight.value`);
  const unitRaw = formData.get(`${prefix}.weight.unit`);

  if (typeof valueRaw !== "string" || typeof unitRaw !== "string") {
    throw new Error("Weight value and unit are required.");
  }

  const value = Number.parseFloat(valueRaw);
  const unit = unitRaw as ShipStationWeight["units"];

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Weight must be a positive number.");
  }

  if (!["ounces", "pounds", "grams"].includes(unit)) {
    throw new Error("Unsupported weight unit.");
  }

  return {
    value,
    units: unit,
  };
}

function parseDimensions(
  formData: FormData,
  prefix: string
): {
  length: number;
  width: number;
  height: number;
  units: "inches" | "centimeters";
} {
  const hasDimensions = [
    "dimensions.length",
    "dimensions.width",
    "dimensions.height",
  ].some((key) => {
    const value = formData.get(`${prefix}.${key}`);
    return typeof value === "string" && value.trim().length > 0;
  });

  if (!hasDimensions) {
    return { length: 0, width: 0, height: 0, units: "inches" };
  }

  const length = Number.parseFloat(
    (formData.get(`${prefix}.dimensions.length`) as string) ?? "0"
  );
  const width = Number.parseFloat(
    (formData.get(`${prefix}.dimensions.width`) as string) ?? "0"
  );
  const height = Number.parseFloat(
    (formData.get(`${prefix}.dimensions.height`) as string) ?? "0"
  );
  const units =
    (formData.get(`${prefix}.dimensions.unit`) as string) ?? "inches";

  if (
    !Number.isFinite(length) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    throw new Error("Dimensions must be numeric values.");
  }

  return {
    length,
    width,
    height,
    units: units === "centimeters" ? "centimeters" : "inches",
  };
}

export type CreateShippingItemResult =
  | {
      index: number;
      ok: true;
      savedLabel: ShippingLabelRecord;
      shipStationLabel: ShipStationLabel;
    }
  | {
      index: number;
      ok: false;
      error: string;
      savedLabel: undefined;
      shipStationLabel: undefined;
    };

export type CreateShippingLabelState = {
  status: "idle" | "success" | "error" | "partial";
  message?: string;
  items?: CreateShippingItemResult[];
};

export async function voidShippingLabelAction(formData: FormData) {
  const shipmentId = Number(formData.get("shipmentId"));
  if (!Number.isFinite(shipmentId)) throw new Error("Invalid shipment id");

  const profile = await requireUserProfile();
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("shipping_labels")
    .select("id, user_id, voided")
    .eq("shipment_id", shipmentId)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.user_id !== profile.id) throw new Error("Not found");

  if (!row.voided) {
    const { approved, message } = await voidLabel(shipmentId);
    if (!approved)
      throw new Error(message || "Unable to void label at this time.");

    const { data: updatedLabel, error: updatedLabelError } = await supabase
      .from("shipping_labels")
      .update({ voided: true, voided_at: new Date().toISOString() })
      .eq("shipment_id", shipmentId)
      .select("*")
      .single();
    if (updatedLabelError) throw updatedLabelError;
    if (!updatedLabel.voided) throw new Error("Failed to update label status.");
  }

  revalidatePath("/dashboard");
}

export async function createShippingLabelAction(
  _: CreateShippingLabelState,
  formData: FormData
): Promise<CreateShippingLabelState> {
  try {
    const profile = await requireUserProfile();
    const upcharge = await getUserUpcharge(profile.id).then((data) => ({
      value: data.value,
      unit: data.unit,
    }));
    const fromMode = (formData.get("from.mode") as AddressMode) ?? "new";
    const toMode = (formData.get("to.mode") as AddressMode) ?? "new";

    const orderNumber = formData.get("orderNumber") as string | null;
    const carrierCode = getCarrierCode(formData);
    const serviceCode = getServiceCode(formData);

    const { shipAddress: shipFrom, addressRecord: fromAddressRecord } =
      await processAddressMode(fromMode, "from", formData, profile);
    const { shipAddress: shipTo, addressRecord: toAddressRecord } =
      await processAddressMode(toMode, "to", formData, profile);

    const packagesCount = Number(formData.get("packages.count")) || 1;

    const settled = await Promise.allSettled<CreateShippingItemResult>(
      [...Array(packagesCount)].map(async (_, index) => {
        const prefix = `package-${index}`;
        try {
          const { weight, dimensions } = await processPackageMode(
            prefix,
            formData,
            profile
          );

          const labelResponse = await createLabel({
            carrierCode,
            serviceCode,
            packageCode: PACKAGE_CODE,
            confirmation: CONFIRMATION,
            shipFrom,
            shipTo,
            weight,
            dimensions,
          });
          const upchargedShipmentCost = calculateUpchargeCost(
            upcharge,
            labelResponse.shipmentCost
          );

          try {
            const savedLabel = await insertShippingLabel({
              user_id: profile.id,
              from_address_id: fromAddressRecord?.id ?? null,
              to_address_id: toAddressRecord?.id ?? null,
              ship_from_snapshot: shipFrom,
              ship_to_snapshot: shipTo,
              length: dimensions.length,
              width: dimensions.width,
              height: dimensions.height,
              units: dimensions.units,
              weight_value: weight.value,
              weight_unit: weight.units,
              carrier_code: labelResponse.carrierCode,
              service_code: labelResponse.serviceCode,
              package_code: labelResponse.packageCode ?? null,
              confirmation: labelResponse.confirmation ?? null,
              shipment_cost: labelResponse.shipmentCost ?? null,
              insurance_cost: labelResponse.insuranceCost ?? null,
              total_shipment_cost: upchargedShipmentCost,
              total_insurance_cost: labelResponse.insuranceCost ?? null,
              tracking_number: labelResponse.trackingNumber ?? null,
              label_data_base64: labelResponse.labelData ?? null,
              shipment_id: labelResponse.shipmentId,
              voided: false,
              voided_at: null,
              order_number: orderNumber,
            });

            return {
              index,
              ok: true as const,
              savedLabel,
              shipStationLabel: labelResponse,
            };
          } catch (dbErr) {
            // best-effort rollback of the carrier label if DB insert fails
            try {
              if (Number.isFinite(labelResponse.shipmentId)) {
                await voidLabel(labelResponse.shipmentId);
              }
            } catch (voidErr) {
              console.log("voidLabel after DB failure failed:", voidErr);
            }
            throw new Error(
              dbErr instanceof Error
                ? dbErr.message
                : "Failed to save shipping label."
            );
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to create label for this package.";
          // Throw to be captured by allSettled
          throw {
            index,
            message,
            savedLabel: undefined,
            shipStationLabel: undefined,
          };
        }
      })
    );

    const items = settled.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      const reason = r.reason ?? {};
      return {
        index: typeof reason.index === "number" ? reason.index : i,
        ok: false as const,
        error:
          typeof reason.message === "string" ? reason.message : "Unknown error",
        savedLabel: undefined,
        shipStationLabel: undefined,
      };
    });

    const successCount = items.filter((it) => it.ok).length;
    const total = items.length;

    const status =
      successCount === 0
        ? "error"
        : successCount === total
        ? "success"
        : "partial";

    revalidatePath("/dashboard");

    return {
      status, // "success" | "partial" | "error"
      message:
        status === "success"
          ? "All labels created successfully."
          : status === "partial"
          ? `${successCount}/${total} labels created.`
          : "No labels were created.",
      items,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create shipping label right now.";
    console.log("createShippingLabelAction error: ", error);
    return {
      status: "error",
      message,
    };
  }
}

function calculateUpchargeCost(
  upcharge: { value: number; unit: string },
  totalShipmentCost: number
) {
  const { value: upchargeValue, unit: upchargeUnit } = upcharge;
  if (
    Number.isFinite(upchargeValue) &&
    upchargeValue > 0 &&
    (upchargeUnit === "dollars" || upchargeUnit === "percent")
  ) {
    if (upchargeUnit === "dollars") {
      return totalShipmentCost + upchargeValue;
    } else if (upchargeUnit === "percent") {
      return totalShipmentCost * (1 + upchargeValue / 100);
    }
  }
  return totalShipmentCost;
}

async function processAddressMode(
  mode: AddressMode,
  prefix: "from" | "to",
  formData: FormData,
  profile: UserProfile
) {
  let shipAddress: ShipStationAddress;
  let addressRecord: AddressRecord | null = null;
  if (mode === "saved") {
    const addressId = formData.get(`${prefix}.addressId`);
    if (typeof addressId !== "string" || addressId.trim().length === 0) {
      throw new Error("A saved sender address must be selected.");
    }

    addressRecord = await getAddressById(addressId, profile.id);
    if (!addressRecord) {
      throw new Error("Sender address not found.");
    }

    shipAddress = recordToShipStationAddress(addressRecord);
  } else {
    const input = parseAddressInput(formData, prefix, `ship_${prefix}`);
    shipAddress = inputToShipStationAddress(input);

    const shouldSave = formData.get(`${prefix}.save`) === "true";
    if (shouldSave) {
      addressRecord = await createAddress(profile.id, input);
    }
  }
  return { shipAddress, addressRecord };
}

async function processPackageMode(
  prefix: string,
  formData: FormData,
  profile: UserProfile
) {
  if (formData.get(`${prefix}.id`) === "new-package") {
    const weight = parseWeight(formData, prefix);
    const dimensions = parseDimensions(formData, prefix);
    return { weight, dimensions };
  } else {
    const packageId = formData.get(`${prefix}.id`);
    if (typeof packageId !== "string" || packageId.trim().length === 0) {
      throw new Error("Package ID is required.");
    }
    const savedPackage = await getPackageById(packageId, profile.id);
    if (!savedPackage) {
      throw new Error("Package not found.");
    }
    const weight = {
      value: savedPackage.weight,
      units: savedPackage.weight_unit,
    } as ShipStationWeight;
    const dimensions = {
      length: savedPackage.length,
      width: savedPackage.width,
      height: savedPackage.height,
      units: savedPackage.dimension_unit,
    };
    return { weight, dimensions };
  }
}

function getCarrierCode(formData: FormData): string {
  const carrierCode = formData.get("carrierCode");
  if (typeof carrierCode !== "string" || carrierCode.trim().length === 0) {
    throw new Error("Carrier code is required.");
  }
  return carrierCode.trim();
}

function getServiceCode(formData: FormData): string {
  const serviceCode = formData.get("serviceCode");
  if (typeof serviceCode !== "string" || serviceCode.trim().length === 0) {
    throw new Error("Service code is required.");
  }
  return serviceCode.trim();
}
