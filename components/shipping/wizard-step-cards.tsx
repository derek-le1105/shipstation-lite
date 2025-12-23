import { WizardStep } from "@/lib/hooks/useCreateLabelStepping";

type Props = {
  shippingSteps: WizardStep[];
  handleStepChange: (index: number) => void;
};

export default function WizardStepCards({
  shippingSteps,
  handleStepChange,
}: Props) {
  return (
    <div className="hidden md:grid gap-4 md:grid-cols-4">
      {shippingSteps.map((step, index) => {
        const { state, title, description, warningMessage } = step;
        const isWarning = state === "warning";
        const isComplete = state === "complete";
        return (
          <div
            key={title}
            data-testid={`wizard-step-card-${index + 1}`}
            className={`cursor-pointer rounded-lg border ${
              isWarning
                ? "border-warning/70 bg-warning/10"
                : isComplete
                ? "border-success/70 bg-success/10"
                : "border-border/60 bg-card"
            } px-4 py-3 transition-transform hover:bg-muted/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]`}
            onClick={() => {
              handleStepChange(index);
            }}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">Step {index + 1}</span>
              <span
                className={`rounded-full border px-2 py-0.5 ${
                  isWarning
                    ? "border-warning/60 text-warning"
                    : isComplete
                    ? "border-success/60 text-success"
                    : "border-border"
                }`}
              >
                {state}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p
              className={`mt-1 text-xs text-muted-foreground ${
                !!warningMessage && "underline text-warning"
              }`}
            >
              {warningMessage === "" ? description : warningMessage}
            </p>
          </div>
        );
      })}
    </div>
  );
}
