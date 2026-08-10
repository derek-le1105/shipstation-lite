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
  getNextOrderNumber,
  insertShippingLabel,
  incrementOrderNumberSequence,
  type ShippingLabelRecord,
} from "@/lib/supabase/shipping-labels";
import { createShipment, voidLabel } from "@/lib/shipstation/client";
import { cancelSeAutoOrders } from "@/lib/shipstation/v1-client";
import {
  AdvancedOptions,
  InsuranceOption,
  type ShipStationAddress,
  type ShipStationWeight,
} from "@/lib/shipstation/types";
import type { V2Address, V2LabelResponse, V2Package } from "@/lib/shipstation/v2-types";
import { createClient } from "../supabase/server";
import { getUserUpcharge } from "../supabase/admin";
import {
  createPackage,
  getPackageById,
  updatePackage,
} from "../supabase/packages";
import { fetchProfileWarehouseRecord } from "../supabase/warehouses";

type AddressMode = "saved" | "new";

const CONFIRMATION = "delivery";

const REQUIRED_ADDRESS_FIELDS = [
  "contact_name",
  "address_line1",
  "city",
  "state",
  "postal_code",
] as const;

function parseAddressInput(formData: FormData): AddressInput {
  const get = (key: string) => {
    const value = formData.get(key);
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
      throw new Error(`Missing required field for: ${key}`);
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
    is_residential: get("is_residential") === "on",
    is_validated: get("is_validated") === "on",
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

const WEIGHT_UNIT_MAP: Record<ShipStationWeight["units"], V2Package["weight"]["unit"]> = {
  ounces: "ounce",
  pounds: "pound",
  grams: "gram",
};

const DIMENSION_UNIT_MAP: Record<"inches" | "centimeters", "inch" | "centimeter"> = {
  inches: "inch",
  centimeters: "centimeter",
};

function toV2Address(address: ShipStationAddress): V2Address {
  return {
    name: address.name,
    company_name: address.company ?? undefined,
    phone: address.phone ?? undefined,
    address_line1: address.street1,
    address_line2: address.street2 ?? undefined,
    city_locality: address.city,
    state_province: address.state,
    postal_code: address.postalCode,
    country_code: address.country,
    address_residential_indicator: address.residential ? "yes" : "no",
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
    }
  | {
      index: number;
      ok: false;
      error: string;
      savedLabel: undefined;
    };

export type CreateShippingLabelState = {
  status: "idle" | "success" | "error" | "partial";
  message?: string;
  items?: CreateShippingItemResult[];
};

export async function voidShippingLabelAction(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const labelIds = JSON.parse(formData.get("label_ids") as string) as string[];
  const path = formData.get("path") as string;
  if (!Array.isArray(labelIds) || labelIds.length === 0)
    return { success: false, message: "No label IDs provided." };

  const profile = await requireUserProfile();
  const supabase = await createClient();

  await Promise.all(
    labelIds.map(async (labelId) => {
      if (typeof labelId !== "string" || labelId.length === 0)
        throw new Error("Invalid label id");
      const { data: row, error } = await supabase
        .from("shipping_labels")
        .select("id, user_id, voided_at, shipment_group_id")
        .eq("label_id", labelId)
        .maybeSingle();
      if (error) throw error;
      if (!row || row.user_id !== profile.id) throw new Error("Not found");
      if (!row.voided_at) {
        // One V2 label_id may cover multiple packages in the same shipment;
        // voiding it voids every package in that shipment together.
        const { approved, message } = await voidLabel(labelId);
        if (!approved)
          throw new Error(message || "Unable to void label at this time.");

        const { error: updatedLabelError } = await supabase
          .from("shipping_labels")
          .update({ voided_at: new Date().toISOString() })
          .eq("label_id", labelId);
        if (updatedLabelError) throw updatedLabelError;
      }
    })
  );

  revalidatePath(path);
  return { success: true, message: "Labels voided successfully." };
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
    const toMode =
      (formData.get("addressId") as string) === "new-address" ? "new" : "saved";

    let orderNumber = formData.get("orderNumber") as string | null;
    if (!orderNumber) orderNumber = await getNextOrderNumber();
    const carrierCode = getCarrierCode(formData);
    const serviceCode = getServiceCode(formData);

    const {
      shipAddress: shipTo,
      addressRecord: toAddressRecord,
      addressValidated,
    } = await processAddressMode(toMode, formData, profile);

    const warehouse = await fetchProfileWarehouseRecord(profile);
    const shipFrom: ShipStationAddress = {
      name: warehouse.originAddress_name,
      company: warehouse.originAddress_company || undefined,
      street1: warehouse.originAddress_street1,
      street2: warehouse.originAddress_street2 || undefined,
      city: warehouse.originAddress_city,
      state: warehouse.originAddress_state,
      postalCode: warehouse.originAddress_postalCode,
      country: warehouse.originAddress_country,
      phone: warehouse.originAddress_phone || undefined,
      residential: warehouse.originAddress_residential,
    };

    const packagesCount = Number(formData.get("packages.count")) || 1;

    // Build every package spec up front - V2 creates a whole multi-package
    // shipment in a single call, not one call per package.
    type PackageSpec = {
      insuranceOptions: InsuranceOption | undefined;
      advancedOptions: AdvancedOptions | undefined;
      weight: ShipStationWeight;
      dimensions: {
        length: number;
        width: number;
        height: number;
        units: "inches" | "centimeters";
      };
    };
    const packageSpecs: PackageSpec[] = [];
    for (let index = 0; index < packagesCount; index++) {
      const prefix = `package-${index}`;
      const insuranceOptions = processInsuranceOption(formData, prefix);
      const advancedOptions = processAdvancedOptions(formData, prefix);
      const { weight, dimensions } = await processPackageMode(
        prefix,
        formData,
        profile
      );
      packageSpecs.push({ insuranceOptions, advancedOptions, weight, dimensions });
    }

    const shipmentGroupId = crypto.randomUUID();
    const v2Packages: V2Package[] = packageSpecs.map((spec) => ({
      weight: {
        value: spec.weight.value,
        unit: WEIGHT_UNIT_MAP[spec.weight.units],
      },
      dimensions: {
        unit: DIMENSION_UNIT_MAP[spec.dimensions.units],
        length: spec.dimensions.length,
        width: spec.dimensions.width,
        height: spec.dimensions.height,
      },
      ...(spec.insuranceOptions?.insureShipment && {
        insured_value: {
          currency: "usd",
          amount: spec.insuranceOptions.insuredValue,
        },
      }),
    }));
    const saturdayDelivery = packageSpecs.some(
      (spec) => spec.advancedOptions?.saturdayDelivery
    );

    let labelResponse: V2LabelResponse;
    try {
      labelResponse = await createShipment({
        shipment: {
          carrier_id: "se-96255",
          service_code: serviceCode,
          ship_to: toV2Address(shipTo),
          ship_from: toV2Address(shipFrom),
          confirmation: CONFIRMATION,
          external_order_id: orderNumber,
          external_shipment_id: shipmentGroupId,
          insurance_provider: packageSpecs.some(
            (spec) => spec.insuranceOptions?.insureShipment
          )
            ? "carrier"
            : "none",
          advanced_options: { saturday_delivery: saturdayDelivery },
          packages: v2Packages,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create shipment via ShipStation.";
      return { status: "error", message };
    }

    const upchargedShipmentCost = calculateUpchargeCost(
      upcharge,
      labelResponse.shipment_cost.amount
    );
    const upchargedInsuranceCost = calculateUpchargeCost(
      upcharge,
      labelResponse.insurance_cost.amount
    );
    const isMultiPackage = labelResponse.packages.length > 1;

    console.log('labelResponse: ', labelResponse)

    const items: CreateShippingItemResult[] = [];
    try {
      for (let index = 0; index < labelResponse.packages.length; index++) {
        const pkgResult = labelResponse.packages[index];
        const spec = packageSpecs[index];
        const savedLabel = await insertShippingLabel({
          user_id: profile.id,
          to_address_id: toAddressRecord?.id ?? null,
          ship_to_snapshot: shipTo,
          length: spec.dimensions.length,
          width: spec.dimensions.width,
          height: spec.dimensions.height,
          units: spec.dimensions.units,
          weight_value: spec.weight.value,
          weight_unit: spec.weight.units,
          carrier_code: carrierCode,
          service_code: serviceCode,
          package_code: "package",
          confirmation: CONFIRMATION,
          shipment_cost: labelResponse.shipment_cost.amount,
          insurance_cost: labelResponse.insurance_cost.amount,
          total_shipment_cost: upchargedShipmentCost,
          total_insurance_cost: upchargedInsuranceCost,
          tracking_number: pkgResult.tracking_number,
          label_data_base64: labelResponse.label_download?.pdf ?? null,
          shipment_id: labelResponse.shipment_id,
          label_id: labelResponse.label_id,
          shipment_group_id: shipmentGroupId,
          parent_tracking_number: isMultiPackage
            ? labelResponse.tracking_number
            : null,
          package_sequence: isMultiPackage ? index + 1 : null,
          voided_at: null,
          paid_at: null,
          order_number: orderNumber,
          is_address_validated: addressValidated,
          insurance_options: spec.insuranceOptions ?? {
            provider: "none",
            insureShipment: false,
            insuredValue: 0,
          },
          advanced_options: spec.advancedOptions ?? {
            saturdayDelivery: false,
          },
          ship_from_id: profile.warehouse_id,
        });

        items.push({ index, ok: true as const, savedLabel });
      }
    } catch (dbErr) {
      console.log(dbErr);
      // best-effort rollback of the whole carrier shipment if any DB insert fails
      try {
        console.log('voiding!')
        await voidLabel(labelResponse.label_id);
      } catch (voidErr) {
        console.log("voidLabel after DB failure failed:", voidErr);
      }
      const message =
        dbErr instanceof Error
          ? dbErr.message
          : "Failed to save shipping label.";
      return { status: "error", message };
    }

    const successCount = items.filter((it) => it.ok).length;
    const total = items.length;

    if (successCount > 0) await incrementOrderNumberSequence();

    try {
      const { cancelled, orderNumbers } = await cancelSeAutoOrders();
      if (cancelled > 0) {
        console.log("Cancelled SEAuto orders:", orderNumbers);
      }
    } catch (cleanupErr) {
      console.error("cancelSeAutoOrders failed:", cleanupErr);
    }

    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "All labels created successfully.",
      items,
    };
  } catch (error) {
    console.log(error);
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

function processInsuranceOption(
  formData: FormData,
  prefix: string
): InsuranceOption | undefined {
  const provider = formData.get(
    `${prefix}.insuranceOptions.provider`
  ) as string as InsuranceOption["provider"];
  if (typeof provider !== "string" || provider === "none") {
    return undefined;
  }

  const insuredValue = Number(
    formData.get(`${prefix}.insuranceOptions.insuredValue`)
  );
  if (!Number.isFinite(insuredValue) || insuredValue <= 0) {
    return undefined;
  }

  return {
    provider,
    insureShipment: true,
    insuredValue,
  };
}

function processAdvancedOptions(
  formData: FormData,
  prefix: string
): AdvancedOptions | undefined {
  const options: AdvancedOptions = { saturdayDelivery: false };
  const saturdayDelivery = formData.get(
    `${prefix}.advancedOptions.saturday_delivery`
  );
  if (saturdayDelivery === "on") options.saturdayDelivery = true;

  if (Object.keys(options).length === 0) return undefined;
  return options;
}

function calculateUpchargeCost(
  upcharge: { value: number; unit: string },
  totalShipmentCost: number
): number {
  const { value: upchargeValue, unit: upchargeUnit } = upcharge;

  let result = totalShipmentCost;

  if (
    Number.isFinite(upchargeValue) &&
    upchargeValue > 0 &&
    (upchargeUnit === "dollars" || upchargeUnit === "percent")
  ) {
    if (upchargeUnit === "dollars") {
      result = totalShipmentCost + upchargeValue;
    } else if (upchargeUnit === "percent") {
      result = totalShipmentCost * (1 + upchargeValue / 100);
    }
  }

  return parseFloat(result.toFixed(2)); // always round to cents
}

async function processAddressMode(
  mode: AddressMode,
  formData: FormData,
  profile: UserProfile
) {
  let shipAddress: ShipStationAddress;
  let addressRecord: AddressRecord | null = null;
  const addressValidated: boolean = formData.get("is_validated") === "on";
  if (mode === "saved") {
    const addressId = formData.get("addressId");
    if (typeof addressId !== "string" || addressId.trim().length === 0) {
      throw new Error("A saved sender address must be selected.");
    }

    addressRecord = await getAddressById(addressId, profile.id);
    if (!addressRecord) {
      throw new Error("Sender address not found.");
    }

    shipAddress = recordToShipStationAddress(addressRecord);
  } else {
    const input = parseAddressInput(formData);
    shipAddress = inputToShipStationAddress(input);

    const shouldSave = formData.get("save") === "on";
    if (shouldSave) {
      addressRecord = await createAddress(profile.id, input);
    }
  }
  return { shipAddress, addressRecord, addressValidated };
}

async function processPackageMode(
  prefix: string,
  formData: FormData,
  profile: UserProfile
) {
  const id = formData.get(`${prefix}.id`);
  const savePackage = formData.get(`${prefix}.save`) === "on";

  const weight = parseWeight(formData, prefix);
  const dimensions = parseDimensions(formData, prefix);
  if (id === "new-package") {
    if (savePackage)
      await createPackage(profile.id, {
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        dimension_unit: dimensions.units,
        weight: weight.value,
        weight_unit: weight.units,
        nickname: formData.get(`${prefix}.nickname`) as string | "",
      });
    return { weight, dimensions };
  } else {
    const packageId = formData.get(`${prefix}.id`) as string;

    //if savePackage, user wants to update existing package
    if (savePackage) {
      await updatePackage(packageId, profile.id, {
        weight: weight.value,
        weight_unit: weight.units,
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        dimension_unit: dimensions.units,
        nickname: formData.get(`${prefix}.nickname`) as string | "",
      });
      return { weight, dimensions };
    } else {
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

export async function deleteShippingLabel(labelID: string) {
  const profile = await requireUserProfile();
  if (!profile) throw new Error("No Profile Error");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipping_labels")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", labelID)
    .select();

  if (error || !data) throw new Error(error?.message);

  return;
}
