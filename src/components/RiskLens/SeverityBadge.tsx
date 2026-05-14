import { cn } from '@/lib/utils';
import type { Severity } from '@/data/riskLensData';

interface SeverityBadgeProps {
  level: Severity;
  className?: string;
}

const STYLES: Record<Severity, { dot: string; text: string; ring: string; bg: string }> = {
  CRIT: {
    dot: 'bg-rose-700',
    text: 'text-rose-700',
    ring: 'border-rose-700/60',
    bg: 'bg-rose-700/10',
  },
  HIGH: {
    dot: 'bg-destructive',
    text: 'text-destructive',
    ring: 'border-destructive/60',
    bg: 'bg-destructive/10',
  },
  MED: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    ring: 'border-amber-500/60',
    bg: 'bg-amber-500/10',
  },
  LOW: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    ring: 'border-emerald-500/60',
    bg: 'bg-emerald-500/10',
  },
};

export function SeverityBadge({ level, className }: SeverityBadgeProps) {
  const s = STYLES[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        s.ring,
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {level}
    </span>
  );
}
