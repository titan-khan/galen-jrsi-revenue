import { cn } from '@/lib/utils';
import type { EventStatus } from '@/data/riskLensData';

interface StatusBadgeProps {
  status: EventStatus;
  className?: string;
}

const STYLES: Record<EventStatus, string> = {
  NEW: 'border-primary/50 text-primary',
  ACK: 'border-amber-500/60 text-amber-700',
  IN_PROGRESS: 'border-primary/50 text-primary',
  SNOOZED: 'border-muted-foreground/40 text-muted-foreground',
  ESCALATED: 'border-destructive/60 text-destructive',
  RESOLVED: 'border-emerald-500/60 text-emerald-700',
  DISMISSED: 'border-muted-foreground/40 text-muted-foreground',
};

const LABELS: Record<EventStatus, string> = {
  NEW: 'NEW',
  ACK: 'ACK',
  IN_PROGRESS: 'IN PROGRESS',
  SNOOZED: 'SNOOZED',
  ESCALATED: 'ESCALATED',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
