import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fieldset } from "../ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PackageRecord } from "@/lib/supabase/packages";
import { Separator } from "../ui/separator";
import { Loader2, Trash } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  ShipStationRate,
  ShipstationRatesRequest,
} from "@/lib/shipstation/client";
import {
  areRateRequestsEqual,
  buildRatesRequest,
} from "@/lib/shipping-label/utils";
import { AddressRecord } from "@/lib/supabase/addresses";
import { AddressMode } from "./types";
import { useCreateLabelFormContext } from "./create-label-form";

const RATE_DEBOUNCE_MS = 1500;
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type RateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; rates: ShipStationRate[] };

interface PackageDetailsSectionProps {
  isPending: boolean;
  packages: PackageRecord[];
  packageIds: string[];
  setPackageIds: Dispatch<SetStateAction<string[]>>;
  fromAddresses: AddressRecord[];
  toAddresses: AddressRecord[];
  fromMode: AddressMode;
  toMode: AddressMode;
  selectedCarrier: string | null;
  selectedService: string | null;
}

export function PackageDetailsSection({
  isPending,
  packages,
  packageIds,
  setPackageIds,
  fromAddresses,
  toAddresses,
  fromMode,
  toMode,
  selectedCarrier,
  selectedService,
}: PackageDetailsSectionProps) {
  const handlePackageRemove = (index: number) => {
    if (packageIds.length <= 1) return; // Prevent removing the last package
    setPackageIds((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Fieldset title="Package Details">
      {packageIds.map((packageId, index) => {
        return (
          <div key={packageId} className="flex flex-col gap-8 mb-4">
            <Package
              isPending={isPending}
              index={index}
              packages={packages}
              handlePackageRemove={handlePackageRemove}
              fromAddresses={fromAddresses}
              toAddresses={toAddresses}
              fromMode={fromMode}
              toMode={toMode}
              selectedCarrier={selectedCarrier}
              selectedService={selectedService}
            />

            {index !== packageIds.length - 1 ? <Separator /> : null}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => {
            setPackageIds((current) => [
              ...current,
              `package_${current.length + 1}`,
            ]);
          }}
        >
          Add Package
        </Button>
      </div>
    </Fieldset>
  );
}

function Package({
  isPending,
  index,
  packages,
  handlePackageRemove,
  fromAddresses,
  toAddresses,
  fromMode,
  toMode,
  selectedCarrier,
  selectedService,
}: {
  isPending: boolean;
  index: number;
  packages: PackageRecord[];
  handlePackageRemove: (index: number) => void;
  fromAddresses: AddressRecord[];
  toAddresses: AddressRecord[];
  fromMode: AddressMode;
  toMode: AddressMode;
  selectedCarrier: string | null;
  selectedService: string | null;
}) {
  const [selectedPackageId, setSelectedPackageId] =
    useState<string>("new-package");
  const { formRef } = useCreateLabelFormContext();
  const [rateState, setRateState] = useState<RateState>({ status: "idle" });

  const [rateRequest, setRateRequest] =
    useState<ShipstationRatesRequest | null>(null);
  const debouncedRateRequest = useDebounce(rateRequest, RATE_DEBOUNCE_MS);

  const formEventTimeoutRef = useRef<number | null>(null);

  const updateRateRequest = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    if (selectedPackageId !== "new-package") {
      const prefix = `package-${index}.dimensions`;
      formData.set(
        `${prefix}.length`,
        packages.find((p) => p.id === selectedPackageId)?.length?.toString() ||
          ""
      );
      formData.set(
        `${prefix}.width`,
        packages.find((p) => p.id === selectedPackageId)?.width?.toString() ||
          ""
      );
      formData.set(
        `${prefix}.height`,
        packages.find((p) => p.id === selectedPackageId)?.height?.toString() ||
          ""
      );
      formData.set(
        `${prefix}.unit`,
        packages.find((p) => p.id === selectedPackageId)?.dimension_unit || ""
      );
      const weightPrefix = `package-${index}.weight`;
      formData.set(
        `${weightPrefix}.value`,
        packages.find((p) => p.id === selectedPackageId)?.weight?.toString() ||
          ""
      );
      formData.set(
        `${weightPrefix}.unit`,
        packages.find((p) => p.id === selectedPackageId)?.weight_unit || ""
      );
    }
    const nextRequest = buildRatesRequest(index, formData, {
      fromAddresses,
      toAddresses,
      fromMode,
      toMode,
    });
    setRateRequest((current) =>
      areRateRequestsEqual(current, nextRequest) ? current : nextRequest
    );
  }, [
    selectedPackageId,
    packages,
    formRef,
    index,
    fromAddresses,
    toAddresses,
    fromMode,
    toMode,
  ]);

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
  }, [formRef, updateRateRequest]);

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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-md font-medium">Package {index + 1}</span>
          <div className="grid gap-4">
            <Select
              name={`package-${index}.type`}
              value={selectedPackageId}
              onValueChange={setSelectedPackageId}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => {
                  return (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {`${pkg.nickname} - ${pkg.length} x ${pkg.width} x ${pkg.height} ${pkg.dimension_unit}, ${pkg.weight} ${pkg.weight_unit}`}
                    </SelectItem>
                  );
                })}
                <SelectItem value="new-package">New Package</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-md font-medium">Price:</span>
            {priceContent}
          </div>
          <Button
            type="button"
            onClick={() => handlePackageRemove(index)}
            size="icon"
            variant="destructive"
            className="cursor-pointer"
          >
            <Trash />
          </Button>
        </div>
      </div>
      {selectedPackageId === "new-package" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="dimensions-length">Length</Label>
            <Input
              id="dimensions-length"
              name={`package-${index}.dimensions.length`}
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
              name={`package-${index}.dimensions.width`}
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
              name={`package-${index}.dimensions.height`}
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
              name={`package-${index}.dimensions.unit`}
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
              name={`package-${index}.weight.value`}
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
              name={`package-${index}.weight.unit`}
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
              name={`package-${index}.confirmation`}
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
        </div>
      ) : null}
    </div>
  );
}
