import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminProfile } from "@/lib/auth";
import { listAllShippingLabels } from "@/lib/supabase/shipping-labels";
import { AdminTable } from "@/components/admin/admin-table";

export default async function AdminPage() {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const labels = await listAllShippingLabels();

  const totalCost = labels.reduce(
    (sum, label) => sum + (label.shipment_cost ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Total labels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{labels.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Total shipping spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Unique shippers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {new Set(labels.map((label) => label.user_id)).size}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Shipping activity across all users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminTable labels={labels} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
