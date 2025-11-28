import { voidLabel } from "@/lib/shipstation/client";
import { createClient } from "@/lib/supabase/server";
import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const payload = (await request.json()) as ShippingLabelRecord;
  if (!payload.shipment_id)
    return NextResponse.json(
      { message: "Shipment ID or Order Number required" },
      { status: 400 }
    );
  const { approved, message } = await voidLabel(payload.shipment_id);
  if (!approved)
    return NextResponse.json(
      { message, shipment_id: payload.shipment_id, success: false },
      { status: 400 }
    );

  const { data, error } = await supabase
    .from("shipping_labels")
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq("shipment_id", payload.shipment_id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json(
      { error, shipment_id: payload.shipment_id, success: false },
      { status: 400 }
    );

  revalidatePath("/admin/labels");
  return NextResponse.json({
    message,
    shipment_id: data?.shipment_id,
    success: true,
  });
}
