import { cn } from '@/lib/utils';

type Tone = 'destructive' | 'amber' | 'emerald' | 'muted' | 'primary';

interface CostBarProps {
  label: string;
  value: number;
  max: number;
  tone?: Tone;
  valueLabel?: string;
}

const FILLS: Record<Tone, string> = {
  destructive: 'bg-destructive/70',
  amber: 'bg-amber-500/70',
  emerald: 'bg-emerald-500/70',
  primary: 'bg-primary/60',
  muted: 'bg-muted-foreground/40',
};

const TEXT: Record<Tone, string> = {
  destructive: 'text-destructive',
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
  primary: 'text-primary',
  muted: 'text-muted-foreground',
};

export function CostBar({ label, value, max, tone = 'primary', valueLabel }: CostBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="grid grid-cols-[180px_1fr_110px] items-center gap-3 py-1.5">
      <span className="font-mono text-xs">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full border border-border bg-background">
        <div
          className={cn('h-full', FILLS[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-right font-mono text-xs font-semibold tabular-nums', TEXT[tone])}>
        {valueLabel ?? `$${value.toFixed(0)}`}
      </span>
    </div>
  );
}
