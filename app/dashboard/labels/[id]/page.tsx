import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth";
import {
  getShippingLabelById,
  type ShipStationAddressSnapshot,
} from "@/lib/supabase/shipping-labels";
import { FEDEX_SERVICES } from "@/lib/shipstation/fedex";
import { formatPhoneNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PrintButton, VoidButton } from "@/components/util-buttons";

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function LabelDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const { id: labelId } = await params;
  const label = await getShippingLabelById(profile.id, labelId);
  if (!label) {
    notFound();
  }

  const createdAt = new Date(label.created_at);
  const voidedAt = label.voided_at ? new Date(label.voided_at) : null;
  const serviceName =
    FEDEX_SERVICES.find((service) => service.code === label.service_code)
      ?.name ?? label.service_code;
  const trackingLink = label.tracking_number
    ? `https://www.fedex.com/wtrk/track/?action=track&trackingnumber=${label.tracking_number}`
    : null;
  const dimensions =
    typeof label.length === "number" &&
    typeof label.width === "number" &&
    typeof label.height === "number"
      ? `${label.length} × ${label.width} × ${label.height} ${label.units}`
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{label.carrier_code}</Badge>
            <Tooltip>
              <TooltipTrigger>
                <StatusBadge voided={label.voided} />
              </TooltipTrigger>
              <TooltipContent>
                {label.voided &&
                  "Voided on " +
                    voidedAt?.toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/labels">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold">{serviceName}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Created{" "}
            {createdAt.toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <VoidButton disabled={label.voided} label={label} />
          <PrintButton label={label} disabled={label.voided} />
          {trackingLink ? (
            <Button asChild>
              <a href={trackingLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Track shipment
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Shipment overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailItem label="Label ID" value={label.id} />
              <DetailItem label="Shipment ID" value={label.shipment_id} />
              <DetailItem
                label="Tracking number"
                value={
                  trackingLink ? (
                    <a
                      className="text-primary underline underline-offset-4"
                      href={trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label.tracking_number}
                    </a>
                  ) : (
                    "Not assigned"
                  )
                }
              />
              <DetailItem
                label="Confirmation"
                value={label.confirmation ?? "None"}
              />
              <DetailItem
                label="Weight"
                value={`${label.weight_value} ${label.weight_unit}`}
              />
              <DetailItem label="Dimensions" value={dimensions} />
              <DetailItem
                label="Shipment cost"
                value={formatCurrency(label.total_shipment_cost)}
              />
              <DetailItem
                label="Insurance cost"
                value={formatCurrency(label.total_insurance_cost)}
              />
              <DetailItem
                label="Voided at"
                value={
                  label.voided_at
                    ? new Date(label.voided_at).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"
                }
              />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <AddressCard title="Ship from" address={label.ship_from_snapshot} />
          <AddressCard title="Ship to" address={label.ship_to_snapshot} />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value === "number") {
    return USD_FORMATTER.format(value);
  }
  return "—";
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

function AddressCard({
  title,
  address,
}: {
  title: string;
  address: ShipStationAddressSnapshot;
}) {
  const hasAddress = Object.values(address ?? {}).some(
    (value) => value !== null && value !== undefined && value !== ""
  );

  const cityState = [address.city, address.state].filter(Boolean).join(", ");
  const postalCountry = [address.postalCode, address.country]
    .filter(Boolean)
    .join(" ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {hasAddress ? (
          <>
            {address.name ? (
              <div className="font-semibold">{address.name}</div>
            ) : null}
            {address.company ? (
              <div className="text-muted-foreground">{address.company}</div>
            ) : null}
            {address.street1 ? <div>{address.street1}</div> : null}
            {address.street2 ? <div>{address.street2}</div> : null}
            {cityState || postalCountry ? (
              <div>{[cityState, postalCountry].filter(Boolean).join(" ")}</div>
            ) : null}
            {address.phone ? (
              <div className="text-muted-foreground">
                Phone: {formatPhoneNumber(address.phone)}
              </div>
            ) : null}
            {address.residential !== null &&
            address.residential !== undefined ? (
              <Badge variant="outline">
                {address.residential ? "Residential" : "Commercial"}
              </Badge>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">
            No address details available for this label.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
