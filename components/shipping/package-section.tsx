import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

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
  ShipStationRatesRequest,
} from "@/lib/shipstation/types";
import {
  areRateRequestsEqual,
  buildRatesRequest,
  savePackageToFormData,
} from "@/lib/shipping-label/utils";
import { AddressRecord } from "@/lib/supabase/addresses";
import { AddressMode } from "./types";
import { useCreateLabelFormContext } from "@/components/providers/create-label-provider";
import SwitchLabel from "../switch-label";
import { WarehouseRecord } from "@/lib/supabase/warehouses";

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
  shipFrom: WarehouseRecord;
  toAddresses: AddressRecord[];
  toMode: AddressMode;
  selectedCarrier: string | null;
  selectedService: string | null;
}

export function PackageDetailsSection({
  isPending,
  packages,
  shipFrom,
  toAddresses,
  toMode,
  selectedCarrier,
  selectedService,
}: PackageDetailsSectionProps) {
  const [packageIds, setPackageIds] = useState(["package_1"]);
  const handlePackageRemove = (index: number) => {
    if (packageIds.length <= 1) return; // Prevent removing the last package
    setPackageIds((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <input type="hidden" name="packages.count" value={packageIds.length} />
      {packageIds.map((packageId, index) => {
        return (
          <div key={packageId} className="flex flex-col gap-8 mb-4">
            <Package
              isPending={isPending}
              index={index}
              packages={packages}
              handlePackageRemove={handlePackageRemove}
              shipFrom={shipFrom}
              toAddresses={toAddresses}
              toMode={toMode}
              selectedCarrier={selectedCarrier}
              selectedService={selectedService}
              allowDelete={packageIds.length > 1}
            />

            {index !== packageIds.length - 1 ? (
              <Separator className="border-2 border-border" />
            ) : null}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => {
            setPackageIds((current) => [...current, crypto.randomUUID()]);
          }}
        >
          Add Package
        </Button>
      </div>
    </>
  );
}

type PkgFields = {
  nickname: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: "inches" | "centimeters";
  };
  weight: { value: number; unit: "pounds" | "ounces" | "grams" };
  confirmation:
    | "none"
    | "delivery"
    | "signature"
    | "adult_signature"
    | "direct_signature";
  insuranceOptions?: {
    provider: string;
    insureShipment: boolean;
    insuredValue: number;
  };
};

const positiveNumberSchema = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().min(1, "Must be at least 1."),
);

function Package({
  isPending,
  index,
  packages,
  handlePackageRemove,
  shipFrom,
  toAddresses,
  toMode,
  selectedCarrier,
  selectedService,
  allowDelete = false,
}: {
  isPending: boolean;
  index: number;
  packages: PackageRecord[];
  handlePackageRemove: (index: number) => void;
  shipFrom: WarehouseRecord;
  toAddresses: AddressRecord[];
  toMode: AddressMode;
  selectedCarrier: string | null;
  selectedService: string | null;
  allowDelete?: boolean;
}) {
  const [fields, setFields] = useState<PkgFields>();
  const [selectedInsuranceProvider, setSelectedInsuranceProvider] =
    useState<string>("none");
  const [selectedPackageId, setSelectedPackageId] =
    useState<string>("new-package");
  const { formRef } = useCreateLabelFormContext();
  const [rateState, setRateState] = useState<RateState>({ status: "idle" });

  const [rateRequest, setRateRequest] =
    useState<ShipStationRatesRequest | null>(null);
  const debouncedRateRequest = useDebounce(rateRequest, RATE_DEBOUNCE_MS);

  const formEventTimeoutRef = useRef<number | null>(null);

  type DimensionField = "length" | "width" | "height" | "weight";
  const [fieldErrors, setFieldErrors] = useState<
    Record<DimensionField, string>
  >({
    length: "",
    width: "",
    height: "",
    weight: "",
  });

  const validatePositiveNumber = useCallback((value: string) => {
    const result = positiveNumberSchema.safeParse(value);
    if (result.success) return "";
    return result.error.issues[0]?.message ?? "Enter a number of 1 or more.";
  }, []);

  const handleNumberValidation = useCallback(
    (field: DimensionField) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const message = validatePositiveNumber(event.target.value);
      event.currentTarget.setCustomValidity(message);
      setFieldErrors((current) => ({ ...current, [field]: message }));
    },
    [validatePositiveNumber],
  );

  const handlePackageChange = useCallback(
    (value: string) => {
      if (value === selectedPackageId) return;
      setSelectedPackageId(value);
      if (value === "new-package") {
        setFields(undefined);
        return;
      }
      setSelectedPackageId(value);
      const currForm = document.getElementById(
        "create-label-form",
      ) as HTMLFormElement;
      if (!currForm) return;
      const selectedPackage = packages.find((p) => p.id === value);
      if (selectedPackage) {
        setFields({
          nickname: selectedPackage.nickname,
          dimensions: {
            length: selectedPackage.length,
            width: selectedPackage.width,
            height: selectedPackage.height,
            unit: selectedPackage.dimension_unit,
          },
          weight: {
            value: selectedPackage.weight,
            unit: selectedPackage.weight_unit,
          },
          confirmation: "delivery",
        });
      }
    },
    [selectedPackageId, packages],
  );

  useEffect(() => {
    setFieldErrors({ length: "", width: "", height: "", weight: "" });
  }, [selectedPackageId]);

  const updateRateRequest = useCallback(() => {
    const form =
      formRef.current ??
      (document.getElementById("create-label-form") as HTMLFormElement | null);
    if (!form) return;
    const formData = new FormData(form);

    if (selectedPackageId !== "new-package") {
      const currPackage = packages.find((p) => p.id === selectedPackageId);
      if (!currPackage) throw new Error("Selected package not found");

      //set package details to form data for rate request building
      savePackageToFormData(formData, index, currPackage);
    }
    const nextRequest = buildRatesRequest(index, formData, {
      shipFrom,
      toAddresses,
      toMode,
    });
    setRateRequest((current) =>
      areRateRequestsEqual(current, nextRequest) ? current : nextRequest,
    );
  }, [
    selectedPackageId,
    packages,
    formRef,
    index,
    shipFrom,
    toAddresses,
    toMode,
  ]);

  useEffect(() => {
    let attachedForm: HTMLFormElement | null = null;

    const handleFormChange = () => {
      if (formEventTimeoutRef.current !== null) {
        window.clearTimeout(formEventTimeoutRef.current);
      }
      formEventTimeoutRef.current = window.setTimeout(() => {
        formEventTimeoutRef.current = null;
        updateRateRequest();
      }, 0);
    };

    const attach = () => {
      const form =
        formRef.current ??
        (document.getElementById(
          "create-label-form",
        ) as HTMLFormElement | null);
      if (!form) return false;
      if (attachedForm === form) return true;

      attachedForm = form;
      form.addEventListener("input", handleFormChange);
      form.addEventListener("change", handleFormChange);
      return true;
    };

    // `ref.current` changes don't trigger effects; poll briefly until the form mounts.
    if (!attach()) {
      const interval = window.setInterval(() => {
        if (attach()) {
          window.clearInterval(interval);
        }
      }, 50);

      return () => {
        window.clearInterval(interval);
        if (attachedForm) {
          attachedForm.removeEventListener("input", handleFormChange);
          attachedForm.removeEventListener("change", handleFormChange);
        }
        if (formEventTimeoutRef.current !== null) {
          window.clearTimeout(formEventTimeoutRef.current);
          formEventTimeoutRef.current = null;
        }
      };
    }

    return () => {
      if (attachedForm) {
        attachedForm.removeEventListener("input", handleFormChange);
        attachedForm.removeEventListener("change", handleFormChange);
      }
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
        current.status === "idle" ? current : { status: "idle" },
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
        return <p className="text-lg text-muted-foreground">$0.00</p>;
    }
  }, [rateState, selectedRate]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-center gap-4">
        <span className="text-md font-medium col-span-2">
          Package {index + 1}
        </span>
        <div className="gap-2 col-span-2 md:col-span-1">
          <Label>Select a Package</Label>
          <Select
            value={selectedPackageId}
            onValueChange={handlePackageChange}
            disabled={isPending}
          >
            <input
              type="hidden"
              name={`package-${index}.id`}
              value={selectedPackageId}
            />
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
      <div className="grid gap-2 grid-cols-3 md:grid-cols-4">
        <div className="gap-2 col-span-full">
          <Label htmlFor={`package-${index}.nickname`}>Nickname</Label>
          <Input
            id={`package-${index}.nickname`}
            name={`package-${index}.nickname`}
            placeholder="New Package"
            disabled={isPending}
            defaultValue={fields?.nickname}
          />
        </div>
        <div className="gap-2">
          <Label htmlFor="dimensions-length">
            Length <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dimensions-length"
            name={`package-${index}.dimensions.length`}
            type="number"
            min="1"
            placeholder="10"
            disabled={isPending}
            defaultValue={fields?.dimensions?.length}
            required
            aria-invalid={!!fieldErrors.length}
            onChange={handleNumberValidation("length")}
          />
          {fieldErrors.length ? (
            <p className="text-xs text-destructive">{fieldErrors.length}</p>
          ) : null}
        </div>
        <div className="gap-2">
          <Label htmlFor="dimensions-width">
            Width <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dimensions-width"
            name={`package-${index}.dimensions.width`}
            type="number"
            min="1"
            placeholder="6"
            disabled={isPending}
            defaultValue={fields?.dimensions?.width}
            required
            aria-invalid={!!fieldErrors.width}
            onChange={handleNumberValidation("width")}
          />
          {fieldErrors.width ? (
            <p className="text-xs text-destructive">{fieldErrors.width}</p>
          ) : null}
        </div>
        <div className="gap-2">
          <Label htmlFor="dimensions-height">
            Height <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dimensions-height"
            name={`package-${index}.dimensions.height`}
            type="number"
            min="1"
            placeholder="4"
            disabled={isPending}
            defaultValue={fields?.dimensions?.height}
            required
            aria-invalid={!!fieldErrors.height}
            onChange={handleNumberValidation("height")}
          />
          {fieldErrors.height ? (
            <p className="text-xs text-destructive">{fieldErrors.height}</p>
          ) : null}
        </div>
        <div className="gap-2 col-span-3 md:col-span-1">
          <Label htmlFor="dimensions-unit">
            Dimension Unit <span className="text-red-500">*</span>
          </Label>
          <Select
            name={`package-${index}.dimensions.unit`}
            disabled={isPending}
            defaultValue={fields?.dimensions?.unit || "inches"}
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
        <div className="gap-2 col-span-1">
          <Label htmlFor="weight-value">
            Weight <span className="text-red-500">*</span>
          </Label>
          <Input
            id="weight-value"
            name={`package-${index}.weight.value`}
            type="number"
            min="1"
            placeholder="16"
            required
            disabled={isPending}
            defaultValue={fields?.weight?.value}
            aria-invalid={!!fieldErrors.weight}
            onChange={handleNumberValidation("weight")}
          />
          {fieldErrors.weight ? (
            <p className="text-xs text-destructive">{fieldErrors.weight}</p>
          ) : null}
        </div>
        <div className="gap-2 col-span-2 md:col-span-1">
          <Label htmlFor="weight-unit">
            Weight Unit <span className="text-red-500">*</span>
          </Label>
          <Select
            name={`package-${index}.weight.unit`}
            disabled={isPending}
            defaultValue={fields?.weight?.unit || "pounds"}
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
        <div className="py-2 col-span-full">
          <Separator />
        </div>
        <div className="gap-2 col-span-2 md:col-span-1 md:col-start-1">
          <Label htmlFor={`package-${index}.insuranceOptions.provider`}>
            Insurance
          </Label>
          <Select
            name={`package-${index}.insuranceOptions.provider`}
            disabled={isPending}
            onValueChange={setSelectedInsuranceProvider}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select confirmation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="carrier">Carrier</SelectItem>
              {/* <SelectItem value="shipsurance">Shipsurance</SelectItem>
              <SelectItem value="provider">Provider</SelectItem>
              <SelectItem value="xcover">Xcover</SelectItem>
              <SelectItem value="parcelguard">Parcelguard</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
        {selectedInsuranceProvider !== "none" && (
          <div className="gap-2 col-span-1 md:col-span-1">
            <Label htmlFor={`package-${index}.insuranceOptions.insuredValue`}>
              Amount
            </Label>
            <Input
              id={`package-${index}.insuranceOptions.insuredValue`}
              name={`package-${index}.insuranceOptions.insuredValue`}
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              required
              disabled={isPending}
            />
          </div>
        )}
        <div
          className={`gap-2 col-span-3 md:col-span-1 ${
            selectedInsuranceProvider === "none" ? "md:col-start-3" : ""
          }`}
        >
          <Label htmlFor={`package-${index}.confirmation`}>Confirmation</Label>
          <Select
            name={`package-${index}.confirmation`}
            disabled={isPending}
            defaultValue={fields?.confirmation || "delivery"}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select confirmation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="signature">Signature</SelectItem>
              <SelectItem value="adult_signature">Adult Signature</SelectItem>
              <SelectItem value="direct_signature">Direct Signature</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1 col-span-full md:col-span-1">
          <SwitchLabel
            name={`package-${index}.advancedOptions.saturday_delivery`}
            title="Saturday Delivery?"
          />
          <SwitchLabel
            name={`package-${index}.save`}
            title="Save this package?"
          />
        </div>
        <div className="flex items-center justify-between md:gap-2 col-span-3 md:col-span-1">
          <Label className="text-xl font-semibold">Price:</Label>
          {priceContent}
        </div>
        <div className="col-span-full md:col-span-1 md:col-start-4">
          {allowDelete && (
            <Button
              type="button"
              onClick={() => handlePackageRemove(index)}
              variant="destructive"
              className="w-full"
              disabled={isPending}
            >
              <Trash /> Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
