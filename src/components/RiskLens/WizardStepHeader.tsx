import { Link } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WizardStepHeaderProps {
  step: 1 | 2 | 3;
  totalSteps?: number;
  title: string;
  backHref?: string;
  backLabel?: string;
  nextHref?: string;
  nextLabel?: string;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
}

const STEP_LABELS: Record<number, string> = {
  1: 'Brief',
  2: 'Sumber',
  3: 'Aktivasi',
};

export function WizardStepHeader({
  step,
  totalSteps = 3,
  title,
  backHref,
  backLabel = 'Back',
  nextHref,
  nextLabel = 'Lanjut →',
  primaryAction,
}: WizardStepHeaderProps) {
  return (
    <div className="border-b border-border bg-background px-6 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-auto -ml-2 px-2 py-1 text-xs">
          <Link to={backHref ?? '/research'}>
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </Button>

        {/* Compact stepper — inline, no separate badge or duplicate label */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <span key={n} className="flex items-center">
              <span
                className={cn(
                  'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium',
                  n < step && 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700',
                  n === step && 'border-primary bg-primary text-primary-foreground',
                  n > step && 'border-border text-muted-foreground',
                )}
              >
                {n < step ? <Check className="h-3 w-3" /> : <span>{n}</span>}
                <span className={cn(n < step && 'hidden')}>{STEP_LABELS[n]}</span>
                {n < step && <span>{STEP_LABELS[n]}</span>}
              </span>
              {n < totalSteps && (
                <span
                  className={cn(
                    'block w-3 border-t',
                    n < step ? 'border-emerald-500/60' : 'border-dashed border-border',
                  )}
                />
              )}
            </span>
          ))}
        </div>

        <div className="ml-auto">
          {primaryAction ? (
            <Button size="sm" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
              {primaryAction.label}
            </Button>
          ) : nextHref ? (
            <Button asChild size="sm">
              <Link to={nextHref}>{nextLabel}</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <h1 className="mt-3 text-2xl font-semibold text-foreground">{title}</h1>
    </div>
  );
}
