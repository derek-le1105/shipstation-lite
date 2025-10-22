import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminProfile } from "@/lib/auth";
import {
  listAllShippingLabels,
  type ShippingLabelWithProfile,
} from "@/lib/supabase/shipping-labels";

function AdminTable({ labels }: { labels: ShippingLabelWithProfile[] }) {
  if (labels.length === 0) {
    return (
      <div className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
        No shipping labels have been generated yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Created</th>
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Carrier</th>
            <th className="px-4 py-3 text-left">Service</th>
            <th className="px-4 py-3 text-left">Tracking</th>
            <th className="px-4 py-3 text-right">Cost</th>
            <th className="px-4 py-3 text-left">Download</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr key={label.id} className="border-t border-border/60">
              <td className="px-4 py-3 whitespace-nowrap">
                {new Date(label.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {label.profiles?.full_name ?? label.profiles?.email ?? "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {label.profiles?.email ?? "No email"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{label.carrier_code}</Badge>
              </td>
              <td className="px-4 py-3">{label.service_code}</td>
              <td className="px-4 py-3">{label.tracking_number ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                {label.shipment_cost ? `$${label.shipment_cost.toFixed(2)}` : "—"}
              </td>
              <td className="px-4 py-3">
                {label.label_download_url ? (
                  <a
                    href={label.label_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    PDF
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage() {
  try {
    await requireAdminProfile();
  } catch {
    redirect("/dashboard");
  }

  const labels = await listAllShippingLabels();

  const totalCost = labels.reduce(
    (sum, label) => sum + (label.shipment_cost ?? 0),
    0,
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
