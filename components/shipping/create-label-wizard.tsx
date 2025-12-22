"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { AlertCircleIcon, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AddressSection } from "./address-section";
import { PackageDetailsSection } from "./package-section";
import { ShipmentDetailsSection } from "./shipment-details-section";
import CreateLabelProvider from "../providers/create-label-provider";

import type { AddressRecord } from "@/lib/supabase/addresses";
import type { PackageRecord } from "@/lib/supabase/packages";
import type {
  ShipStationCarrier,
  ShipStationService,
} from "@/lib/shipstation/types";
import {
  createShippingLabelAction,
  type CreateShippingLabelState,
} from "@/lib/actions/shipping";
import { AddressMode } from "./types";
import { printLabels } from "@/lib/utils";
import useCreateLabelStepping from "@/lib/hooks/useCreateLabelStepping";
import { WarehouseRecord } from "@/lib/supabase/warehouses";

type CreateLabelWizardProps = {
  shipFrom: WarehouseRecord;
  toAddresses: AddressRecord[];
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  packages: PackageRecord[];
};

export default function CreateLabelWizard({
  shipFrom,
  toAddresses,
  carriers,
  services,
  packages,
}: CreateLabelWizardProps) {
  const { shippingSteps, stepIndex, setStepIndex, progress, totalSteps } =
    useCreateLabelStepping();
  const currentStep = shippingSteps[stepIndex]!;

  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < totalSteps - 1;

  const formRef = useRef<HTMLFormElement>(null);
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

  const onSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="space-y-6">
      <CreateLabelProvider formRef={formRef}>
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg">Progress</CardTitle>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Step {stepIndex + 1} of {totalSteps}
                </span>
                <span>{progress}% complete</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="hidden md:grid gap-4 md:grid-cols-4">
              {shippingSteps.map((step, index) => {
                const state =
                  index === stepIndex
                    ? "current"
                    : index < stepIndex
                    ? "complete"
                    : "upcoming";
                return (
                  <div
                    key={step.title}
                    className="cursor-pointer rounded-lg border border-border/60 bg-card px-4 py-3 transition-transform hover:bg-muted/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
                    onClick={() => {
                      setStepIndex(index);
                    }}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="uppercase tracking-wide">
                        Step {index + 1}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5">
                        {state}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{currentStep.title}</h2>
              <p className="text-sm text-muted-foreground">
                {currentStep.description}
              </p>
            </div>

            <form
              id="create-label-form"
              ref={formRef}
              action={onSubmit}
              className="space-y-8"
            >
              <section hidden={stepIndex !== 0}>
                <AddressSection
                  prefix="to"
                  addresses={toAddresses}
                  setMode={setToMode}
                  pending={isPending}
                  formRef={formRef}
                />
              </section>

              <section hidden={stepIndex !== 1}>
                <PackageDetailsSection
                  isPending={isPending}
                  packages={packages}
                  shipFrom={shipFrom}
                  toAddresses={toAddresses}
                  toMode={toMode}
                  selectedCarrier={selectedCarrier}
                  selectedService={selectedService}
                />
              </section>

              <section hidden={stepIndex !== 2}>
                <ShipmentDetailsSection
                  isPending={isPending}
                  selectedCarrier={selectedCarrier}
                  selectedService={selectedService}
                  carriers={carriers}
                  services={services}
                  setSelectedCarrier={setSelectedCarrier}
                  setSelectedService={setSelectedService}
                />
              </section>

              <section hidden={stepIndex !== 3}>
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                  Review your shipping details, package details, and service
                  selections before creating the label.
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canGoBack}
                  onClick={() =>
                    setStepIndex((current) => Math.max(0, current - 1))
                  }
                >
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost">
                    Save draft
                  </Button>
                  <Button
                    type={canGoNext ? "button" : "submit"}
                    disabled={isPending}
                    onClick={() => {
                      if (canGoNext) {
                        setStepIndex((current) =>
                          Math.min(totalSteps - 1, current + 1)
                        );
                      }
                    }}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : canGoNext ? (
                      "Next"
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Create label
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {formState.status === "error" ? (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Unable to create label</AlertTitle>
                  <AlertDescription>
                    <p>
                      {formState.message ??
                        "Could not create the label. Please try again."}
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}

              <FormResponseMessage formState={formState} />
            </form>
          </CardContent>
        </Card>
      </CreateLabelProvider>
    </div>
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
          return null;
        })}
    </div>
  ) : null;
}
