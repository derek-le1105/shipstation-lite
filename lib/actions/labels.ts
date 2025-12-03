"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { voidLabel } from "../shipstation/client";

export async function updatePaidStatus(shipment_id: number, paid: boolean) {
  const supabase = await createClient();
  const { data: label, error: fetchError } = await supabase
    .from("shipping_labels")
    .select("id, shipment_id, paid, paid_at")
    .eq("shipment_id", shipment_id)
    .maybeSingle();
  if (fetchError) {
    console.log("fetchError: ", fetchError);
    throw new Error(fetchError.message);
  }

  if (!label) {
    throw new Error("Label not found!");
  }

  if (label.paid) {
    return {
      message: `Label already paid on ${new Date(
        label.paid_at ?? ""
      ).toDateString()}`,
      shipment_id,
      success: true,
    };
  }

  const { data: updatedLabel, error: updateError } = await supabase
    .from("shipping_labels")
    .update({ paid, paid_at: new Date().toISOString() })
    .eq("shipment_id", shipment_id)
    .select("*")
    .single();

  if (updateError) {
    return {
      message: updateError.message,
      success: false,
      shipment_id,
    };
  }
  revalidatePath("/admin/labels");

  return {
    message: "Succesfully updated label.",
    shipment_id: updatedLabel?.shipment_id,
    success: true,
  };
}

export async function bulkUpdatePaidStatus(
  shipment_ids: number[],
  paid: boolean
) {
  const supabase = await createClient();
  const { data: labels, error: fetchError } = await supabase
    .from("shipping_labels")
    .select("id, shipment_id, paid, paid_at")
    .in("shipment_id", shipment_ids);
  if (fetchError) {
    console.log("fetchError: ", fetchError);
    throw new Error(fetchError.message);
  }

  if (!labels) {
    throw new Error("Labels not found!");
  }

  const { error: updateError } = await supabase
    .from("shipping_labels")
    .update({ paid, paid_at: new Date().toISOString() })
    .in("shipment_id", shipment_ids)
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
  shipment_id: number,
  type: "dashboard" | "admin"
) {
  const supabase = await createClient();

  try {
    const { approved, message } = await voidLabel(shipment_id);
    if (!approved) return { message: message, success: false };

    const { data, error } = await supabase
      .from("shipping_labels")
      .update({ voided: true, voided_at: new Date().toISOString() })
      .eq("shipment_id", shipment_id)
      .select("*")
      .single();

    if (error || !data) return { message: error.message, success: false };
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
  shipment_ids: number[],
  type: "dashboard" | "admin"
) {
  const supabase = await createClient();

  try {
    await Promise.all(
      shipment_ids.map(async (shipment_id) => {
        const { approved, message } = await voidLabel(shipment_id);
        if (!approved) return { message, success: false };
      })
    );

    const { data, error } = await supabase
      .from("shipping_labels")
      .update({ voided: true, voided_at: new Date().toISOString() })
      .in("shipment_id", shipment_ids)
      .select("*");

    if (error || !data) return { message: error.message, success: false };
    revalidatePath(`${type}/labels`);

    return {
      message: "Succesfully voided label",
      success: true,
    };
  } catch (error) {
    console.log(error);
  }
}
