import { useState } from 'react';
import { Check, X, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SpecialistStageRun } from '@/data/pipelineData';

interface StageRunProps {
  run: SpecialistStageRun;
  last?: boolean;
}

const STATUS_RING: Record<SpecialistStageRun['status'], string> = {
  ok: 'border-emerald-500 text-emerald-600',
  skip: 'border-muted-foreground text-muted-foreground',
  fail: 'border-destructive text-destructive',
  warn: 'border-amber-500 text-amber-600',
};

export function StageRun({ run, last = false }: StageRunProps) {
  const [open, setOpen] = useState(Boolean(run.expandedByDefault));

  return (
    <div className="relative pl-9">
      <span
        className={cn(
          'absolute left-1 top-2 grid h-5 w-5 place-items-center rounded-full border-2 bg-background',
          STATUS_RING[run.status],
        )}
      >
        {run.status === 'ok' && <Check className="h-3 w-3" />}
        {run.status === 'fail' && <X className="h-3 w-3" />}
        {run.status === 'skip' && <Minus className="h-3 w-3" />}
        {run.status === 'warn' && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      {!last && (
        <span className="absolute left-[14px] top-7 bottom-0 w-px bg-border" aria-hidden />
      )}
      <Card className={cn('p-3', open && 'shadow-sm')}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 text-left"
        >
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{run.index}</span>
          <span className="font-mono text-xs font-semibold text-foreground">{run.agent}</span>
          <span className="text-[11px] text-muted-foreground">{run.elapsed}</span>
          {run.badge && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                run.status === 'ok' && 'border-emerald-500/60 text-emerald-700',
                run.status === 'fail' && 'border-destructive/60 text-destructive',
              )}
            >
              {run.badge}
            </Badge>
          )}
          <span className="ml-auto flex items-center gap-2">
            {run.llmCost !== undefined && (
              <span className="rounded border border-dashed border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ${run.llmCost}
              </span>
            )}
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        </button>
        {open && (
          <div className="mt-2 border-t border-dashed border-border pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              output summary
            </div>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">
              {run.summary}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
