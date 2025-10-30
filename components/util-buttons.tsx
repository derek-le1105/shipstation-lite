"use client";

import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { Button } from "./ui/button";
import { printLabels } from "@/lib/utils";
import { Printer } from "lucide-react";

export function PrintButton(
  props: React.ComponentProps<typeof Button> & ShippingLabelRecord
) {
  const handleClick = async () => {
    if (props?.label_data_base64) {
      await printLabels([props.label_data_base64]);
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
  props: React.ComponentProps<typeof Button> & ShippingLabelRecord
) {
  const handleClick = async () => {
    // Implement void label logic here
  };

  return (
    <Button {...props} onClick={handleClick}>
      Void Label
    </Button>
  );
}
