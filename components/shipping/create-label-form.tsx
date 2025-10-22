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
  ShipStationPackage,
  ShipStationService,
} from "@/lib/shipstation/client";
import {
  createShippingLabelAction,
  type CreateShippingLabelState,
} from "@/lib/actions/shipping";

type AddressMode = "saved" | "new";

type CarrierMetadataResponse = {
  services: ShipStationService[];
  packages: ShipStationPackage[];
};

const getServiceCode = (service: ShipStationService) => service.code ?? "";

async function fetchCarrierMetadata(
  carrierCode: string
): Promise<CarrierMetadataResponse> {
  const params = new URLSearchParams({ carrierCode });
  const response = await fetch(
    `/api/shipstation/metadata?${params.toString()}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to load carrier metadata.");
  }

  return (await response.json()) as CarrierMetadataResponse;
}

function Fieldset({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-border p-4">
      <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </legend>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="grid gap-4">{children}</div>
    </fieldset>
  );
}

function AddressSection({
  prefix,
  title,
  addresses,
  mode,
  setMode,
  pending,
}: {
  prefix: "from" | "to";
  title: string;
  addresses: AddressRecord[];
  mode: AddressMode;
  setMode: (mode: AddressMode) => void;
  pending: boolean;
}) {
  return (
    <Fieldset
      title={title}
      description={
        mode === "saved"
          ? "Use one of your saved addresses."
          : "Enter a new address. You can optionally save it for later."
      }
    >
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${prefix}.mode`}
            value="saved"
            checked={mode === "saved"}
            onChange={() => setMode("saved")}
            disabled={addresses.length === 0 || pending}
            className="h-4 w-4"
          />
          Use saved address
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${prefix}.mode`}
            value="new"
            checked={mode === "new"}
            onChange={() => setMode("new")}
            disabled={pending}
            className="h-4 w-4"
          />
          Enter new address
        </label>
      </div>

      {mode === "saved" ? (
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}-addressId`}>Select address</Label>
          <select
            id={`${prefix}-addressId`}
            name={`${prefix}.addressId`}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={addresses.length === 0 || pending}
            required={addresses.length > 0}
            defaultValue={addresses[0]?.id ?? ""}
          >
            {addresses.length === 0 ? (
              <option value="">No saved addresses available</option>
            ) : (
              addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label ??
                    address.contact_name ??
                    address.address_line1 ??
                    ""}
                </option>
              ))
            )}
          </select>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-label`}>Nickname</Label>
            <Input
              id={`${prefix}-label`}
              name={`${prefix}.label`}
              placeholder="Warehouse A"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-contact_name`}>Contact name</Label>
            <Input
              id={`${prefix}-contact_name`}
              name={`${prefix}.contact_name`}
              placeholder="Jane Smith"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-company`}>Company</Label>
            <Input
              id={`${prefix}-company`}
              name={`${prefix}.company`}
              placeholder="Acme Corp"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-phone`}>Phone</Label>
            <Input
              id={`${prefix}-phone`}
              name={`${prefix}.phone`}
              placeholder="555-123-4567"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-email`}>Email</Label>
            <Input
              id={`${prefix}-email`}
              name={`${prefix}.email`}
              type="email"
              placeholder="warehouse@example.com"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor={`${prefix}-address_line1`}>Address line 1</Label>
            <Input
              id={`${prefix}-address_line1`}
              name={`${prefix}.address_line1`}
              placeholder="123 Market St"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor={`${prefix}-address_line2`}>Address line 2</Label>
            <Input
              id={`${prefix}-address_line2`}
              name={`${prefix}.address_line2`}
              placeholder="Suite 200"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-city`}>City</Label>
            <Input
              id={`${prefix}-city`}
              name={`${prefix}.city`}
              placeholder="Austin"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-state`}>State / Province</Label>
            <Input
              id={`${prefix}-state`}
              name={`${prefix}.state`}
              placeholder="TX"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-postal_code`}>Postal code</Label>
            <Input
              id={`${prefix}-postal_code`}
              name={`${prefix}.postal_code`}
              placeholder="73301"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-country`}>Country</Label>
            <Input
              id={`${prefix}-country`}
              name={`${prefix}.country`}
              placeholder="US"
              defaultValue="US"
              disabled={pending}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id={`${prefix}-is_residential`}
              name={`${prefix}.is_residential`}
              value="true"
              disabled={pending}
            />
            <Label
              htmlFor={`${prefix}-is_residential`}
              className="text-sm text-muted-foreground"
            >
              Residential address
            </Label>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id={`${prefix}-save`}
              name={`${prefix}.save`}
              value="true"
              disabled={pending}
            />
            <Label
              htmlFor={`${prefix}-save`}
              className="text-sm text-muted-foreground"
            >
              Save this address for future labels
            </Label>
          </div>
        </div>
      )}
    </Fieldset>
  );
}

export function CreateLabelForm({
  fromAddresses,
  toAddresses,
  carriers,
  initialServices,
}: {
  fromAddresses: AddressRecord[];
  toAddresses: AddressRecord[];
  carriers: ShipStationCarrier[];
  initialServices: ShipStationService[];
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
  const [services, setServices] =
    useState<ShipStationService[]>(initialServices);
  const [selectedService, setSelectedService] = useState<string>(() => {
    const code = initialServices
      .map(getServiceCode)
      .find((value) => value.length > 0);
    return code ?? "";
  });
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCarrier) return;

    setMetadataLoading(true);
    setMetadataError(null);

    fetchCarrierMetadata(selectedCarrier)
      .then((data) => {
        setServices(data.services);
        setSelectedService((current) => {
          const available = data.services
            .map(getServiceCode)
            .filter((value) => value.length > 0);
          if (available.includes(current) && current.length > 0) {
            return current;
          }
          return available[0] ?? "";
        });
      })
      .catch((error) => {
        setMetadataError(
          error instanceof Error ? error.message : String(error)
        );
      })
      .finally(() => setMetadataLoading(false));
  }, [selectedCarrier]);

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
            {metadataError ? (
              <p className="text-xs text-destructive">{metadataError}</p>
            ) : null}
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
              disabled={metadataLoading || isPending || !hasServiceChoices}
            >
              {serviceOptions}
            </select>
            {metadataLoading ? (
              <p className="text-xs text-muted-foreground">
                Updating services…
              </p>
            ) : null}
          </div>
          {/* <div className="grid gap-2">
            <Label htmlFor="package">Package</Label>
            <select
              id="package"
              name="packageCode"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedPackage}
              onChange={(event) => setSelectedPackage(event.target.value)}
              disabled={metadataLoading || isPending || !hasPackageChoices}
            >
              {packageOptions}
            </select>
          </div> */}
          {/* <div className="grid gap-2">
            <Label htmlFor="confirmation">Delivery confirmation</Label>
            <Input
              id="confirmation"
              name="confirmation"
              placeholder="delivery"
              disabled={isPending}
            />
          </div> */}
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
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700">
          <p className="font-semibold">Label created successfully.</p>
          {formState.label.tracking_number ? (
            <p>Tracking number: {formState.label.tracking_number}</p>
          ) : null}

          {/* TODO: Add implementation to convert base64 data to printable label
          {formState.label.label_download_url ? (
            <a
              href={formState.label.label_download_url}
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              Download the label
            </a>
          ) : null} */}
        </div>
      ) : null}
    </form>
  );
}
