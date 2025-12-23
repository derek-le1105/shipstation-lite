import { RefObject, useMemo, useState } from "react";

export type WizardStep = {
  title: string;
  description: string;
  state: "current" | "complete" | "upcoming" | "warning";
  warningMessage: string;
  requiredFields: string[];
};

const STEPS: WizardStep[] = [
  {
    title: "Shipping Details",
    description: "Confirm who the label is going to.",
    state: "current",
    warningMessage: "",
    requiredFields: [
      "contact_name",
      "phone",
      "address_line1",
      "city",
      "state",
      "postal_code",
    ],
  },
  {
    title: "Package Details",
    description: "Enter weight and dimensions for each package.",
    state: "upcoming",
    warningMessage: "",
    requiredFields: [
      "package-0.dimensions.length",
      "package-0.dimensions.width",
      "package-0.dimensions.height",
      "package-0.weight.value",
    ],
  },
  {
    title: "Carrier & Service",
    description: "Pick the carrier, service, and delivery options.",
    state: "upcoming",
    warningMessage: "",
    requiredFields: ["carrierCode", "serviceCode"],
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
  ): { state: "warning" | "complete"; errorMessage: string } => {
    const missing = step?.requiredFields.filter((key) => {
      const value = formData.get(key);
      return typeof value !== "string" || value.trim().length === 0;
    });
    return {
      state: missing.length ? "warning" : "complete",
      errorMessage: missing.length ? "Missing required fields" : "",
    };
  };

  const handleStepChange = (newIndex: number) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    console.log("formData: ", formData);
    const newSteps = shippingSteps.map((step, index) => {
      if (newIndex > index) {
        let a = { ...step, ...validateStep(formData, step) };
        console.log("step: ", a);
        return a;
      }
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
