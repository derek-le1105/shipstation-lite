"use client";

import { ShippingLabelWithProfile } from "@/lib/supabase/shipping-labels";
import { printLabels } from "@/lib/utils";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { FEDEX_SERVICES, generateTrackingLink } from "@/lib/shipstation/fedex";
import { StatusBadge } from "../dashboard/status-badge";
import { Badge } from "../ui/badge";

export function AdminTable({ labels }: { labels: ShippingLabelWithProfile[] }) {
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
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Paid</th>
            <th className="px-4 py-3 text-left">Service</th>
            <th className="px-4 py-3 text-left">Tracking</th>
            <th className="px-4 py-3 text-left">Cost</th>
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
                    {label.profiles?.full_name ??
                      label.profiles?.email ??
                      "Unknown"}
                  </span>
                  <span className="text-xs truncate text-muted-foreground">
                    {label.profiles?.email ?? "No email"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  variant={label.voided_at ? "destructive" : "success"}
                  title={label.voided_at ? "Voided" : "Active"}
                />
              </td>
              <td className="px-4 py-3">
                <Badge variant={label.paid_at ? "success" : "destructive"}>
                  {label.paid_at ? "Paid" : "Unpaid"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {
                  FEDEX_SERVICES.find(
                    (service) => service.code === label.service_code
                  )?.name
                }
              </td>
              <td className="px-4 py-3 underline">
                {label.tracking_number ? (
                  <a href={generateTrackingLink(label.tracking_number)}>
                    {label.tracking_number}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-left">
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(label.shipment_cost ?? 0)}
              </td>
              <td className="px-4 py-3">
                {label.label_data_base64 ? (
                  <Button
                    size="sm"
                    className="w-full md:w-auto"
                    disabled={!label.label_data_base64 || !!label.voided_at}
                    onClick={async () => {
                      try {
                        await printLabels([label.label_data_base64!]);
                      } catch (e) {
                        toast.error(
                          e instanceof Error
                            ? e.message
                            : "Unable to print label"
                        );
                      }
                    }}
                  >
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
