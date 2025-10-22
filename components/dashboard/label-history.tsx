"use client";

import { voidLabel } from "@/lib/shipstation/client";
import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

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
                  {label.tracking_number ? (
                    <span className="text-muted-foreground">
                      Tracking: {label.tracking_number}
                    </span>
                  ) : null}
                </div>
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
              {/* <div className="flex items-center">
                <Button
                  onClick={async () => {
                    await voidLabel(label.shipment_id);
                  }}
                  disabled={label.voided}
                >
                  Void Label
                </Button>
              </div> */}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
