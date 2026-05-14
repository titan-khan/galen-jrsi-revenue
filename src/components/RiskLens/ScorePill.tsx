import { cn } from '@/lib/utils';

type Tone = 'destructive' | 'amber' | 'emerald' | 'primary' | 'muted';

interface ScorePillProps {
  label: string;
  value: string;
  tone?: Tone;
  className?: string;
}

const TONE_STYLES: Record<Tone, { border: string; text: string; bg: string }> = {
  destructive: { border: 'border-destructive/40', text: 'text-destructive', bg: 'bg-destructive/5' },
  amber: { border: 'border-amber-500/40', text: 'text-amber-700', bg: 'bg-amber-500/5' },
  emerald: { border: 'border-emerald-500/40', text: 'text-emerald-700', bg: 'bg-emerald-500/5' },
  primary: { border: 'border-primary/30', text: 'text-primary', bg: 'bg-primary/5' },
  muted: { border: 'border-border', text: 'text-foreground', bg: 'bg-background' },
};

export function ScorePill({ label, value, tone = 'muted', className }: ScorePillProps) {
  const t = TONE_STYLES[tone];
  return (
    <div
      className={cn(
        'min-w-[88px] rounded-md border px-3 py-2 text-center',
        t.border,
        t.bg,
        className,
      )}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-0.5 text-xl font-bold leading-none', t.text)}>{value}</div>
    </div>
  );
}
