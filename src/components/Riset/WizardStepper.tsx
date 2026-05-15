import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepDef {
  label: string;
}

interface WizardStepperProps {
  steps: StepDef[];
  current: number; // 1-indexed
  // anything below `current` is done; current is active; above is pending
}

export function WizardStepper({ steps, current }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border pb-5">
      {steps.map((s, idx) => {
        const n = idx + 1;
        const state: 'done' | 'active' | 'pending' =
          n < current ? 'done' : n === current ? 'active' : 'pending';
        return (
          <div key={s.label} className="flex flex-1 items-center gap-2.5">
            <div
              className={cn(
                'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold',
                state === 'done' && 'bg-foreground text-background',
                state === 'active' && 'bg-blue-600 text-white',
                state === 'pending' &&
                  'border-[1.5px] border-border bg-card text-muted-foreground',
              )}
            >
              {state === 'done' ? <Check className="h-3 w-3" /> : n}
            </div>
            <span
              className={cn(
                'text-[13px]',
                state === 'pending'
                  ? 'font-normal text-muted-foreground'
                  : 'font-medium text-foreground',
              )}
            >
              {s.label}
            </span>
            {n < steps.length && (
              <span
                className={cn(
                  'mx-2 block h-[1.5px] flex-1',
                  n < current ? 'bg-foreground' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
