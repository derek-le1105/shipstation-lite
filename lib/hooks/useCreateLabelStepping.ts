import { useMemo, useState } from "react";

type WizardStep = {
  title: string;
  description: string;
};

const STEPS: WizardStep[] = [
  {
    title: "Shipping Details",
    description: "Confirm who the label is going to and from.",
  },
  {
    title: "Package Details",
    description: "Enter weight and dimensions for each package.",
  },
  {
    title: "Carrier & Service",
    description: "Pick the carrier, service, and delivery options.",
  },
  {
    title: "Review & Create",
    description: "Double-check details before creating the label.",
  },
];

export default function useCreateLabelStepping() {
  const [shippingSteps, setShippingSteps] = useState<WizardStep[]>(STEPS);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const totalSteps = shippingSteps.length;

  const progress = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round(((stepIndex + 1) / totalSteps) * 100);
  }, [stepIndex, totalSteps]);

  return {
    shippingSteps,
    setShippingSteps,
    stepIndex,
    setStepIndex,
    progress,
    totalSteps,
  };
}
