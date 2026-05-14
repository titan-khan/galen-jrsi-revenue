import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import type { InternalCase } from '@/data/riskLensData';

interface InternalCaseCardProps {
  record: InternalCase;
  highlight?: boolean;
}

export function InternalCaseCard({ record, highlight = false }: InternalCaseCardProps) {
  return (
    <Card
      className={cn(
        'p-3',
        highlight && 'border-destructive/60 bg-destructive/[0.04]',
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">
          {record.caseId}
        </span>
        <span className="inline-flex items-center rounded border border-dashed border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {record.region}
        </span>
        <span className="ml-auto">
          <StatusBadge status={record.status} />
        </span>
      </div>
      <dl className="space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="w-20 text-muted-foreground">claimant</dt>
          <dd className="flex-1 text-foreground">{record.claimant}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 text-muted-foreground">case age</dt>
          <dd className="flex-1 text-foreground">
            <span className="font-semibold">{record.ageDays}d</span>
            <span className="text-muted-foreground"> · SLA </span>
            <span
              className={cn(
                'font-semibold',
                record.slaBreach ? 'text-destructive' : 'text-foreground',
              )}
            >
              {record.slaText}
            </span>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 text-muted-foreground">last action</dt>
          <dd className="flex-1 text-foreground">{record.lastAction}</dd>
        </div>
      </dl>
    </Card>
  );
}
