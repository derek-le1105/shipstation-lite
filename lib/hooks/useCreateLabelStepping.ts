import { RefObject, useCallback, useMemo, useState } from "react";

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

  const validateStep = useCallback(
    (
      formData: FormData,
      step: WizardStep,
      form: HTMLFormElement
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
      const invalidFields = step.requiredFields.some((pattern) => {
        const inputs = Array.from(form.elements).filter((element) => {
          const field = element as HTMLInputElement | HTMLSelectElement;
          return !!field.name && pattern.test(field.name);
        });
        return inputs.some(
          (element) =>
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement
              ? !element.checkValidity()
              : false
        );
      });

      const hasWarnings = missing.length > 0 || invalidFields;

      return {
        state: hasWarnings ? "warning" : "complete",
        warningMessage: hasWarnings
          ? missing.length
            ? "Missing required fields"
            : "Invalid values"
          : "",
      };
    },
    []
  );

  const handleStepChange = useCallback(
    (newIndex: number) => {
      if (!formRef.current) return;
      const formData = new FormData(formRef.current);
      const form = formRef.current;
      const newSteps = shippingSteps.map((step, index) => {
        if (newIndex > index) {
          return { ...step, ...validateStep(formData, step, form) };
        }
        return step;
      });
      setShippingSteps(newSteps);
      setStepIndex(newIndex);
    },
    [formRef, shippingSteps, validateStep]
  );

  const refreshStepState = useCallback(
    (index: number) => {
      if (!formRef.current) return;
      const formData = new FormData(formRef.current);
      const form = formRef.current;
      setShippingSteps((current) =>
        current.map((step, stepIndex) => {
          if (stepIndex !== index) return step;
          return { ...step, ...validateStep(formData, step, form) };
        })
      );
    },
    [formRef, validateStep]
  );

  return {
    shippingSteps,
    setShippingSteps,
    stepIndex,
    handleStepChange,
    refreshStepState,
    progress,
    totalSteps,
  };
}
