"use client";

import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { Button } from "./ui/button";
import { printLabels } from "@/lib/utils";
import { Loader2, Printer } from "lucide-react";
import { useFormStatus } from "react-dom";
import { voidShippingLabelAction } from "@/lib/actions/shipping";
import { toast } from "sonner";

export function PrintButton(
  props: React.ComponentProps<typeof Button> & { label: ShippingLabelRecord }
) {
  const handleClick = async () => {
    if (props.label?.label_data_base64) {
      await printLabels([props.label.label_data_base64]);
    }
  };

  return (
    <Button {...props} onClick={handleClick}>
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  );
}

export function VoidButton(
  props: React.ComponentProps<typeof Button> & { label: ShippingLabelRecord }
) {
  const VButton = ({ disabled }: { disabled: boolean }) => {
    const { pending } = useFormStatus();
    return (
      <Button
        type="submit"
        variant={disabled ? "secondary" : "destructive"}
        disabled={disabled || pending}
        onClick={(e) => {
          if (disabled || pending) return;
          const ok = window.confirm(
            "Void this label? This action cannot be undone."
          );
          if (!ok) {
            e.preventDefault();
          }
        }}
        className="w-full md:w-auto"
        title={disabled ? "Label already voided" : "Void this label"}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Voiding…
          </>
        ) : disabled ? (
          "Voided"
        ) : (
          "Void Label"
        )}
      </Button>
    );
  };

  return (
    <form
      key={props.label.id}
      action={async (formData) => {
        try {
          await voidShippingLabelAction(formData);
          toast.success("Label voided", {
            description: `Shipment #${props.label.shipment_id}`,
          });
        } catch (error) {
          toast.error("Could not void label", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      }}
    >
      <input type="hidden" name="shipmentId" value={props.label.shipment_id} />
      <VButton disabled={props.label.voided} />
    </form>
  );
}
