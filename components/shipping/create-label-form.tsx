"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { AlertCircleIcon, Loader2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AddressRecord } from "@/lib/supabase/addresses";
import type {
  ShipStationCarrier,
  ShipStationRate,
  ShipstationRatesRequest,
  ShipStationService,
} from "@/lib/shipstation/client";
import {
  createShippingLabelAction,
  type CreateShippingLabelState,
} from "@/lib/actions/shipping";
import { printLabels } from "@/lib/utils";
import { toast } from "sonner";
import { AddressMode } from "./types";
import { Fieldset } from "../ui/fieldset";
import { AddressSection } from "./address-section";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const getServiceCode = (service: ShipStationService) => service.code ?? "";

const RATE_DEBOUNCE_MS = 1500;

type RateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; rates: ShipStationRate[] };

type RateDimensions = ShipstationRatesRequest["dimensions"];

type RateAddress = {
  city: string;
  state: string;
  postalCode: string;
  country: string;
  residential?: boolean;
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const VALID_WEIGHT_UNITS = new Set(["ounces", "pounds", "grams"]);
const VALID_DIMENSION_UNITS = new Set(["inches", "centimeters"]);

function parseCheckboxValue(value: FormDataEntryValue | null) {
  if (!value) return false;
  return value === "true" || value === "on" || value === "1";
}

function resolveAddressFromForm(
  formData: FormData,
  prefix: "from" | "to",
  savedAddresses: AddressRecord[],
  fallbackMode: AddressMode
): RateAddress | null {
  const modeValue =
    (formData.get(`${prefix}.mode`) as AddressMode | null) ?? fallbackMode;

  if (modeValue === "saved") {
    const addressId = formData.get(`${prefix}.addressId`);
    if (!addressId) return null;

    const address = savedAddresses.find((item) => item.id === addressId);
    if (!address) return null;

    const { city, state, postal_code, country, is_residential } = address;

    if (!city || !state || !postal_code || !country) {
      return null;
    }

    return {
      city: city.trim(),
      state: state.trim(),
      postalCode: postal_code.trim(),
      country: country.trim(),
      residential: is_residential,
    };
  }

  const city = (formData.get(`${prefix}.city`) as string | null)?.trim() ?? "";
  const state =
    (formData.get(`${prefix}.state`) as string | null)?.trim() ?? "";
  const postalCode =
    (formData.get(`${prefix}.postal_code`) as string | null)?.trim() ?? "";
  const country =
    (formData.get(`${prefix}.country`) as string | null)?.trim() ?? "";

  if (!city || !state || !postalCode || !country) {
    return null;
  }

  return {
    city,
    state,
    postalCode,
    country,
    residential: parseCheckboxValue(formData.get(`${prefix}.is_residential`)),
  };
}

function buildRatesRequest(
  formData: FormData,
  params: {
    fromAddresses: AddressRecord[];
    toAddresses: AddressRecord[];
    fromMode: AddressMode;
    toMode: AddressMode;
  }
): ShipstationRatesRequest | null {
  const carrierCode =
    (formData.get("carrierCode") as string | null)?.trim() ?? "";
  if (!carrierCode) return null;

  const serviceCode =
    (formData.get("serviceCode") as string | null)?.trim() ?? "";
  if (!serviceCode) return null;

  const fromAddress = resolveAddressFromForm(
    formData,
    "from",
    params.fromAddresses,
    params.fromMode
  );
  const toAddress = resolveAddressFromForm(
    formData,
    "to",
    params.toAddresses,
    params.toMode
  );

  if (!fromAddress || !toAddress) return null;

  const weightValueRaw =
    (formData.get("weight.value") as string | null)?.trim() ?? "";
  const weightValue = Number.parseFloat(weightValueRaw);
  const weightUnit =
    (formData.get("weight.unit") as string | null)?.trim() ?? "";

  if (!Number.isFinite(weightValue) || weightValue <= 0) return null;
  if (!VALID_WEIGHT_UNITS.has(weightUnit)) return null;

  const lengthValue = Number.parseFloat(
    ((formData.get("dimensions.length") as string | null) ?? "").trim()
  );
  const widthValue = Number.parseFloat(
    ((formData.get("dimensions.width") as string | null) ?? "").trim()
  );
  const heightValue = Number.parseFloat(
    ((formData.get("dimensions.height") as string | null) ?? "").trim()
  );
  const dimensionUnit =
    (formData.get("dimensions.unit") as string | null)?.trim() ?? "";

  const hasDimensions =
    Number.isFinite(lengthValue) &&
    Number.isFinite(widthValue) &&
    Number.isFinite(heightValue) &&
    lengthValue > 0 &&
    widthValue > 0 &&
    heightValue > 0 &&
    VALID_DIMENSION_UNITS.has(dimensionUnit);

  const dimensions: RateDimensions = hasDimensions
    ? {
        length: lengthValue,
        width: widthValue,
        height: heightValue,
        units: dimensionUnit as NonNullable<RateDimensions>["units"],
      }
    : undefined;

  return {
    carrierCode,
    serviceCode,
    packageCode: "package",
    fromPostalCode: fromAddress.postalCode,
    fromCity: fromAddress.city,
    fromState: fromAddress.state,
    toPostalCode: toAddress.postalCode,
    toCountry: toAddress.country.toUpperCase(),
    toCity: toAddress.city,
    toState: toAddress.state,
    weight: {
      value: weightValue,
      units: weightUnit as ShipstationRatesRequest["weight"]["units"],
    },
    dimensions,
    residential: toAddress.residential ?? undefined,
  };
}

function compareDimensions(a: RateDimensions, b: RateDimensions): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.length === b.length &&
    a.width === b.width &&
    a.height === b.height &&
    a.units === b.units
  );
}

function areRateRequestsEqual(
  previous: ShipstationRatesRequest | null,
  next: ShipstationRatesRequest | null
): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;

  return (
    previous.carrierCode === next.carrierCode &&
    (previous.serviceCode ?? "") === (next.serviceCode ?? "") &&
    (previous.packageCode ?? "") === (next.packageCode ?? "") &&
    previous.fromPostalCode === next.fromPostalCode &&
    (previous.fromCity ?? "") === (next.fromCity ?? "") &&
    (previous.fromState ?? "") === (next.fromState ?? "") &&
    (previous.fromWarehouseId ?? "") === (next.fromWarehouseId ?? "") &&
    (previous.toState ?? "") === (next.toState ?? "") &&
    previous.toCountry === next.toCountry &&
    previous.toPostalCode === next.toPostalCode &&
    (previous.toCity ?? "") === (next.toCity ?? "") &&
    previous.weight.value === next.weight.value &&
    previous.weight.units === next.weight.units &&
    compareDimensions(previous.dimensions, next.dimensions) &&
    previous.residential === next.residential &&
    (previous.confirmation ?? "") === (next.confirmation ?? "")
  );
}

export function CreateLabelForm({
  fromAddresses,
  toAddresses,
  carriers,
  services,
}: {
  fromAddresses: AddressRecord[];
  toAddresses: AddressRecord[];
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
}) {
  const [formState, formAction, actionPending] = useActionState<
    CreateShippingLabelState,
    FormData
  >(createShippingLabelAction, { status: "idle" });
  const [transitionPending, startTransition] = useTransition();
  const isPending = transitionPending || actionPending;
  const [fromMode, setFromMode] = useState<AddressMode>(
    fromAddresses.length > 0 ? "saved" : "new"
  );
  const [toMode, setToMode] = useState<AddressMode>(
    toAddresses.length > 0 ? "saved" : "new"
  );
  const [selectedCarrier, setSelectedCarrier] = useState<string>(
    carriers[0]?.code ?? ""
  );
  const [selectedService, setSelectedService] = useState<string>("fedex_2day");
  const formRef = useRef<HTMLFormElement>(null);
  const [rateRequest, setRateRequest] =
    useState<ShipstationRatesRequest | null>(null);
  const [rateState, setRateState] = useState<RateState>({ status: "idle" });
  const debouncedRateRequest = useDebounce(rateRequest, RATE_DEBOUNCE_MS);
  const updateRateRequest = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const nextRequest = buildRatesRequest(formData, {
      fromAddresses,
      toAddresses,
      fromMode,
      toMode,
    });
    setRateRequest((current) =>
      areRateRequestsEqual(current, nextRequest) ? current : nextRequest
    );
  }, [fromAddresses, toAddresses, fromMode, toMode]);

  useEffect(() => {
    if (formState.status === "success") {
      setFromMode((current) =>
        current === "new" && fromAddresses.length > 0 ? "saved" : current
      );
    }
  }, [formState.status, fromAddresses.length]);

  const formEventTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleFormChange = () => {
      if (formEventTimeoutRef.current !== null) {
        window.clearTimeout(formEventTimeoutRef.current);
      }
      formEventTimeoutRef.current = window.setTimeout(() => {
        formEventTimeoutRef.current = null;
        updateRateRequest();
      }, 0);
    };

    form.addEventListener("input", handleFormChange);
    form.addEventListener("change", handleFormChange);

    return () => {
      form.removeEventListener("input", handleFormChange);
      form.removeEventListener("change", handleFormChange);
      if (formEventTimeoutRef.current !== null) {
        window.clearTimeout(formEventTimeoutRef.current);
        formEventTimeoutRef.current = null;
      }
    };
  }, [updateRateRequest]);

  useEffect(() => {
    updateRateRequest();
  }, [updateRateRequest]);

  useEffect(() => {
    if (!debouncedRateRequest) {
      setRateState((current) =>
        current.status === "idle" ? current : { status: "idle" }
      );
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setRateState({ status: "loading" });

    const fetchRates = async () => {
      try {
        const response = await fetch("/api/shipstation/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(debouncedRateRequest),
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = "Unable to fetch rates.";
          try {
            const detail = (await response.json()) as { message?: string };
            if (detail?.message) {
              message = detail.message;
            }
          } catch {
            // Ignore parse errors and keep default message.
          }
          if (!cancelled) {
            setRateState({ status: "error", message });
          }
          return;
        }

        const data = (await response.json()) as { rates?: ShipStationRate[] };
        if (!cancelled) {
          setRateState({
            status: "success",
            rates: Array.isArray(data.rates) ? data.rates : [],
          });
        }
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Unable to fetch rates.";
        setRateState({ status: "error", message });
      }
    };

    void fetchRates();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedRateRequest]);

  const onSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  const selectedRate = useMemo(() => {
    if (rateState.status !== "success") {
      return null;
    }

    if (!selectedCarrier || !selectedService) {
      return null;
    }
    return (
      rateState.rates.find((rate) => rate.serviceCode === selectedService) ??
      null
    );
  }, [rateState, selectedCarrier, selectedService]);

  const priceContent = useMemo(() => {
    switch (rateState.status) {
      case "loading":
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching rates…
          </div>
        );
      case "error":
        return <p className="text-sm text-destructive">{rateState.message}</p>;
      case "success": {
        if (selectedRate) {
          const shipmentCost = Number(selectedRate.shipmentCost ?? 0);
          const otherCost = Number(selectedRate.otherCost ?? 0);
          const totalCost = shipmentCost + otherCost;
          const deliveryDays =
            typeof selectedRate.deliveryDays === "number"
              ? selectedRate.deliveryDays
              : null;

          return (
            <div className="space-y-1">
              <p className="text-lg font-semibold">
                {USD_FORMATTER.format(totalCost)}
              </p>
              {deliveryDays !== null && deliveryDays >= 0 ? (
                <p className="text-xs text-muted-foreground">
                  Est. delivery in {deliveryDays}{" "}
                  {deliveryDays === 1 ? "day" : "days"}
                </p>
              ) : null}
            </div>
          );
        }
        if (rateState.rates.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No rates returned for the provided details.
            </p>
          );
        }

        return (
          <p className="text-sm text-muted-foreground">
            Selected service has no available rate.
          </p>
        );
      }
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Enter parcel details to preview a rate.
          </p>
        );
    }
  }, [rateState, selectedRate]);

  return (
    <form ref={formRef} action={onSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AddressSection
          prefix="from"
          title="Ship from"
          addresses={fromAddresses}
          mode={fromMode}
          setMode={setFromMode}
          pending={isPending}
        />
        <AddressSection
          prefix="to"
          title="Ship to"
          addresses={toAddresses}
          mode={toMode}
          setMode={setToMode}
          pending={isPending}
        />
      </div>

      <Fieldset title="Shipment Details">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="carrier">Carrier</Label>
            <Select
              name="carrierCode"
              disabled={isPending}
              value={selectedCarrier}
              onValueChange={(value) => setSelectedCarrier(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((carrier) => (
                  <SelectItem key={carrier.code} value={carrier.code}>
                    {carrier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="serviceCode">Service</Label>
            <Select
              name="serviceCode"
              disabled={isPending}
              value={selectedService}
              onValueChange={(value) => setSelectedService(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services
                  .filter((service) => getServiceCode(service).length > 0)
                  .map((service) => {
                    const value = getServiceCode(service);
                    const key = `${service.carrierCode}-${value}`;
                    return (
                      <SelectItem key={key} value={value}>
                        {service.name}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="serviceCode">Order Number</Label>
            <Input
              id="orderNumber"
              name="orderNumber"
              placeholder="AZ-12345"
              disabled={isPending}
            />
          </div>
        </div>
      </Fieldset>

      <Fieldset title="Package Details">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="dimensions-length">Length</Label>
            <Input
              id="dimensions-length"
              name="dimensions.length"
              type="number"
              step="0.1"
              min="0"
              placeholder="10"
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dimensions-width">Width</Label>
            <Input
              id="dimensions-width"
              name="dimensions.width"
              type="number"
              step="0.1"
              min="0"
              placeholder="6"
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dimensions-height">Height</Label>
            <Input
              id="dimensions-height"
              name="dimensions.height"
              type="number"
              step="0.1"
              min="0"
              placeholder="4"
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dimensions-unit">Dimension unit</Label>
            <Select
              name="dimensions.unit"
              disabled={isPending}
              defaultValue="inches"
            >
              <SelectTrigger className="w-full">
                <SelectValue defaultValue="inches" placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inches">Inches</SelectItem>
                <SelectItem value="centimeters">Centimeters</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weight-value">Weight</Label>
            <Input
              id="weight-value"
              name="weight.value"
              type="number"
              step="0.1"
              min="0"
              placeholder="16"
              required
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weight-unit">Weight unit</Label>
            <Select
              name="weight.unit"
              disabled={isPending}
              defaultValue="pounds"
            >
              <SelectTrigger className="w-full">
                <SelectValue defaultValue="pounds" placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pounds">Pounds</SelectItem>
                <SelectItem value="ounces">Ounces</SelectItem>
                <SelectItem value="grams">Grams</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmation">Confirmation</Label>
            <Select
              name="confirmation"
              disabled={isPending}
              defaultValue="delivery"
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  defaultValue="delivery"
                  placeholder="Select confirmation"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="signature">Signature</SelectItem>
                <SelectItem value="adult_signature">Adult Signature</SelectItem>
                <SelectItem value="direct_signature">
                  Direct Signature
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Price</Label>
            {priceContent}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="test-label"
            name="testLabel"
            value="true"
            disabled={isPending}
          />
          <Label htmlFor="test-label" className="text-sm text-muted-foreground">
            Generate as a test label
          </Label>
        </div>
      </Fieldset>

      <Button type="submit" disabled={isPending || carriers.length === 0}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating label…
          </>
        ) : (
          <>
            <Truck className="mr-2 h-4 w-4" />
            Create label
          </>
        )}
      </Button>

      {formState.status === "error" ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Unable to create label</AlertTitle>
          <AlertDescription>
            <p>
              {formState.message ??
                "Could not create the label. Please try again."}
            </p>
            <ul className="list-inside list-disc text-sm">
              <li>Double check your address</li>
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {formState.status === "success" && formState.label ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700">
          <div className="flex flex-col">
            <p className="font-semibold">Label created successfully.</p>
            {formState.label.tracking_number ? (
              <p>Tracking number: {formState.label.tracking_number}</p>
            ) : null}
          </div>

          {formState.label.label_data_base64 ? (
            <Button
              variant="ghost"
              className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-500/60 hover:text-emerald-800"
              onClick={async () => {
                if (formState.label?.label_data_base64)
                  await printLabels([formState.label.label_data_base64]);
                else toast.error("No label data available to print.");
              }}
            >
              Print
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
