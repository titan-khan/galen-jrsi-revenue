import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, AlertTriangle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { WizardStepHeader } from '@/components/RiskLens/WizardStepHeader';
import { ReadyRow } from '@/components/RiskLens/ReadyRow';
import {
  READINESS_FLOW,
  READINESS_CHECKS,
  COUPLING_SIGNATURES,
  FORECAST_30D,
  ROUTING_DAY1,
} from '@/data/briefData';

const FLOW_TONE: Record<string, string> = {
  amber: 'border-amber-500/60 text-amber-700',
  destructive: 'border-destructive/60 text-destructive',
};

const SIG_TONE: Record<string, string> = {
  destructive: 'border-destructive/60 text-destructive',
  amber: 'border-amber-500/60 text-amber-700',
  default: 'border-border text-muted-foreground',
};

const BriefStep3Readiness = () => {
  const navigate = useNavigate();
  const [startMode, setStartMode] = useState<'shadow' | 'live'>('shadow');
  const [backfill, setBackfill] = useState<'no' | '7d' | '14d'>('7d');

  const handleGoLive = () => {
    toast.success(
      startMode === 'shadow'
        ? 'Monitor started in shadow mode · 48h'
        : 'Monitor is live · routing active',
      {
        description: 'Worklist will start populating as signals come in.',
      },
    );
    setTimeout(() => navigate('/research/risk-lens'), 600);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WizardStepHeader
        step={3}
        title="Review & go live"
        backHref="/research/monitor/new/sources"
        backLabel="Sources"
        primaryAction={{ label: 'Start monitoring →', onClick: handleGoLive }}
      />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.4fr_360px] gap-0 min-h-0">
        <section className="space-y-5 overflow-auto px-6 py-5">
          {/* Flow diagram */}
          <Card className="bg-muted/40">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                What you've built
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {READINESS_FLOW.map((f, i) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <Card
                      className={cn(
                        'min-w-[140px] p-2.5 text-center',
                        f.tone && FLOW_TONE[f.tone],
                      )}
                    >
                      <div
                        className={cn(
                          'text-sm font-semibold',
                          f.tone === 'amber' && 'text-amber-700',
                          f.tone === 'destructive' && 'text-destructive',
                        )}
                      >
                        {f.label}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{f.sub}</div>
                    </Card>
                    {i < READINESS_FLOW.length - 1 && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-center text-xs italic text-primary">
                ↑ this is the chain · break any link and Worklist stays empty
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pipeline readiness
              </h2>
              <Card>
                <CardContent className="divide-y divide-border p-4">
                  {READINESS_CHECKS.map((c) => (
                    <ReadyRow key={c.label} check={c} />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Coupling signatures armed
              </h2>
              <Card>
                <CardContent className="space-y-2 p-3">
                  {COUPLING_SIGNATURES.map((s) => (
                    <Card key={s.signature} className={cn('p-2.5', SIG_TONE[s.tone])}>
                      <div className="font-mono text-xs font-semibold">{s.signature}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {s.binding}
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Backfill */}
          <Card className="bg-muted/40">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-semibold">Backfill last 7 days?</h2>
                <Badge variant="outline">dry run · no actions executed</Badge>
                <div className="ml-auto flex gap-1.5">
                  {(['no', '7d', '14d'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBackfill(v)}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-xs',
                        v === backfill
                          ? 'border-foreground bg-background text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {v === 'no' ? 'no' : `${v.replace('d', ' days')}`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Replays the last 7d of signals through the pipeline so the Worklist isn't empty on
                day 1. Cost: <span className="font-semibold text-foreground">≈ $48</span> · run time{' '}
                <span className="font-semibold text-foreground">≈ 12 min</span>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* RIGHT */}
        <aside className="space-y-4 overflow-auto border-t lg:border-t-0 lg:border-l border-dashed border-border bg-muted/30 px-5 py-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Forecast · first 30 days
          </h2>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Kpi label="coupling events" value={`~ ${FORECAST_30D.couplingEvents}`} />
              <Kpi
                label="HIGH-priority"
                value={`~ ${FORECAST_30D.highPriority}`}
                tone="amber"
              />
              <Kpi label="est. spend" value={FORECAST_30D.estSpend} tone="emerald" />
            </div>
            <Separator className="my-3" />
            <p className="text-[11px] text-muted-foreground">{FORECAST_30D.note}</p>
          </Card>

          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Routing on day 1
          </h2>
          <Card className="p-3">
            <ul className="space-y-1.5 text-xs">
              {ROUTING_DAY1.map((r) => (
                <li key={r.severity} className="flex items-start gap-1.5">
                  <Bell className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-semibold">{r.severity}</span>
                    <span className="text-muted-foreground"> → {r.destination}</span>
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-1.5 pt-1">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                <span className="text-foreground">
                  auto-execute is <span className="font-semibold">off</span> · all MAM actions need
                  analyst approval
                </span>
              </li>
            </ul>
          </Card>

          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Start mode
          </h2>
          <div className="space-y-2">
            {(['shadow', 'live'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setStartMode(m)}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-shadow hover:shadow-sm',
                  startMode === m ? 'border-foreground bg-background' : 'border-border bg-background',
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                      startMode === m ? 'border-primary' : 'border-border',
                    )}
                  >
                    {startMode === m && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">
                      {m === 'shadow' ? 'Shadow mode · 48h' : 'Live mode'}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {m === 'shadow'
                        ? 'Pipeline runs · Worklist populates · no Slack/email sent. Review before opening the firehose to your team.'
                        : 'Routing & notifications active immediately.'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Button onClick={handleGoLive} className="w-full" size="lg">
            Start monitoring →
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            You can pause, edit, or unbind any source from the Sources page.
          </p>
        </aside>
      </div>
    </div>
  );
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'amber';
}) {
  return (
    <div>
      <div
        className={cn(
          'text-2xl font-bold tabular-nums leading-none',
          tone === 'amber' && 'text-amber-700',
          tone === 'emerald' && 'text-emerald-700',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default BriefStep3Readiness;
