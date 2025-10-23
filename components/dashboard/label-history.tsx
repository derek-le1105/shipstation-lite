"use client";

import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { voidShippingLabelAction } from "@/lib/actions/shipping";
import { Spinner } from "../ui/spinner";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function LabelHistory({ labels }: { labels: ShippingLabelRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recent shipping labels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create your first label to see it listed here.
          </p>
        ) : (
          labels.map((label) => (
            <div
              key={label.id}
              className="border rounded-md p-4 flex justify-between"
            >
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">{label.carrier_code}</Badge>
                  <span className="font-semibold">{label.service_code}</span>
                  <span className="text-muted-foreground">
                    Created:{" "}
                    {new Date(label.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {label.tracking_number ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-muted-foreground">Tracking: </span>
                    <a
                      className="underline hover:text-primary"
                      href={`https://www.fedex.com/wtrk/track/?action=track&trackingnumber=${label.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label.tracking_number}
                    </a>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-4 text-muted-foreground">
                  <span>
                    Weight: {label.weight_value} {label.weight_unit}
                  </span>
                  {label.shipment_cost ? (
                    <span>Cost: ${label.shipment_cost.toFixed(2)}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <h4 className="text-xs uppercase text-muted-foreground">
                      Ship from
                    </h4>
                    <p className="text-sm">{label.ship_from_snapshot.name}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase text-muted-foreground">
                      Ship to
                    </h4>
                    <p className="text-sm">{label.ship_to_snapshot.name}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <form
                  key={label.id}
                  action={async (formData) => {
                    try {
                      await voidShippingLabelAction(formData);
                      toast.success("Label voided successfully.");
                    } catch (error) {
                      toast.error(
                        `Error voiding label: ${
                          error instanceof Error ? error.message : String(error)
                        }`
                      );
                    }
                  }}
                  className="flex items-center"
                >
                  <input
                    type="hidden"
                    name="shipmentId"
                    value={label.shipment_id}
                  />
                  <VoidButton disabled={label.voided} />
                </form>
                {label.voided && label.voided_at && (
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    {` Voided on ${new Date(label.voided_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}`}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function VoidButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending}>
      {pending ? (
        <>
          Voiding... <Spinner />
        </>
      ) : disabled ? (
        "Voided"
      ) : (
        "Void Label"
      )}
    </Button>
  );
}
