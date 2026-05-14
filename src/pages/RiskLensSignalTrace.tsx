import { RotateCw, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/RiskLens/SeverityBadge';
import { StageRun } from '@/components/RiskLens/StageRun';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { SIGNAL_TRACE } from '@/data/pipelineData';

const RiskLensSignalTrace = () => {
  const trace = SIGNAL_TRACE;
  const llmCallCount = trace.stages.filter((s) => Number(s.llmCost ?? 0) > 0).length;

  return (
    <RiskLensShell>
      <div className="border-b border-border px-6 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Signal trace
          </span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {trace.traceId}
          </Badge>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              Replay
            </Button>
            <Button variant="outline" size="sm">
              <Flag className="mr-1.5 h-3.5 w-3.5" />
              Flag for eval
            </Button>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[360px_1fr] gap-0 min-h-0">
        {/* Raw signal + metadata */}
        <aside className="space-y-3 overflow-auto border-b lg:border-b-0 lg:border-r border-dashed border-border bg-muted/30 px-5 py-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Raw signal
          </h2>
          <Card className="p-3">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                {trace.source}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{trace.capturedAt}</span>
            </div>
            <p className="text-xs italic leading-relaxed text-foreground">"{trace.rawText}"</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {trace.reach}
              </Badge>
              {trace.amplifierTag && (
                <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                  {trace.amplifierTag}
                </Badge>
              )}
            </div>
          </Card>

          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Run metadata
          </h2>
          <Card className="p-3 font-mono text-xs">
            <dl className="space-y-1">
              <Row k="tenant" v="jrsi-id" mono />
              <Row k="pipeline" v="risk_lens_signal_processing" mono />
              <Row k="started" v={trace.startedAt} />
              <Row k="completed" v={trace.completedAt} />
              <Row k="wall time" v={trace.wallTime} valueClass="text-emerald-700 font-semibold" />
              <Row k="llm cost" v={trace.totalLlmCost} valueClass="font-semibold" />
              <Row k="replay sig" v={trace.replaySig} mono />
            </dl>
          </Card>

          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Outcome
          </h2>
          <Card className="border-destructive/60 bg-destructive/5 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <SeverityBadge level={trace.outcome.severity} />
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                priority {trace.outcome.priority.toFixed(2)}
              </Badge>
            </div>
            <p className="text-xs text-foreground">
              Coupling event{' '}
              <span className="font-mono font-semibold">{trace.outcome.eventId}</span> · matched{' '}
              <span className="font-mono font-semibold">{trace.outcome.matchedCase}</span> · routed
              to {trace.outcome.routedTo}
            </p>
          </Card>
        </aside>

        {/* Stage timeline */}
        <section className="overflow-auto px-6 py-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Specialist run sequence</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{trace.stages.length} stages</Badge>
                <Badge variant="outline">{llmCallCount} LLM calls</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {trace.stages.map((run, i) => (
                <StageRun key={run.index} run={run} last={i === trace.stages.length - 1} />
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </RiskLensShell>
  );
};

function Row({
  k,
  v,
  mono = false,
  valueClass,
}: {
  k: string;
  v: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 text-muted-foreground">{k}</dt>
      <dd className={[mono ? 'font-mono' : '', valueClass ?? 'text-foreground'].join(' ')}>{v}</dd>
    </div>
  );
}

export default RiskLensSignalTrace;
