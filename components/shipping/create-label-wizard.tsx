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
import { ReviewSection } from "./review-section";
import WizardProgressBar from "./wizard-progress-bar";
import WizardStepCards from "./wizard-step-cards";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [formState, formAction, actionPending] = useActionState<
    CreateShippingLabelState,
    FormData
  >(createShippingLabelAction, { status: "idle" });
  const [transitionPending, startTransition] = useTransition();
  const isPending = transitionPending || actionPending;

  const { shippingSteps, stepIndex, handleStepChange, progress, totalSteps } =
    useCreateLabelStepping(formRef);
  const currentStep = shippingSteps[stepIndex]!;

  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < totalSteps - 1;

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
    <div className="space-y-6" data-testid="create-label-wizard">
      <CreateLabelProvider formRef={formRef}>
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg">Create a shipping label</CardTitle>
            <WizardProgressBar
              stepIndex={stepIndex}
              totalSteps={totalSteps}
              progress={progress}
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <WizardStepCards
              shippingSteps={shippingSteps}
              handleStepChange={handleStepChange}
            />

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
                <ReviewSection
                  visible={stepIndex === 3}
                  shipFrom={shipFrom}
                  toAddresses={toAddresses}
                  toMode={toMode}
                  carriers={carriers}
                  services={services}
                  selectedCarrier={selectedCarrier}
                  selectedService={selectedService}
                  formRef={formRef}
                />
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="ghost" disabled>
                  Save draft
                </Button>

                <div className="flex items-center gap-4">
                  <Button
                    data-testid="wizard-back"
                    type="button"
                    variant="outline"
                    disabled={!canGoBack}
                    onClick={() =>
                      handleStepChange(Math.min(totalSteps - 1, stepIndex - 1))
                    }
                  >
                    Back
                  </Button>

                  {canGoNext ? (
                    <Button
                      key="wizard-next"
                      data-testid="wizard-next"
                      type="button"
                      disabled={isPending}
                      onClick={(event) => {
                        event.preventDefault();
                        handleStepChange(
                          Math.min(totalSteps - 1, stepIndex + 1)
                        );
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      key="wizard-submit"
                      data-testid="wizard-next"
                      type="submit"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Truck className="mr-2 h-4 w-4" />
                          Create label
                        </>
                      )}
                    </Button>
                  )}
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
