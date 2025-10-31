"use server";

import { revalidatePath } from "next/cache";

import { requireUserProfile } from "@/lib/auth";
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

type AddressMode = "saved" | "new";

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

function parseWeight(formData: FormData): ShipStationWeight {
  const valueRaw = formData.get("weight.value");
  const unitRaw = formData.get("weight.unit");

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

function parseDimensions(formData: FormData): {
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
    const value = formData.get(key);
    return typeof value === "string" && value.trim().length > 0;
  });

  if (!hasDimensions) {
    return { length: 0, width: 0, height: 0, units: "inches" };
  }

  const length = Number.parseFloat(
    (formData.get("dimensions.length") as string) ?? "0"
  );
  const width = Number.parseFloat(
    (formData.get("dimensions.width") as string) ?? "0"
  );
  const height = Number.parseFloat(
    (formData.get("dimensions.height") as string) ?? "0"
  );
  const units = (formData.get("dimensions.unit") as string) ?? "inches";

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

export type CreateShippingLabelState = {
  status: "idle" | "success" | "error";
  message?: string;
  label?: ShippingLabelRecord;
  shipStationLabel?: ShipStationLabel;
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
    const carrierCode = formData.get("carrierCode");
    const serviceCode = formData.get("serviceCode");
    const packageCode = "package";
    const confirmation = "delivery";
    const testLabel = formData.get("testLabel") === "true";

    if (typeof carrierCode !== "string" || carrierCode.trim().length === 0) {
      throw new Error("Carrier code is required.");
    }

    if (typeof serviceCode !== "string" || serviceCode.trim().length === 0) {
      throw new Error("Service code is required.");
    }

    let fromAddressRecord: AddressRecord | null = null;
    let toAddressRecord: AddressRecord | null = null;

    let shipFrom: ShipStationAddress;
    let shipTo: ShipStationAddress;

    if (fromMode === "saved") {
      const fromId = formData.get("from.addressId");
      if (typeof fromId !== "string" || fromId.trim().length === 0) {
        throw new Error("A saved sender address must be selected.");
      }

      fromAddressRecord = await getAddressById(fromId, profile.id);
      if (!fromAddressRecord) {
        throw new Error("Sender address not found.");
      }

      shipFrom = recordToShipStationAddress(fromAddressRecord);
    } else {
      const input = parseAddressInput(formData, "from", "ship_from");
      shipFrom = inputToShipStationAddress(input);

      const shouldSave = formData.get("from.save") === "true";
      if (shouldSave) {
        fromAddressRecord = await createAddress(profile.id, input);
      }
    }

    if (toMode === "saved") {
      const toId = formData.get("to.addressId");
      if (typeof toId !== "string" || toId.trim().length === 0) {
        throw new Error("A saved destination address must be selected.");
      }

      toAddressRecord = await getAddressById(toId, profile.id);
      if (!toAddressRecord) {
        throw new Error("Destination address not found.");
      }

      shipTo = recordToShipStationAddress(toAddressRecord);
    } else {
      const input = parseAddressInput(formData, "to", "ship_to");
      shipTo = inputToShipStationAddress(input);

      const shouldSave = formData.get("to.save") === "true";
      if (shouldSave) {
        toAddressRecord = await createAddress(profile.id, input);
      }
    }

    const weight = parseWeight(formData);
    const dimensions = parseDimensions(formData);

    const labelResponse = await createLabel({
      carrierCode: carrierCode.trim(),
      serviceCode: serviceCode.trim(),
      packageCode:
        typeof packageCode === "string" && packageCode.trim().length > 0
          ? packageCode.trim()
          : undefined,
      confirmation:
        typeof confirmation === "string" && confirmation.trim().length > 0
          ? confirmation.trim()
          : undefined,
      shipFrom,
      shipTo,
      weight,
      dimensions,
      testLabel, //as of 10/30/2025, Fedex does not support test labels via API
    });

    const upchargedShipmentCost = calculateUpchargeCost(
      upcharge,
      labelResponse.shipmentCost
    );
    const upchargedInsuranceCost = calculateUpchargeCost(
      upcharge,
      labelResponse.insuranceCost
    );

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
      total_insurance_cost: upchargedInsuranceCost,
      tracking_number: labelResponse.trackingNumber ?? null,
      label_data_base64: labelResponse.labelData ?? null,
      shipment_id: labelResponse.shipmentId,
      voided: false,
      voided_at: null,
      order_number: orderNumber,
    });

    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Shipping label created successfully.",
      label: savedLabel,
      shipStationLabel: labelResponse,
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
