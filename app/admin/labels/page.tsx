import { LabelsTable } from "@/components/labels/labels-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth";
import { listAllShippingLabels } from "@/lib/supabase/shipping-labels";
import { redirect } from "next/navigation";

export default async function AdminLabelsPage() {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const labels = await listAllShippingLabels(true);

  return (
    <section className=" space-y-1">
      <div className="text-lg font-semibold">Labels</div>
      <LabelsTable labels={labels} showUserId />
    </section>
  );
}
