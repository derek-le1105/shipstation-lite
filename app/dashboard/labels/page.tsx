import { LabelsTable } from "@/components/labels/labels-table";
import { SiteHeaderSidebarTrigger } from "@/components/site-header-sidebar-trigger";
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
    <div className="space-y-2">
      <div className="flex items-center gap-1 h-6">
        <SiteHeaderSidebarTrigger />
        <span className="flex items-center font-semibold">Labels</span>
      </div>
      <LabelsTable labels={labels} />
    </div>
  );
}
