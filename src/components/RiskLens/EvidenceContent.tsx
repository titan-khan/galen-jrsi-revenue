import { Check, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CouplingTraceCard } from './CouplingTraceCard';
import type { RiskEvent } from '@/data/riskLensData';

interface EvidenceContentProps {
  event: RiskEvent;
}

export function EvidenceContent({ event }: EvidenceContentProps) {
  const monthsEarly =
    event.evalGroundTruth.groundTruthMonth - event.evalGroundTruth.detectedMonth;

  return (
    <div className="space-y-6">
      {/* 1 · Score breakdown */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            1 · Composite priority breakdown
          </h3>
          <Badge variant="outline" className="text-[10px]">
            combination: weighted_sum
          </Badge>
        </div>
        <div className="grid grid-cols-[1fr_2fr_60px_60px_60px] items-center gap-3 border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Factor</span>
          <span>Raw</span>
          <span className="text-right">Value</span>
          <span className="text-right">Weight</span>
          <span className="text-right">Contrib</span>
        </div>
        <div className="divide-y divide-border">
          {event.scoreFactors.map((f) => (
            <div
              key={f.label}
              className="grid grid-cols-[1fr_2fr_60px_60px_60px] items-center gap-3 py-2.5 text-sm"
            >
              <span className="font-mono text-xs">{f.label}</span>
              <Progress value={f.value * 100} className="h-2.5" />
              <span className="text-right font-mono font-semibold tabular-nums">
                {f.value.toFixed(2)}
              </span>
              <span className="text-right text-xs text-muted-foreground">
                × {f.weight.toFixed(2)}
              </span>
              <span className="text-right font-mono font-semibold text-primary tabular-nums">
                {f.contribution.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm font-semibold">composite priority =</span>
          <span className="font-mono text-2xl font-bold text-destructive tabular-nums">
            {event.priorityScore.toFixed(2)}
          </span>
        </div>
      </section>

      {/* 2 · Coupling trace */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          2 · Coupling logic execution trace
        </h3>
        <CouplingTraceCard event={event} />
      </section>

      {/* 3 · Signal timeline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            3 · Chronological signal timeline
          </h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px]">
              {event.signalTimeline.length} signals
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {new Set(event.signalTimeline.map((s) => s.source)).size} sources
            </Badge>
          </div>
        </div>
        <ol className="relative space-y-4 border-l border-border pl-6">
          {event.signalTimeline.map((s, i) => (
            <li key={i} className="relative">
              <span
                className={cn(
                  'absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 bg-background',
                  s.source === 'internal' ? 'border-primary' : 'border-foreground',
                )}
              />
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {s.time}
                </span>
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                  {s.source}
                </Badge>
                {s.credibility !== null && <span>cred {s.credibility.toFixed(2)}</span>}
                {s.extractionConfidence !== null && (
                  <span>· extraction conf {s.extractionConfidence.toFixed(2)}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-foreground">{s.claim}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4 · Eval marker */}
      <section className="rounded-md border border-emerald-500/60 bg-emerald-500/10 p-4">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              Eval marker ·{' '}
              {event.evalGroundTruth.label === 'true positive'
                ? 'golden case match'
                : event.evalGroundTruth.label}
            </div>
            <p className="text-xs text-muted-foreground">
              ground truth:{' '}
              <span className="font-semibold text-foreground">{event.evalGroundTruth.label}</span>{' '}
              · expected severity {event.evalGroundTruth.expectedSeverity.toFixed(2)} · system{' '}
              {event.severityScore.toFixed(2)}
              {monthsEarly > 0 && (
                <>
                  {' '}
                  · detected month {event.evalGroundTruth.detectedMonth} vs. ground-truth month{' '}
                  {event.evalGroundTruth.groundTruthMonth} ={' '}
                  <span className="font-semibold text-emerald-700">
                    {monthsEarly} months early
                  </span>
                </>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Flag className="mr-1.5 h-3.5 w-3.5" />
            Flag for review
          </Button>
        </div>
      </section>
    </div>
  );
}
