"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Clipboard,
  ExternalLink,
  Loader2,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { voidShippingLabelAction } from "@/lib/actions/shipping";
import { toast } from "sonner";
import { printLabels } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { FEDEX_SERVICES } from "@/lib/shipstation/fedex";

export function LabelHistory({ labels }: { labels: ShippingLabelRecord[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...labels].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [labels]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recent shipping labels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center">
            No labels yet. Create your first label to see it here.
          </div>
        ) : (
          sorted.map((label) => {
            const created = new Date(label.created_at);
            const showDims =
              typeof label.length === "number" &&
              typeof label.width === "number" &&
              typeof label.height === "number";

            const isExpanded = expandedId === label.id;

            return (
              <div
                key={label.id}
                className="border rounded-md p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{label.carrier_code}</Badge>
                    <span className="font-semibold truncate max-w-[18rem]">
                      {
                        FEDEX_SERVICES.find(
                          (service) => service.code === label.service_code
                        )?.name
                      }
                    </span>
                    <StatusBadge voided={label.voided} />
                    <span className="text-muted-foreground ml-auto md:ml-0">
                      {created.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {label.tracking_number ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Tracking:</span>
                      <a
                        className="underline underline-offset-2 hover:text-primary"
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
                    {showDims ? (
                      <span>
                        Size: {label.length}×{label.width}×{label.height}{" "}
                        {label.units}
                      </span>
                    ) : null}
                    <span>
                      Cost:{" "}
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(label.total_shipment_cost ?? 0)}
                    </span>
                    <span>Shipment ID: {label.shipment_id}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : label.id)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" /> Hide details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" /> Show details
                      </>
                    )}
                  </button>

                  {isExpanded ? (
                    <div className="mt-1 grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-xs uppercase text-muted-foreground">
                          Ship from
                        </h4>
                        <p className="text-sm break-words">
                          {label.ship_from_snapshot?.name ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs uppercase text-muted-foreground">
                          Ship to
                        </h4>
                        <p className="text-sm break-words">
                          {label.ship_to_snapshot?.name ?? "N/A"}
                        </p>
                      </div>
                      {label.voided && label.voided_at ? (
                        <div className="md:col-span-2 text-xs text-muted-foreground">
                          Voided on{" "}
                          {new Date(label.voided_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-end">
                  {label.tracking_number ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="w-full md:w-auto"
                        title="Open tracking page"
                      >
                        <a
                          href={`https://www.fedex.com/wtrk/track/?action=track&trackingnumber=${label.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" /> Track
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full md:w-auto"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              label.tracking_number!
                            );
                            toast.success("Tracking number copied");
                          } catch {
                            toast.error("Could not copy tracking number");
                          }
                        }}
                      >
                        <Clipboard className="mr-2 h-4 w-4" /> Copy
                      </Button>
                    </>
                  ) : null}

                  <Button
                    size="sm"
                    className="w-full md:w-auto"
                    disabled={!label.label_data_base64 || label.voided}
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

                  <form
                    key={label.id}
                    action={async (formData) => {
                      try {
                        await voidShippingLabelAction(formData);
                        toast.success("Label voided", {
                          description: `Shipment #${label.shipment_id}`,
                        });
                      } catch (error) {
                        toast.error("Could not void label", {
                          description:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        });
                      }
                    }}
                  >
                    <input
                      type="hidden"
                      name="shipmentId"
                      value={label.shipment_id}
                    />
                    <VoidButton disabled={label.voided} />
                  </form>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function VoidButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={disabled ? "secondary" : "destructive"}
      size="sm"
      disabled={disabled || pending}
      onClick={(e) => {
        if (disabled || pending) return;
        const ok = window.confirm(
          "Void this label? This action cannot be undone."
        );
        if (!ok) {
          e.preventDefault();
        }
      }}
      className="w-full md:w-auto"
      title={disabled ? "Label already voided" : "Void this label"}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Voiding…
        </>
      ) : disabled ? (
        "Voided"
      ) : (
        "Void Label"
      )}
    </Button>
  );
}
