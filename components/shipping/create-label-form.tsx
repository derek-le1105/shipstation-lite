"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Loader2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AddressRecord } from "@/lib/supabase/addresses";
import type {
  ShipStationCarrier,
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

const getServiceCode = (service: ShipStationService) => service.code ?? "";

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
  const [selectedService, setSelectedService] = useState<string>(() => {
    const code = services.map(getServiceCode).find((value) => value.length > 0);
    return code ?? "";
  });

  useEffect(() => {
    if (formState.status === "success") {
      setFromMode((current) =>
        current === "new" && fromAddresses.length > 0 ? "saved" : current
      );
    }
  }, [formState.status, fromAddresses.length]);

  const onSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  const carrierOptions = useMemo(() => {
    if (carriers.length === 0)
      return <option value="">No carriers configured</option>;
    return carriers.map((carrier) => (
      <option key={carrier.code} value={carrier.code}>
        {carrier.name}
      </option>
    ));
  }, [carriers]);

  const hasServiceChoices = useMemo(
    () => services.some((service) => getServiceCode(service).length > 0),
    [services]
  );

  const serviceOptions = useMemo(() => {
    if (!hasServiceChoices) {
      return <option value="">No services available</option>;
    }

    return services
      .filter((service) => getServiceCode(service).length > 0)
      .map((service) => {
        const value = getServiceCode(service);
        const key = `${service.carrierCode}-${value}`;
        return (
          <option key={key} value={value}>
            {service.name}
          </option>
        );
      });
  }, [hasServiceChoices, services]);

  return (
    <form action={onSubmit} className="space-y-6">
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

      <Fieldset title="Parcel details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="carrier">Carrier</Label>
            <select
              id="carrier"
              name="carrierCode"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedCarrier}
              onChange={(event) => setSelectedCarrier(event.target.value)}
              required
              disabled={carriers.length === 0 || isPending}
            >
              {carrierOptions}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service">Service</Label>
            <select
              id="service"
              name="serviceCode"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedService}
              onChange={(event) => setSelectedService(event.target.value)}
              required
              disabled={isPending || !hasServiceChoices}
            >
              {serviceOptions}
            </select>
          </div>
        </div>
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
            <select
              id="dimensions-unit"
              name="dimensions.unit"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              defaultValue="inches"
              disabled={isPending}
            >
              <option value="inches">Inches</option>
              <option value="centimeters">Centimeters</option>
            </select>
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
            <select
              id="weight-unit"
              name="weight.unit"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              defaultValue="ounces"
              disabled={isPending}
            >
              <option value="ounces">Ounces</option>
              <option value="pounds">Pounds</option>
              <option value="grams">Grams</option>
              <option value="kilograms">Kilograms</option>
            </select>
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
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {formState.message ?? "Could not create the label. Please try again."}
        </div>
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
