"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { AlertCircleIcon, Loader2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { AddressSection } from "./address-section";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { PackageRecord } from "@/lib/supabase/packages";
import { PackageDetailsSection } from "./package-section";
import CreateLabelProvider from "../providers/create-label-provider";
import { WarehouseRecord } from "@/lib/supabase/warehouses";
import { ShipmentDetailsSection } from "./shipment-details-section";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";

interface CreateLabelFormProps {
  shipFrom: WarehouseRecord;
  toAddresses: AddressRecord[];
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  packages: PackageRecord[];
}

export function CreateLabelForm({
  shipFrom,
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
  const [toMode, setToMode] = useState<AddressMode>(
    toAddresses.length > 0 ? "saved" : "new"
  );
  const [selectedCarrier, setSelectedCarrier] = useState<string>(
    carriers[0]?.code ?? ""
  );
  const [selectedService, setSelectedService] = useState<string>("fedex_2day");
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Create a shipping label
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CreateLabelProvider formRef={formRef}>
          <form
            id="create-label-form"
            ref={formRef}
            action={onSubmit}
            className="space-y-6"
          >
            <AddressSection
              addresses={toAddresses}
              setMode={setToMode}
              pending={isPending}
              formRef={formRef}
            />
            <Separator />
            <ShipmentDetailsSection
              isPending={isPending}
              selectedCarrier={selectedCarrier}
              selectedService={selectedService}
              carriers={carriers}
              services={services}
              setSelectedCarrier={setSelectedCarrier}
              setSelectedService={setSelectedService}
            />
            <Separator />
            <PackageDetailsSection
              isPending={isPending}
              packages={packages}
              shipFrom={shipFrom}
              toAddresses={toAddresses}
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
        </CreateLabelProvider>
      </CardContent>
    </Card>
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
