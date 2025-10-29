import { LabelsTable } from "@/components/dashboard/labels-table";
import { getCurrentProfile } from "@/lib/auth";
import { listShippingLabelsForUser } from "@/lib/supabase/shipping-labels";
import { redirect } from "next/navigation";

export const metadata = {
  title: "UNS Shipping Manager - Labels",
};

export default async function LabelsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  const labels = await listShippingLabelsForUser(profile.id, {
    excludeColumns: ["shipment_cost", "insurance_cost"],
  });

  return (
    <div>
      <LabelsTable labels={labels} />
    </div>
  );
}
