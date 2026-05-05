import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  label: string;
  number: number;
  isComplete: boolean;
  isAccessible: boolean;
}

interface WizardSidebarProps {
  steps: WizardStep[];
  currentStep: string;
  onStepClick: (stepId: string) => void;
}

export const WizardSidebar = ({ steps, currentStep, onStepClick }: WizardSidebarProps) => {
  return (
    <nav className="space-y-1">
      {steps.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isComplete = step.isComplete;
        const isAccessible = step.isAccessible;

        return (
          <button
            key={step.id}
            onClick={() => isAccessible && onStepClick(step.id)}
            disabled={!isAccessible}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150',
              isCurrent && 'bg-primary/10 text-primary',
              !isCurrent && isAccessible && 'text-foreground hover:bg-muted',
              !isAccessible && 'text-muted-foreground/50 cursor-not-allowed',
            )}
          >
            {/* Step indicator */}
            <div className={cn(
              'flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium shrink-0 transition-all duration-150',
              isCurrent && 'bg-primary text-primary-foreground',
              isComplete && !isCurrent && 'bg-primary/20 text-primary',
              !isCurrent && !isComplete && 'bg-muted text-muted-foreground',
            )}>
              {isComplete ? <Check className="h-3.5 w-3.5" /> : step.number}
            </div>

            {/* Label */}
            <span className={cn(
              'text-sm font-medium',
              isCurrent && 'text-primary',
              !isCurrent && !isAccessible && 'text-muted-foreground/50',
            )}>
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
