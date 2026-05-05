import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AgentRun } from '@/types/agent';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'text-emerald-600 bg-emerald-500/8 border-transparent' },
  running: { label: 'Running', className: 'text-blue-600 bg-blue-500/8 border-transparent' },
  failed: { label: 'Failed', className: 'text-red-600 bg-red-500/8 border-transparent' },
  cancelled: { label: 'Cancelled', className: 'text-muted-foreground bg-muted/60 border-transparent' },
};

const TRIGGER_STYLES: Record<string, string> = {
  scheduled: 'text-muted-foreground bg-muted/60 border-transparent',
  'anomaly-detected': 'text-amber-600 bg-amber-500/8 border-transparent',
  manual: 'text-blue-600 bg-blue-500/8 border-transparent',
};

const TRIGGER_LABELS: Record<string, string> = {
  scheduled: 'CronJob',
  'anomaly-detected': 'Alert',
  manual: 'Manual',
};

interface ActivityLogTableProps {
  specialistId: string;
  runHistory?: AgentRun[];
  onReviewClick?: () => void;
}

export function ActivityLogTable({ specialistId, runHistory, onReviewClick }: ActivityLogTableProps) {
  const entries = runHistory || [];

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground/60 border border-border rounded-xl">
        No activity yet. Run the specialist to see its analysis history.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Specialist Log</h3>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead className="text-sm font-medium h-10 text-muted-foreground/60">Run Date</TableHead>
              <TableHead className="text-sm font-medium h-10 text-muted-foreground/60">Trigger</TableHead>
              <TableHead className="text-sm font-medium h-10 text-muted-foreground/60">Status</TableHead>
              <TableHead className="text-sm font-medium h-10 text-muted-foreground/60">Summary</TableHead>
              <TableHead className="text-sm font-medium h-10 text-muted-foreground/60 text-right">Findings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.slice(0, 10).map((run) => {
              const statusCfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.completed;
              const triggerLabel = TRIGGER_LABELS[run.trigger] || run.trigger;
              const triggerStyle = TRIGGER_STYLES[run.trigger] || TRIGGER_STYLES.manual;

              return (
                <TableRow key={run.id} className="hover:bg-muted/20 border-border/40">
                  <TableCell className="text-xs text-muted-foreground/80 py-3">
                    <div>{format(new Date(run.startedAt), 'MMM d')}</div>
                    <div className="text-xs text-muted-foreground/40 mt-0.5">
                      {format(new Date(run.startedAt), 'HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={cn('text-xs font-medium h-5 px-1.5', triggerStyle)}>
                      {triggerLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={cn('text-xs font-medium h-5 px-1.5', statusCfg.className)}>
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-foreground/80 py-3 max-w-[280px] truncate">
                    {run.summary || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-right py-3">
                    {run.findingsCount && run.findingsCount > 0 ? (
                      <button
                        onClick={onReviewClick}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {run.findingsCount} findings
                      </button>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
