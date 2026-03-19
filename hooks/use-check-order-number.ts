import { useEffect, useRef, useState } from "react";
import { checkDuplicateOrderNumber } from "@/lib/actions/labels";
import type { ShipStationAddressSnapshot } from "@/lib/supabase/shipping-labels";

type CheckResult = {
  duplicate: boolean;
  addressMismatch: boolean;
  crossUserDuplicate: boolean;
  existingAddress?: ShipStationAddressSnapshot;
};

export function useCheckOrderNumber(
  orderNumber: string,
  formRef: React.RefObject<HTMLFormElement | null>
) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = orderNumber.trim();
    if (!trimmed) {
      setResult(null);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      const form = formRef.current;
      if (!form) return;

      const formData = new FormData(form);
      const street1 = (formData.get("address_line1") as string) ?? "";
      const city = (formData.get("city") as string) ?? "";
      const state = (formData.get("state") as string) ?? "";
      const postalCode = (formData.get("postal_code") as string) ?? "";

      if (!street1 && !city && !state && !postalCode) {
        setResult(null);
        return;
      }

      setIsChecking(true);
      try {
        const data = await checkDuplicateOrderNumber(trimmed, {
          street1,
          city,
          state,
          postalCode,
        });
        setResult(data);
      } catch {
        setResult(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [orderNumber, formRef]);

  return {
    isDuplicate: result?.duplicate ?? false,
    isAddressMismatch: result?.addressMismatch ?? false,
    isCrossUserDuplicate: result?.crossUserDuplicate ?? false,
    existingAddress: result?.existingAddress ?? null,
    isChecking,
  };
}
