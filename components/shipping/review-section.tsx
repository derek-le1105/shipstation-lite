import { AddressRecord } from "@/lib/supabase/addresses";
import { WarehouseRecord } from "@/lib/supabase/warehouses";
import { AddressMode } from "./types";
import {
  ShipStationCarrier,
  ShipStationRate,
  ShipStationRatesRequest,
  ShipStationService,
} from "@/lib/shipstation/types";
import { RefObject, useEffect, useMemo, useState } from "react";
import {
  buildRatesRequest,
  parseCheckboxValue,
} from "@/lib/shipping-label/utils";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Fieldset } from "../ui/fieldset";
import { Badge } from "../ui/badge";
import { Loader2 } from "lucide-react";
import { Separator } from "../ui/separator";
import { formatPhoneNumber } from "@/lib/utils";
import useNextOrderNumber from "@/hooks/use-next-order-number";

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type ReviewCreateLabelProps = {
  visible: boolean;
  shipFrom: WarehouseRecord;
  toAddresses: AddressRecord[];
  toMode: AddressMode;
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  selectedCarrier: string;
  selectedService: string;
  formRef: RefObject<HTMLFormElement | null>;
};

type ReviewAddressSnapshot = {
  contactName: string;
  company: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isResidential: boolean;
  isValidated: boolean;
};

type ReviewPackageSnapshot = {
  index: number;
  id: string;
  nickname: string;
  weightValue: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
  confirmation: string;
  insuranceProvider: string;
  insuranceValue: number | null;
  saturdayDelivery: boolean;
};

type ReviewSnapshot = {
  orderNumber: string;
  to: ReviewAddressSnapshot;
  packages: ReviewPackageSnapshot[];
};

type PackageQuote =
  | { index: number; status: "incomplete" }
  | { index: number; status: "loading" }
  | { index: number; status: "error"; message: string }
  | {
      index: number;
      status: "success";
      request: ShipStationRatesRequest;
      selectedRate: ShipStationRate | null;
      rates: ShipStationRate[];
    };

function ReviewRow({
  label,
  value,
  emptyValue = "",
}: {
  label: string;
  value: string;
  emptyValue?: string;
}) {
  const resolved = value?.trim() ? value : emptyValue;
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium">{resolved}</span>
    </div>
  );
}

function readToAddressSnapshot(formData: FormData): ReviewAddressSnapshot {
  const getString = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    contactName: getString("contact_name"),
    company: getString("company"),
    phone: getString("phone"),
    email: getString("email"),
    addressLine1: getString("address_line1"),
    addressLine2: getString("address_line2"),
    city: getString("city"),
    state: getString("state"),
    postalCode: getString("postal_code"),
    country: getString("country") || "US",
    isResidential: parseCheckboxValue(formData.get("is_residential")),
    isValidated: parseCheckboxValue(formData.get("is_validated")),
  };
}

function readPackagesSnapshot(formData: FormData): ReviewPackageSnapshot[] {
  const packagesCount = Number(formData.get("packages.count")) || 1;

  const getString = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const getNumberOrNull = (key: string) => {
    const raw = getString(key);
    if (!raw) return null;
    const num = Number.parseFloat(raw);
    return Number.isFinite(num) ? num : null;
  };

  return [...Array(packagesCount)].map((_, index) => {
    const prefix = `package-${index}`;
    return {
      index,
      id: getString(`${prefix}.id`),
      nickname: getString(`${prefix}.nickname`),
      weightValue: getNumberOrNull(`${prefix}.weight.value`),
      weightUnit: getString(`${prefix}.weight.unit`),
      length: getNumberOrNull(`${prefix}.dimensions.length`),
      width: getNumberOrNull(`${prefix}.dimensions.width`),
      height: getNumberOrNull(`${prefix}.dimensions.height`),
      dimensionUnit: getString(`${prefix}.dimensions.unit`),
      confirmation: getString(`${prefix}.confirmation`),
      insuranceProvider: getString(`${prefix}.insuranceOptions.provider`),
      insuranceValue: getNumberOrNull(
        `${prefix}.insuranceOptions.insuredValue`
      ),
      saturdayDelivery: parseCheckboxValue(
        formData.get(`${prefix}.advancedOptions.saturday_delivery`)
      ),
    };
  });
}

function formatWarehouseRecord(shipFrom: WarehouseRecord) {
  const line2 = shipFrom.originAddress_street2
    ? ` ${shipFrom.originAddress_street2}`
    : "";
  const line3 = shipFrom.originAddress_street3
    ? ` ${shipFrom.originAddress_street3}`
    : "";
  const country = shipFrom.originAddress_country || "US";
  return `${shipFrom.originAddress_street1}${line2}${line3}, ${shipFrom.originAddress_city}, ${shipFrom.originAddress_state} ${shipFrom.originAddress_postalCode}, ${country}`.trim();
}

function formatAddressLines(address: ReviewAddressSnapshot) {
  const line2 = address.addressLine2 ? ` ${address.addressLine2}` : "";
  const country = address.country || "US";
  return `${address.addressLine1}${line2}, ${address.city}, ${address.state} ${address.postalCode}, ${country}`.trim();
}

function formatWeight(pkg: ReviewPackageSnapshot) {
  if (pkg.weightValue === null || !pkg.weightUnit) return "";
  return `${pkg.weightValue} ${pkg.weightUnit}`;
}

function formatDimensions(pkg: ReviewPackageSnapshot) {
  if (
    pkg.length === null ||
    pkg.width === null ||
    pkg.height === null ||
    !pkg.dimensionUnit
  ) {
    return "";
  }
  return `${pkg.length} × ${pkg.width} × ${pkg.height} ${pkg.dimensionUnit}`;
}

export function ReviewSection({
  visible,
  shipFrom,
  toAddresses,
  toMode,
  carriers,
  services,
  selectedCarrier,
  selectedService,
  formRef,
}: ReviewCreateLabelProps) {
  const [changeCounter, setChangeCounter] = useState(0);
  const debouncedCounter = useDebounce(changeCounter, 400);
  const { data } = useNextOrderNumber();

  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null);
  const [packageQuotes, setPackageQuotes] = useState<PackageQuote[]>([]);

  useEffect(() => {
    if (!visible) return;
    setChangeCounter((current) => current + 1);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const form = formRef.current;
    if (!form) return;

    const onFormChange = () => setChangeCounter((current) => current + 1);
    form.addEventListener("input", onFormChange);
    form.addEventListener("change", onFormChange);

    return () => {
      form.removeEventListener("input", onFormChange);
      form.removeEventListener("change", onFormChange);
    };
  }, [visible, formRef]);

  useEffect(() => {
    if (!visible) return;
    const form =
      formRef.current ??
      (document.getElementById("create-label-form") as HTMLFormElement | null);
    if (!form) return;

    const formData = new FormData(form);

    const toSnapshot = readToAddressSnapshot(formData);
    const orderNumber =
      (formData.get("orderNumber") as string | null)?.trim() ?? "";
    const packages = readPackagesSnapshot(formData);

    setSnapshot({ orderNumber, to: toSnapshot, packages });

    const requests = packages.map((pkg) =>
      buildRatesRequest(pkg.index, formData, { shipFrom, toAddresses, toMode })
    );

    if (requests.every((req) => req === null)) {
      setPackageQuotes(
        packages.map((pkg) => ({ index: pkg.index, status: "incomplete" }))
      );
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setPackageQuotes((current) => {
      const next: PackageQuote[] = packages.map((pkg, idx) => {
        const request = requests[idx];
        if (!request) return { index: pkg.index, status: "incomplete" };
        const existing = current.find((q) => q.index === pkg.index);
        if (existing?.status === "success")
          return { index: pkg.index, status: "loading" };
        return { index: pkg.index, status: "loading" };
      });
      return next;
    });

    const fetchAll = async () => {
      const results = await Promise.all(
        requests.map(async (request, idx) => {
          if (!request) {
            return {
              index: packages[idx]!.index,
              quote: {
                index: packages[idx]!.index,
                status: "incomplete",
              } as PackageQuote,
            };
          }

          try {
            const response = await fetch("/api/shipstation/rates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(request),
              signal: controller.signal,
            });

            if (!response.ok) {
              let message = "Unable to fetch ShipStation quote.";
              try {
                const detail = (await response.json()) as { message?: string };
                if (detail?.message) message = detail.message;
              } catch {
                // ignore
              }
              return {
                index: packages[idx]!.index,
                quote: {
                  index: packages[idx]!.index,
                  status: "error",
                  message,
                } as PackageQuote,
              };
            }

            const data = (await response.json()) as {
              rates?: ShipStationRate[];
            };
            const rates = Array.isArray(data.rates) ? data.rates : [];
            const selected =
              rates.find((rate) => rate.serviceCode === selectedService) ??
              null;
            return {
              index: packages[idx]!.index,
              quote: {
                index: packages[idx]!.index,
                status: "success",
                request,
                rates,
                selectedRate: selected,
              } as PackageQuote,
            };
          } catch (error) {
            if (controller.signal.aborted) {
              return {
                index: packages[idx]!.index,
                quote: {
                  index: packages[idx]!.index,
                  status: "incomplete",
                } as PackageQuote,
              };
            }
            const message =
              error instanceof Error
                ? error.message
                : "Unable to fetch ShipStation quote.";
            return {
              index: packages[idx]!.index,
              quote: {
                index: packages[idx]!.index,
                status: "error",
                message,
              } as PackageQuote,
            };
          }
        })
      );

      if (cancelled) return;

      const next = results
        .sort((a, b) => a.index - b.index)
        .map((item) => item.quote);
      setPackageQuotes(next);
    };

    void fetchAll();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visible,
    debouncedCounter,
    formRef,
    shipFrom,
    toAddresses,
    toMode,
    selectedCarrier,
    selectedService,
  ]);

  const carrierLabel = useMemo(() => {
    return (
      carriers.find((carrier) => carrier.code === selectedCarrier)?.name ??
      selectedCarrier
    );
  }, [carriers, selectedCarrier]);

  const serviceLabel = useMemo(() => {
    return (
      services.find((service) => service.code === selectedService)?.name ??
      selectedService
    );
  }, [services, selectedService]);

  const totalQuote = useMemo(() => {
    const totals = packageQuotes
      .map((quote) => {
        if (quote.status !== "success" || !quote.selectedRate) return null;
        const shipmentCost = Number(quote.selectedRate.shipmentCost ?? 0);
        const otherCost = Number(quote.selectedRate.otherCost ?? 0);
        return shipmentCost + otherCost;
      })
      .filter((value): value is number => typeof value === "number");

    if (totals.length === 0) return null;
    return totals.reduce((sum, val) => sum + val, 0);
  }, [packageQuotes]);

  if (!snapshot) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        Review your shipping details, package details, and service selections
        before creating the label.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-5 items-stretch">
        <div className="h-full md:col-span-2">
          <Fieldset title="Ship From" className="h-full">
            <ReviewRow label="Name" value={shipFrom.originAddress_name} />
            <ReviewRow
              label="Company"
              value={shipFrom.originAddress_company}
              emptyValue="—"
            />
            <ReviewRow
              label="Phone"
              value={formatPhoneNumber(shipFrom.originAddress_phone)}
              emptyValue="—"
            />
            <ReviewRow label="Email" value={""} emptyValue="—" />
            <ReviewRow
              label="Address"
              value={formatWarehouseRecord(shipFrom)}
            />
          </Fieldset>
        </div>
        <div className="h-full md:col-span-2">
          <Fieldset title="Ship to" className="h-full">
            <ReviewRow label="Name" value={snapshot.to.contactName} />
            <ReviewRow
              label="Company"
              value={snapshot.to.company}
              emptyValue="—"
            />
            <ReviewRow label="Phone" value={snapshot.to.phone} emptyValue="—" />
            <ReviewRow label="Email" value={snapshot.to.email} emptyValue="—" />
            <ReviewRow
              label="Address"
              value={formatAddressLines(snapshot.to)}
            />
          </Fieldset>
        </div>

        <div className="min-h-0 h-full w-full md:col-span-1">
          <Fieldset title="Shipment" className="h-full w-full">
            <ReviewRow label="Carrier" value={carrierLabel} />
            <ReviewRow label="Service" value={serviceLabel} />
            <ReviewRow
              label="Order #"
              value={snapshot.orderNumber}
              emptyValue={data}
            />
          </Fieldset>
        </div>
      </div>

      <Fieldset title="Packages">
        <div className="space-y-4">
          {snapshot.packages.map((pkg) => {
            const quote = packageQuotes.find((q) => q.index === pkg.index) ?? {
              index: pkg.index,
              status: "incomplete" as const,
            };
            return (
              <div
                key={`review-package-${pkg.index}`}
                className="rounded-lg border border-border/60 bg-card p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-x-3 gap-y-2">
                    <p className="font-semibold whitespace-nowrap">
                      Package {pkg.index + 1}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {pkg.insuranceProvider &&
                      pkg.insuranceProvider !== "none" ? (
                        <Badge variant="success">
                          insurance: {pkg.insuranceProvider}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">No Insurance</Badge>
                      )}
                      {pkg.saturdayDelivery ? (
                        <Badge variant="secondary">Saturday Delivery</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex w-full items-baseline justify-between gap-4 md:justify-end">
                    <div className="shrink-0 text-sm text-muted-foreground">
                      Estimated Quote:
                    </div>
                    <div className="min-w-0 text-right">
                      {quote.status === "loading" ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Fetching quote...
                        </div>
                      ) : quote.status === "error" ? (
                        <p className="text-sm text-destructive">
                          {quote.message}
                        </p>
                      ) : quote.status === "success" ? (
                        quote.selectedRate ? (
                          <div className="space-y-1">
                            <p className="text-lg font-semibold">
                              {USD_FORMATTER.format(
                                Number(quote.selectedRate.shipmentCost ?? 0) +
                                  Number(quote.selectedRate.otherCost ?? 0)
                              )}
                            </p>
                            {typeof quote.selectedRate.deliveryDays ===
                            "number" ? (
                              <p className="text-xs text-muted-foreground">
                                Est. delivery in{" "}
                                {quote.selectedRate.deliveryDays}{" "}
                                {quote.selectedRate.deliveryDays === 1
                                  ? "day"
                                  : "days"}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No rate returned for the selected service.
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Complete package details to see a quote.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Separator className="my-2" />

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <ReviewRow
                    label="Nickname"
                    value={pkg.nickname}
                    emptyValue="—"
                  />
                  <ReviewRow
                    label="Confirmation"
                    value={pkg.confirmation}
                    emptyValue="—"
                  />
                  <ReviewRow
                    label="Weight"
                    value={formatWeight(pkg)}
                    emptyValue="—"
                  />
                  <ReviewRow
                    label="Dimensions"
                    value={formatDimensions(pkg)}
                    emptyValue="—"
                  />
                </div>
              </div>
            );
          })}

          <div className="flex flex-col items-start gap-1 rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <p className="text-sm text-muted-foreground">Estimated Total:</p>
            <p className="text-lg font-semibold">
              {totalQuote !== null ? USD_FORMATTER.format(totalQuote) : "—"}
            </p>
          </div>
        </div>
      </Fieldset>
    </div>
  );
}
