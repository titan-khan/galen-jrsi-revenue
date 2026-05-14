import { Link } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

export function WizardStepHeader({
  step,
  totalSteps = 3,
  title,
  backHref,
  backLabel = 'Back',
  nextHref,
  nextLabel = 'Next →',
  primaryAction,
}: WizardStepHeaderProps) {
  return (
    <div className="border-b border-border bg-background px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="h-auto -ml-2 px-2 py-1 text-xs">
          <Link to={backHref ?? '/research'}>
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs text-muted-foreground">New monitoring brief</span>
        <Badge variant="outline">
          step {step} of {totalSteps}
        </Badge>

        <div className="mx-auto flex items-center gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <span key={n} className="flex items-center">
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold',
                  n < step && 'border-emerald-500 bg-emerald-500 text-white',
                  n === step && 'border-primary bg-primary text-primary-foreground',
                  n > step && 'border-border text-muted-foreground',
                )}
              >
                {n < step ? <Check className="h-3 w-3" /> : n}
              </span>
              {n < totalSteps && (
                <span
                  className={cn(
                    'block w-5 border-t',
                    n < step ? 'border-emerald-500' : 'border-dashed border-border',
                  )}
                />
              )}
            </span>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm">
            Save draft
          </Button>
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
