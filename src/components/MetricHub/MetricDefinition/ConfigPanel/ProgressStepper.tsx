import { Check } from "lucide-react";

interface Step {
  label: string;
  completed: boolean;
  active: boolean;
}

interface ProgressStepperProps {
  steps: Step[];
}

const ProgressStepper = ({ steps }: ProgressStepperProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                step.completed
                  ? "bg-primary text-primary-foreground"
                  : step.active
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.completed ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                step.active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-8 h-px bg-border mx-3" />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressStepper;
