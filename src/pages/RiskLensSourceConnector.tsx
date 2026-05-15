import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  AlertTriangle,
  Pause,
  FlaskConical,
  Settings,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { HealthDot } from '@/components/RiskLens/HealthDot';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { getConnector } from '@/data/pipelineData';

const RiskLensSourceConnector = () => {
  const { sourceId } = useParams<{ sourceId: string }>();
  const connector = getConnector(sourceId);

  if (!connector) {
    return <Navigate to="/research/risk-lens/pipeline" replace />;
  }

  const budgetPct = Math.round((connector.budget.spent / connector.budget.total) * 100);

  return (
    <RiskLensShell>
      <div className="border-b border-border px-6 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
            <Link to="/research/risk-lens/pipeline">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Sources
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{connector.name}</h2>
          <HealthDot status={connector.health} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() =>
                  toast.success('Test query queued', {
                    description: 'Results will surface in throughput within a minute.',
                  })
                }
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                Test query
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.message('Connector paused', {
                    description: 'No new signals until resumed.',
                  })
                }
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.message('Edit config — coming soon', {
                    description: 'Adapter, query template, cadence.',
                  })
                }
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit config
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_400px] gap-0 min-h-0">
        {/* Left: query construction */}
        <section className="space-y-4 overflow-auto border-b lg:border-b-0 lg:border-r border-dashed border-border px-6 py-5">
          <Card className="bg-muted/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Constructed query · auto-generated</CardTitle>
              <span className="text-[10px] text-muted-foreground">rebuilt 12m ago</span>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {connector.query.map((q) => (
                <div key={q.label} className="grid grid-cols-[110px_1fr] gap-3 text-xs">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground pt-0.5">
                    {q.label}
                  </span>
                  <code className="font-mono text-xs text-foreground break-words">{q.value}</code>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Built from tenantConfig</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">type · {connector.type}</Badge>
                <Badge variant="outline">adapter · {connector.adapter}</Badge>
                <Badge
                  variant="outline"
                  className={
                    connector.tier === 'expensive'
                      ? 'border-destructive/40 text-destructive'
                      : connector.tier === 'medium'
                      ? 'border-amber-500/40 text-amber-700'
                      : 'border-emerald-500/40 text-emerald-700'
                  }
                >
                  tier · {connector.tier}
                </Badge>
                <Badge variant="outline">credibility · {connector.credibility.toFixed(2)}</Badge>
              </div>
              <div className="space-y-1.5 border-t border-dashed border-border pt-2.5">
                <Row dot="primary">
                  watchlist entities · <b>{connector.builtFrom.watchlistEntities}</b>
                </Row>
                <Row dot="primary">
                  event types · <b>{connector.builtFrom.eventTypes.split(',').length}</b> (
                  {connector.builtFrom.eventTypes})
                </Row>
                <Row dot="primary">
                  amplifier model · <b>{connector.builtFrom.amplifierEntities}</b> entities
                </Row>
                <div className="flex items-start gap-2 pt-1.5 text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="text-foreground">
                    {connector.builtFrom.activeDiscoveryNote} —{' '}
                    <Link
                      to="/research/risk-lens/pipeline/discovery"
                      className="text-primary hover:underline"
                    >
                      view expansions
                    </Link>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cadence &amp; backpressure</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-6">
              <Stat label="polling" value={connector.cadence.polling} />
              <Stat label="last fetch" value={connector.cadence.lastFetch} />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  backpressure
                </div>
                <Badge variant="outline" className="mt-1 border-emerald-500/60 text-emerald-700">
                  {connector.cadence.backpressure}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Right: budget + throughput + failures */}
        <aside className="space-y-4 overflow-auto px-6 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Monthly budget
          </div>
          <Card className="p-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">
                ${connector.budget.spent.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                of ${connector.budget.total.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-border bg-background">
              <div
                className={cn(
                  'h-full',
                  budgetPct >= 90 ? 'bg-destructive/70' : budgetPct >= 60 ? 'bg-amber-500/70' : 'bg-emerald-500/70',
                )}
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {budgetPct}% spent · {connector.budget.daysRemaining} days remaining · projected $
              {connector.budget.projected.toLocaleString()}
            </p>
            {connector.budget.overshoot > 0 && (
              <Alert className="mt-3 border-amber-500/60 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <AlertDescription className="text-xs">
                  Will overshoot ~${connector.budget.overshoot}. Suggest narrowing geo to ID-JK,ID-JB.
                </AlertDescription>
              </Alert>
            )}
          </Card>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Throughput · 24h
          </div>
          <Card className="p-4">
            <div className="flex h-20 items-end gap-1 rounded-md border border-dashed border-border bg-muted/30 p-2">
              {[3, 3, 4, 3.6, 3.7, 3.5, 3.8, 4.2, 4.5, 4.6, 5.8, 4.4, 3.8, 3.6, 3.6, 3.7, 3.5].map(
                (v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-primary/70"
                    style={{ height: `${(v / 5.8) * 100}%` }}
                  />
                ),
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{connector.throughputNote}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {connector.throughputStats.map((s) => (
                <span key={s.label}>
                  <b className="text-foreground">{s.value}</b> {s.label}
                </span>
              ))}
            </div>
          </Card>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent failures
          </div>
          <Card className="p-4">
            <ul className="space-y-1.5 text-[11px]">
              {connector.recentFailures.map((f) => (
                <li key={f.time} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                  <span>
                    <b className="text-foreground">{f.time}</b> · {f.detail}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">{connector.errorTolerance}</p>
          </Card>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Compliance · UU PDP 27/2022
          </div>
          <Card className="p-4">
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">data_residency</dt>
                <dd>
                  <Badge
                    variant="outline"
                    className={
                      connector.dataResidency === 'ID'
                        ? 'border-emerald-500/50 text-emerald-700 bg-emerald-500/5 font-mono'
                        : connector.dataResidency === 'SG'
                        ? 'border-amber-500/50 text-amber-700 bg-amber-500/5 font-mono'
                        : 'border-destructive/50 text-destructive bg-destructive/5 font-mono'
                    }
                  >
                    {connector.dataResidency}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">retention</dt>
                <dd className="font-semibold text-foreground">
                  {connector.retentionDays} hari
                </dd>
              </div>
              <div className="border-t border-dashed border-border pt-2">
                <dt className="mb-0.5 text-muted-foreground">lawful_basis</dt>
                <dd className="text-foreground/85">{connector.lawfulBasis}</dd>
              </div>
            </dl>
            <a
              href="/research/methodology#data-residency"
              className="mt-2 inline-block text-[11px] text-primary hover:underline"
            >
              buka metodologi →
            </a>
          </Card>
        </aside>
      </div>
    </RiskLensShell>
  );
};

function Row({ dot, children }: { dot: 'primary' | 'amber'; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <span
        className={cn(
          'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
          dot === 'primary' ? 'bg-primary' : 'bg-amber-500',
        )}
      />
      <span>{children}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default RiskLensSourceConnector;
