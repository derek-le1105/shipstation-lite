"use client";

import { getNextOrderNumber } from "@/lib/supabase/shipping-labels";
import { useQuery } from "@tanstack/react-query";

export default function useNextOrderNumber() {
  const query = useQuery({
    queryKey: ["next-order-number"],
    queryFn: async () => {
      return await getNextOrderNumber();
    },
  });
  return query;
}
