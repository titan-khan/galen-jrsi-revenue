import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import type { EventStatus, Severity } from '@/data/riskLensData';

interface WorklistRowProps {
  to: string;
  priorityScore: number;
  severity: Severity;
  title: string;
  ageText: string;
  status: EventStatus;
  line1: string;
  line2?: string;
}

const SCORE_TONE: Record<Severity, string> = {
  CRIT: 'text-rose-700',
  HIGH: 'text-destructive',
  MED: 'text-amber-700',
  LOW: 'text-emerald-700',
};

export function WorklistRow({
  to,
  priorityScore,
  severity,
  title,
  ageText,
  status,
  line1,
  line2,
}: WorklistRowProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-start gap-3 px-3 py-3 -mx-3 rounded-md',
        'transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div
        className={cn(
          'min-w-[56px] font-mono text-xl font-bold leading-none tabular-nums',
          SCORE_TONE[severity],
        )}
      >
        {priorityScore.toFixed(2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 truncate text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">{ageText}</span>
          <StatusBadge status={status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{line1}</p>
        {line2 && <p className="mt-0.5 text-xs text-muted-foreground">{line2}</p>}
      </div>
      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
    </Link>
  );
}
