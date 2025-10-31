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
import {
  areRateRequestsEqual,
  buildRatesRequest,
} from "@/lib/shipping-label/utils";
import { PackageRecord } from "@/lib/supabase/packages";
import { PackageDetailsSection } from "./package-section";

const RATE_DEBOUNCE_MS = 1500;

type RateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; rates: ShipStationRate[] };

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

interface CreateLabelFormProps {
  fromAddresses: AddressRecord[];
  toAddresses: AddressRecord[];
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  packages: PackageRecord[];
}

export function CreateLabelForm({
  fromAddresses,
  toAddresses,
  carriers,
  services,
  packages,
}: CreateLabelFormProps) {
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

      <ShipmentDetailsSection
        isPending={isPending}
        selectedCarrier={selectedCarrier}
        selectedService={selectedService}
        carriers={carriers}
        services={services}
        setSelectedCarrier={setSelectedCarrier}
        setSelectedService={setSelectedService}
      />

      <PackageDetailsSection
        isPending={isPending}
        priceContent={priceContent}
        packages={packages}
      />

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

      <FormResponseMessage formState={formState} />
    </form>
  );
}

function ShipmentDetailsSection({
  isPending,
  selectedCarrier,
  selectedService,
  carriers,
  services,
  setSelectedCarrier,
  setSelectedService,
}: {
  isPending: boolean;
  selectedCarrier: string;
  selectedService: string;
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  setSelectedCarrier: (code: string) => void;
  setSelectedService: (code: string) => void;
}) {
  return (
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
                .filter((service) => service.code.length > 0)
                .map((service) => {
                  const value = service.code;
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
  );
}

function FormResponseMessage({
  formState,
}: {
  formState: CreateShippingLabelState;
}) {
  return formState.status === "success" && formState.label ? (
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
  ) : null;
}
