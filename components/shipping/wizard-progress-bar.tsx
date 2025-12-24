type Props = {
  stepIndex: number;
  totalSteps: number;
  progress: number;
};

export default function WizardProgressBar({
  stepIndex,
  totalSteps,
  progress,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="wizard-step-indicator">
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <span data-testid="wizard-progress-text">{progress}% complete</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          data-testid="wizard-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
