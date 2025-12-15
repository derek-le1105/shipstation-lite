"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
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
  ShipStationService,
} from "@/lib/shipstation/types";
import {
  createShippingLabelAction,
  type CreateShippingLabelState,
} from "@/lib/actions/shipping";
import { printLabels } from "@/lib/utils";
import { toast } from "sonner";
import { AddressMode } from "./types";
import { Fieldset } from "../ui/fieldset";
import { AddressSection } from "./address-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { PackageRecord } from "@/lib/supabase/packages";
import { PackageDetailsSection } from "./package-section";

type CreateLabelFormCtx = {
  formRef: React.RefObject<HTMLFormElement | null>;
};

const CreateLabelFormContext = createContext<CreateLabelFormCtx | null>(null);

interface CreateLabelFormProps {
  fromAddresses: AddressRecord[];
  toAddresses: AddressRecord[];
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  packages: PackageRecord[];
  nextOrderNumber: string;
}

export function useCreateLabelFormContext() {
  const context = useContext(CreateLabelFormContext);
  if (!context) {
    throw new Error(
      "useCreateLabelFormContext must be used within a CreateLabelFormProvider"
    );
  }
  return context;
}

export function CreateLabelForm({
  fromAddresses,
  toAddresses,
  carriers,
  services,
  packages,
  nextOrderNumber,
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

  return (
    <CreateLabelFormContext.Provider value={{ formRef }}>
      <form
        id="create-label-form"
        ref={formRef}
        action={onSubmit}
        className="space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <AddressSection
            prefix="from"
            title="Ship from"
            addresses={fromAddresses}
            setMode={setFromMode}
            pending={isPending}
            formRef={formRef}
          />
          <AddressSection
            prefix="to"
            title="Ship to"
            addresses={toAddresses}
            setMode={setToMode}
            pending={isPending}
            formRef={formRef}
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
          nextOrderNumber={nextOrderNumber}
        />

        <PackageDetailsSection
          isPending={isPending}
          packages={packages}
          fromAddresses={fromAddresses}
          toAddresses={toAddresses}
          fromMode={fromMode}
          toMode={toMode}
          selectedCarrier={selectedCarrier}
          selectedService={selectedService}
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
    </CreateLabelFormContext.Provider>
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
  nextOrderNumber,
}: {
  isPending: boolean;
  selectedCarrier: string;
  selectedService: string;
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  setSelectedCarrier: (code: string) => void;
  setSelectedService: (code: string) => void;
  nextOrderNumber: string;
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
          <Label htmlFor="orderNumber">Order Number</Label>
          <Input
            id="orderNumber"
            name="orderNumber"
            placeholder={nextOrderNumber ?? "UNS-SM-#"}
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
  return formState.status === "success" && formState.items ? (
    <div className="flex flex-col gap-2">
      {formState.items.length > 0 &&
        formState.items.map((item) => {
          if (item.savedLabel && item.shipStationLabel) {
            return (
              <div
                key={`label-${item.index}`}
                className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700"
              >
                <div className="flex flex-col">
                  <p className="font-semibold">Label created successfully.</p>
                  {item?.savedLabel.tracking_number ? (
                    <p>Tracking number: {item.savedLabel.tracking_number}</p>
                  ) : null}
                </div>

                {item?.savedLabel.label_data_base64 ? (
                  <Button
                    variant="ghost"
                    className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-500/60 hover:text-emerald-800"
                    onClick={async () => {
                      if (item?.savedLabel?.label_data_base64)
                        await printLabels([item.savedLabel.label_data_base64]);
                      else toast.error("No label data available to print.");
                    }}
                  >
                    Print
                  </Button>
                ) : null}
              </div>
            );
          }
        })}
    </div>
  ) : null;
}
