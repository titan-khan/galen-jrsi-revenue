import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CostBar } from '@/components/RiskLens/CostBar';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { COST_DASHBOARD } from '@/data/pipelineData';

const RiskLensCostDashboard = () => {
  const d = COST_DASHBOARD;

  return (
    <RiskLensShell>
      <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cost &amp; budget
        </h2>
        <Badge variant="outline">{d.period} · partial</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{d.dayOfMonth}</span>
      </div>

      {/* Top KPIs */}
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="LLM spend MTD"
          value={d.llmSpend.mtd}
          context={`of ${d.llmSpend.budget}`}
          footer={
            <>
              projected {d.llmSpend.projected}
              {d.llmSpend.overBy && (
                <span className="text-amber-700"> · over by {d.llmSpend.overBy}</span>
              )}
            </>
          }
        />
        <KpiCard
          label="Acquisition spend"
          value={d.acquisitionSpend.mtd}
          context={`of ${d.acquisitionSpend.budget}`}
          footer={d.acquisitionSpend.note}
        />
        <KpiCard
          label="Cost per coupling event"
          value={d.costPerCouplingEvent.value}
          valueTone="emerald"
          context={`${d.costPerCouplingEvent.events} events`}
          footer={
            <span>
              target <span className="text-emerald-700">{d.costPerCouplingEvent.target}</span>
            </span>
          }
        />
      </section>

      {/* Two-up: LLM by stage + acquisition by source */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              LLM cost by stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.llmByStage.map((b) => (
              <CostBar key={b.label} {...b} />
            ))}
            <Separator className="my-3" />
            <p className="text-[11px] text-muted-foreground">{d.llmByStageFooter}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Acquisition by source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.acquisitionBySource.map((b) => (
              <CostBar key={b.label} {...b} />
            ))}
            <Alert className="mt-3 border-amber-500/60 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-xs">{d.acquisitionFooter}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* Two-up: cost by event type + cost over time */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Cost by event type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.costByEventType.map((b) => (
              <CostBar key={b.label} {...b} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Cost over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-1 rounded-md border border-dashed border-border bg-muted/30 p-3">
              {[
                3.2, 3.4, 3.3, 3.5, 3.6, 3.4, 3.5, 3.8, 4.0, 4.2, 4.4, 5.6, 5.2, 5.4,
              ].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary/70"
                  style={{ height: `${(v / 5.6) * 100}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{d.costOverTimeNote}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px]">LLM</Badge>
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                acquisition
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                storage
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </RiskLensShell>
  );
};

function KpiCard({
  label,
  value,
  context,
  footer,
  valueTone = 'default',
}: {
  label: string;
  value: string;
  context: string;
  footer: React.ReactNode;
  valueTone?: 'default' | 'emerald' | 'destructive';
}) {
  const toneClass =
    valueTone === 'emerald'
      ? 'text-emerald-700'
      : valueTone === 'destructive'
      ? 'text-destructive'
      : 'text-foreground';
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold tabular-nums ${toneClass}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{context}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{footer}</p>
    </Card>
  );
}

export default RiskLensCostDashboard;
