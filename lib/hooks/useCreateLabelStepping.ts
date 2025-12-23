import { RefObject, useMemo, useState } from "react";

export type WizardStep = {
  title: string;
  description: string;
  state: "current" | "complete" | "upcoming" | "warning";
  warningMessage: string;
  requiredFields: RegExp[];
};

const STEPS: WizardStep[] = [
  {
    title: "Shipping Details",
    description: "Confirm who the label is going to.",
    state: "current",
    warningMessage: "",
    requiredFields: [
      /^contact_name$/,
      /^phone$/,
      /^address_line1$/,
      /^city$/,
      /^state$/,
      /^postal_code$/,
    ],
  },
  {
    title: "Package Details",
    description: "Enter weight and dimensions for each package.",
    state: "upcoming",
    warningMessage: "",
    requiredFields: [
      /^package-\d+\.dimensions\.length$/,
      /^package-\d+\.dimensions\.width$/,
      /^package-\d+\.dimensions\.height$/,
      /^package-\d+\.weight\.value$/,
    ],
  },
  {
    title: "Carrier & Service",
    description: "Pick the carrier, service, and delivery options.",
    state: "upcoming",
    warningMessage: "",
    requiredFields: [/^carrierCode$/, /^serviceCode$/],
  },
  {
    title: "Review & Create",
    description: "Double-check details before creating the label.",
    state: "upcoming",
    warningMessage: "",
    requiredFields: [],
  },
];

export default function useCreateLabelStepping(
  formRef: RefObject<HTMLFormElement | null>
) {
  const [shippingSteps, setShippingSteps] = useState<WizardStep[]>(STEPS);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const totalSteps = shippingSteps.length;

  const progress = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round(((stepIndex + 1) / totalSteps) * 100);
  }, [stepIndex, totalSteps]);

  const validateStep = (
    formData: FormData,
    step: WizardStep
  ): { state: "warning" | "complete"; warningMessage: string } => {
    const entries = Array.from(formData.entries());
    const missing = step.requiredFields.filter((pattern) => {
      const filtered = entries.filter(([key]) => pattern.test(key));
      //in cases like packages where multiple packages have similar required fields
      //iterate over every matched key and validate
      return !filtered.every(
        ([key, value]) =>
          pattern.test(key) &&
          typeof value === "string" &&
          value.trim().length > 0
      );
    });
    return {
      state: missing.length ? "warning" : "complete",
      warningMessage: missing.length ? "Missing required fields" : "",
    };
  };

  const handleStepChange = (newIndex: number) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const newSteps = shippingSteps.map((step, index) => {
      if (newIndex > index) return { ...step, ...validateStep(formData, step) };
      return step;
    });
    setShippingSteps(newSteps);
    setStepIndex(newIndex);
  };

  return {
    shippingSteps,
    setShippingSteps,
    stepIndex,
    handleStepChange,
    progress,
    totalSteps,
  };
}
