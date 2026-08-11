"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { voidLabel, cancelShipment } from "../shipstation/client";
import type { ShipStationAddressSnapshot } from "../supabase/shipping-labels";

type CheckDuplicateOrderResult = {
  duplicate: boolean;
  addressMismatch: boolean;
  crossUserDuplicate: boolean;
  existingAddress?: ShipStationAddressSnapshot;
};

function normalize(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export async function checkDuplicateOrderNumber(
  orderNumber: string,
  shipTo: { street1: string; city: string; state: string; postalCode: string },
): Promise<CheckDuplicateOrderResult> {
  const supabase = await createClient();

  const { data: labels, error } = await supabase
    .from("shipping_labels")
    .select("user_id, order_number, ship_to_snapshot")
    .ilike("order_number", `%${orderNumber}`)
    .is("voided_at", null)
    .limit(1);

  if (error) {
    console.error("checkDuplicateOrderNumber error:", error);
    return {
      duplicate: false,
      addressMismatch: false,
      crossUserDuplicate: false,
    };
  }

  if (!labels || labels.length === 0) {
    return {
      duplicate: false,
      addressMismatch: false,
      crossUserDuplicate: false,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const label = labels[0];

  // Label belongs to another user — don't expose their address
  if (label.user_id !== user?.id) {
    return {
      duplicate: true,
      addressMismatch: false,
      crossUserDuplicate: true,
    };
  }

  // Label belongs to the current user — compare addresses
  const snapshot = label.ship_to_snapshot as ShipStationAddressSnapshot;
  const mismatch =
    normalize(shipTo.street1) !== normalize(snapshot.street1) ||
    normalize(shipTo.city) !== normalize(snapshot.city) ||
    normalize(shipTo.state) !== normalize(snapshot.state) ||
    normalize(shipTo.postalCode) !== normalize(snapshot.postalCode);

  return {
    duplicate: true,
    addressMismatch: mismatch,
    crossUserDuplicate: false,
    existingAddress: mismatch ? snapshot : undefined,
  };
}

export async function updatePaidStatus(id: string, type: "paid" | "unpaid") {
  const supabase = await createClient();
  const { data: label, error: fetchError } = await supabase
    .from("shipping_labels")
    .select("id, paid_at")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    console.log("fetchError: ", fetchError);
    throw new Error(fetchError.message);
  }

  if (!label) {
    throw new Error("Label not found!");
  }

  if (label.paid_at) {
    return {
      message: `Label already paid on ${new Date(
        label.paid_at ?? "",
      ).toDateString()}`,
      id,
      success: true,
    };
  }

  const { data: updatedLabel, error: updateError } = await supabase
    .from("shipping_labels")
    .update({ paid_at: type === "paid" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return {
      message: updateError.message,
      success: false,
      id,
    };
  }
  revalidatePath("/admin/labels");

  return {
    message: "Succesfully updated label.",
    id: updatedLabel?.id,
    success: true,
  };
}

export async function bulkUpdatePaidStatus(
  ids: string[],
  type: "paid" | "unpaid",
) {
  const supabase = await createClient();
  const { data: labels, error: fetchError } = await supabase
    .from("shipping_labels")
    .select("id, paid_at")
    .in("id", ids);
  if (fetchError) {
    console.log("fetchError: ", fetchError);
    throw new Error(fetchError.message);
  }

  if (!labels) {
    throw new Error("Labels not found!");
  }

  const { error: updateError } = await supabase
    .from("shipping_labels")
    .update({ paid_at: type === "paid" ? new Date().toISOString() : null })
    .in("id", ids)
    .select("*");

  if (updateError) {
    return {
      message: updateError.message,
      success: false,
    };
  }

  revalidatePath("/admin/labels");

  return {
    message: "Succesfully updated label.",
    success: true,
  };
}

export async function voidShippingLabel(
  label_id: string,
  type: "dashboard" | "admin",
) {
  const supabase = await createClient();

  try {
    const { approved, message } = await voidLabel(label_id);
    if (!approved) return { message: message, success: false };

    const { data, error } = await supabase
      .from("shipping_labels")
      .update({ voided_at: new Date().toISOString() })
      .eq("label_id", label_id)
      .select("*")
      .single();

    if (error || !data) return { message: error.message, success: false };

    if (data.shipment_id) {
      try {
        await cancelShipment(data.shipment_id);
      } catch (cancelErr) {
        console.log("cancelShipment failed:", cancelErr);
      }
    }

    revalidatePath(`${type}/labels`);
    return {
      message: "Succesfully voided label",
      success: true,
    };
  } catch (error) {
    console.log(error);
  }
}

export async function bulkVoidShippingLabels(
  label_ids: string[],
  type: "dashboard" | "admin",
) {
  const supabase = await createClient();

  try {
    await Promise.all(
      label_ids.map(async (label_id) => {
        const { approved, message } = await voidLabel(label_id);
        if (!approved) return { message, success: false };
      }),
    );

    const { data, error } = await supabase
      .from("shipping_labels")
      .update({ voided_at: new Date().toISOString() })
      .in("label_id", label_ids)
      .select("*");

    if (error || !data) return { message: error.message, success: false };

    await Promise.all(
      data
        .filter(
          (label): label is typeof label & { shipment_id: string } =>
            !!label.shipment_id,
        )
        .map(async (label) => {
          try {
            await cancelShipment(label.shipment_id);
          } catch (cancelErr) {
            console.log("cancelShipment failed:", cancelErr);
          }
        }),
    );

    revalidatePath(`${type}/labels`);

    return {
      message: "Succesfully voided label",
      success: true,
    };
  } catch (error) {
    console.log(error);
  }
}
