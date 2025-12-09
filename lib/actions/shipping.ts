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
  type ShippingLabelRecord,
} from "@/lib/supabase/shipping-labels";
import {
  createLabel,
  createLabelForOrder,
  createOrder,
  listOrders,
  voidLabel,
} from "@/lib/shipstation/client";
import {
  AdvancedOptions,
  CreateOrderPayload,
  InsuranceOption,
  ShipStationOrder,
  ShipStationOrderLabel,
  type ShipStationAddress,
  type ShipStationLabel,
  type ShipStationWeight,
} from "@/lib/shipstation/types";
import { createClient } from "../supabase/server";
import { getUserUpcharge } from "../supabase/admin";
import {
  createPackage,
  getPackageById,
  updatePackage,
} from "../supabase/packages";

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
    is_residential: get("is_residential") === "on",
    is_validated: get("is_validated") === "on",
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
      shipStationLabel: ShipStationLabel | ShipStationOrderLabel;
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
    .select("id, user_id, voided_at")
    .eq("shipment_id", shipmentId)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.user_id !== profile.id) throw new Error("Not found");

  if (!row.voided_at) {
    const { approved, message } = await voidLabel(shipmentId);
    console.log(`voidLabel response for ${shipmentId}:`, { approved, message });
    if (!approved)
      throw new Error(message || "Unable to void label at this time.");

    const { data: updatedLabel, error: updatedLabelError } = await supabase
      .from("shipping_labels")
      .update({ voided_at: new Date().toISOString() })
      .eq("shipment_id", shipmentId)
      .select("*")
      .single();
    if (updatedLabelError) throw updatedLabelError;
    if (!updatedLabel.voided_at)
      throw new Error("Failed to update label status.");
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

    let orderNumber = formData.get("orderNumber") as string | null;
    if (!orderNumber) orderNumber = await getNextOrderNumber();
    const carrierCode = getCarrierCode(formData);
    const serviceCode = getServiceCode(formData);

    const { shipAddress: shipFrom, addressRecord: fromAddressRecord } =
      await processAddressMode(fromMode, "from", formData, profile);
    const {
      shipAddress: shipTo,
      addressRecord: toAddressRecord,
      addressValidated,
    } = await processAddressMode(toMode, "to", formData, profile);

    const packagesCount = Number(formData.get("packages.count")) || 1;

    let createOrderResponse: ShipStationOrder | null = null;
    if (orderNumber) {
      createOrderResponse = await createShipStationOrder({
        orderNumber,
        shipTo,
        billTo: shipTo,
        orderDate: new Date().toISOString(),
        orderStatus: "awaiting_shipment",
        advancedOptions: {
          warehouseId: profile?.warehouse_id,
        },
      });
      if (!createOrderResponse) {
        throw new Error("Failed to create order in ShipStation.");
      }
    }

    const settled = await Promise.allSettled<CreateShippingItemResult>(
      [...Array(packagesCount)].map(async (_, index) => {
        const prefix = `package-${index}`;
        try {
          let labelResponse: ShipStationLabel | ShipStationOrderLabel;
          const insuranceOptions = processInsuranceOption(formData, prefix);
          const advancedOptions = processAdvancedOptions(formData, prefix);
          const { weight, dimensions } = await processPackageMode(
            prefix,
            formData,
            profile
          );
          if (orderNumber && createOrderResponse) {
            labelResponse = await createLabelForOrder({
              orderId: createOrderResponse.orderId,
              shipDate: new Date().toISOString(),
              testLabel: false,
              carrierCode,
              serviceCode,
              packageCode: PACKAGE_CODE,
              confirmation: CONFIRMATION,
              weight,
              dimensions,
              ...(insuranceOptions && { insuranceOptions }),
              ...(advancedOptions && { advancedOptions }),
            });
          } else {
            labelResponse = await createLabel({
              shipFrom,
              shipTo,
              carrierCode,
              serviceCode,
              packageCode: PACKAGE_CODE,
              confirmation: CONFIRMATION,
              weight,
              dimensions,
              ...(insuranceOptions && { insuranceOptions }),
              ...(advancedOptions && { advancedOptions }),
            });
          }

          const upchargedShipmentCost = calculateUpchargeCost(
            upcharge,
            labelResponse.shipmentCost
          );
          const upchargedInsuranceCost = calculateUpchargeCost(
            upcharge,
            labelResponse.insuranceCost
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
              carrier_code: carrierCode,
              service_code: serviceCode,
              package_code: "package",
              confirmation: CONFIRMATION,
              shipment_cost: labelResponse.shipmentCost ?? null,
              insurance_cost: labelResponse.insuranceCost ?? null,
              total_shipment_cost: upchargedShipmentCost,
              total_insurance_cost: upchargedInsuranceCost,
              tracking_number: labelResponse.trackingNumber ?? null,
              label_data_base64: labelResponse.labelData ?? null,
              shipment_id: labelResponse.shipmentId,
              voided_at: null,
              paid_at: null,
              order_number: orderNumber,
              is_address_validated: addressValidated,
              insurance_options: insuranceOptions ?? {
                provider: "none",
                insureShipment: false,
                insuredValue: 0,
              },
              advanced_options: advancedOptions ?? {
                saturdayDelivery: false,
              },
            });

            return {
              index,
              ok: true as const,
              savedLabel,
              shipStationLabel: labelResponse,
            };
          } catch (dbErr) {
            console.log(dbErr);
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

async function createShipStationOrder(payload: CreateOrderPayload) {
  const { orderNumber } = payload;

  const existingOrders = await listOrders({ orderNumber });

  if (existingOrders.total > 0) {
    const valid = existingOrders.orders.filter(
      (order) => order.orderStatus !== "cancelled"
    );
    if (valid.length > 0) {
      console.log("Using existing ShipStation order:", valid[0].orderId);
      return valid[0];
    }
  }
  return createOrder(payload);
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
  prefix: "from" | "to",
  formData: FormData,
  profile: UserProfile
) {
  let shipAddress: ShipStationAddress;
  let addressRecord: AddressRecord | null = null;
  const addressValidated: boolean =
    formData.get(`${prefix}.is_validated`) === "on";
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

    const shouldSave = formData.get(`${prefix}.save`) === "on";
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
