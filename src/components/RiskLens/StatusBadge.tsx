import { cn } from '@/lib/utils';
import type { EventStatus } from '@/data/riskLensData';

interface StatusBadgeProps {
  status: EventStatus;
  className?: string;
}

const STYLES: Record<EventStatus, string> = {
  NEW: 'border-primary/50 text-primary',
  WORKING: 'border-amber-500/60 text-amber-700',
  SNOOZED: 'border-muted-foreground/40 text-muted-foreground',
  PENDING_APPROVAL: 'border-violet-500/60 text-violet-700',
  CLOSED: 'border-emerald-500/60 text-emerald-700',
};

const LABELS: Record<EventStatus, string> = {
  NEW: 'BARU',
  WORKING: 'PROSES',
  SNOOZED: 'TUNDA',
  PENDING_APPROVAL: 'MENUNGGU PERSETUJUAN',
  CLOSED: 'SELESAI',
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
