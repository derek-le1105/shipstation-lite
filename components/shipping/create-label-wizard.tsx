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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import ShipFromPopover from "./ship-from-popover";
import { SidebarTrigger } from "../ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const formRef = useRef<HTMLFormElement>(null);
  const [formState, formAction, actionPending] = useActionState<
    CreateShippingLabelState,
    FormData
  >(createShippingLabelAction, { status: "idle" });
  const [transitionPending, startTransition] = useTransition();
  const isPending = transitionPending || actionPending;

  const {
    shippingSteps,
    stepIndex,
    handleStepChange,
    refreshStepState,
    progress,
    totalSteps,
  } = useCreateLabelStepping(formRef);
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

  const invalidStep = useMemo(
    () => shippingSteps.find(({ state }) => state === "warning"),
    [shippingSteps]
  );

  const isValidInputs = useMemo(
    () => shippingSteps.slice(0, 2).every(({ state }) => state === "complete"),
    [shippingSteps]
  );

  const [packageStepInvalid, setPackageStepInvalid] = useState(false);

  const evaluatePackageStepValidity = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const selectors = [
      'input[name^="package-"][name$=".dimensions.length"]',
      'input[name^="package-"][name$=".dimensions.width"]',
      'input[name^="package-"][name$=".dimensions.height"]',
      'input[name^="package-"][name$=".weight.value"]',
    ];
    const inputs = Array.from(
      form.querySelectorAll<HTMLInputElement>(selectors.join(","))
    );
    if (inputs.length === 0) {
      setPackageStepInvalid(false);
      return;
    }
    setPackageStepInvalid(inputs.some((input) => !input.checkValidity()));
  }, [formRef]);

  useEffect(() => {
    if (stepIndex !== 1) {
      setPackageStepInvalid(false);
      return;
    }
    evaluatePackageStepValidity();

    const form = formRef.current;
    if (!form) return;

    const handleFormChange = () => {
      evaluatePackageStepValidity();
    };

    form.addEventListener("input", handleFormChange);
    form.addEventListener("change", handleFormChange);

    return () => {
      form.removeEventListener("input", handleFormChange);
      form.removeEventListener("change", handleFormChange);
    };
  }, [stepIndex, evaluatePackageStepValidity, formRef]);

  useEffect(() => {
    if (stepIndex !== 1) return;
    refreshStepState(1);
  }, [packageStepInvalid, refreshStepState, stepIndex]);

  return (
    <div className="space-y-6" data-testid="create-label-wizard">
      <CreateLabelProvider formRef={formRef}>
        <div className="flex h-6 text-lg items-center gap-2">
          {isMobile && (
            <>
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-full" />
            </>
          )}
          <span className="flex items-center">Create a shipping label</span>
        </div>
        <WizardProgressBar
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          progress={progress}
        />
        <WizardStepCards
          shippingSteps={shippingSteps}
          handleStepChange={handleStepChange}
        />

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{currentStep.title}</h2>
            {stepIndex === 0 ? <ShipFromPopover warehouse={shipFrom} /> : <></>}
          </div>
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

          <div className="flex flex-wrap items-center justify-end gap-3">
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
                  disabled={
                    isPending || (stepIndex === 1 && packageStepInvalid)
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    handleStepChange(Math.min(totalSteps - 1, stepIndex + 1));
                  }}
                >
                  Next
                </Button>
              ) : (
                (() => {
                  const isSubmitDisabled = isPending || !isValidInputs;
                  const submitButton = (
                    <Button
                      key="wizard-submit"
                      data-testid="wizard-next"
                      type="submit"
                      disabled={isSubmitDisabled}
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
                  );

                  if (!isSubmitDisabled) {
                    return submitButton;
                  }

                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          asChild
                          className="disabled:pointer-events-auto"
                        >
                          {submitButton}
                        </TooltipTrigger>
                        <TooltipContent>
                          You have unresolved warnings in {invalidStep?.title},
                          please resolve them first.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()
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
