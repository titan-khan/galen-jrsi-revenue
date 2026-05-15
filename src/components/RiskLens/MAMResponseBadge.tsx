import { cn } from '@/lib/utils';
import type { MAMResponse } from '@/data/riskLensData';

interface MAMResponseBadgeProps {
  kind: MAMResponse;
  size?: 'md' | 'lg';
  className?: string;
}

const MAP: Record<MAMResponse, { ring: string; text: string; bg: string; sub: string }> = {
  AVOID: {
    ring: 'border-red-500',
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    sub: 'prevent',
  },
  REDUCE: {
    ring: 'border-amber-600',
    text: 'text-amber-700',
    bg: 'bg-amber-500/10',
    sub: 'mitigate',
  },
  TRANSFER: {
    ring: 'border-primary',
    text: 'text-primary',
    bg: 'bg-primary/5',
    sub: 'escalate',
  },
  ACCEPT: {
    ring: 'border-muted-foreground/40',
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    sub: 'monitor',
  },
};

export function MAMResponseBadge({ kind, size = 'md', className }: MAMResponseBadgeProps) {
  const s = MAP[kind];
  const isLg = size === 'lg';
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center rounded-lg border-2',
        s.ring,
        s.bg,
        isLg ? 'px-5 py-3' : 'px-4 py-2',
        className,
      )}
    >
      <div className={cn('font-bold leading-tight', s.text, isLg ? 'text-2xl' : 'text-xl')}>
        {kind}
      </div>
      <div className={cn('text-[11px] uppercase tracking-wider', s.text)}>{s.sub}</div>
    </div>
  );
}
