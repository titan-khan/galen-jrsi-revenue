import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { RiskEvent } from '@/data/riskLensData';

interface CouplingTraceCardProps {
  event: RiskEvent;
  layout?: 'stacked' | 'side-by-side';
  className?: string;
}

function Panel({
  label,
  pattern,
  bullets,
}: {
  label: string;
  pattern: string;
  bullets: string[];
}) {
  return (
    <Card className="flex-1 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xs italic text-foreground">"{pattern}"</div>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CouplingTraceCard({
  event,
  layout = 'side-by-side',
  className,
}: CouplingTraceCardProps) {
  return (
    <Card className={cn('bg-muted/40 p-4', className)}>
      <div className="mb-3 text-sm font-semibold text-foreground">
        Coupling logic execution trace
      </div>
      <div
        className={cn(
          'flex gap-3',
          layout === 'stacked' ? 'flex-col' : 'flex-col md:flex-row md:items-stretch',
        )}
      >
        <Panel
          label="EXTERNAL pattern"
          pattern={event.couplingExternal.pattern}
          bullets={event.couplingExternal.bullets}
        />
        {layout === 'side-by-side' && (
          <div className="hidden items-center justify-center md:flex">
            <span className="rounded-md border border-border bg-background px-3 py-1 text-sm font-bold uppercase tracking-wider text-foreground">
              AND
            </span>
          </div>
        )}
        <Panel
          label="INTERNAL pattern"
          pattern={event.couplingInternal.pattern}
          bullets={event.couplingInternal.bullets}
        />
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        <span>
          Match emitted {event.couplingMatchedAt} · coupling_signature{' '}
          <span className="font-mono text-foreground">{event.couplingSignature}</span>
        </span>
      </div>
    </Card>
  );
}
