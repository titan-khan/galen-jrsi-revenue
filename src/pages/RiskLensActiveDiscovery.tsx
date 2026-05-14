import { ArrowRight, X as XIcon, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DiscoveryNode } from '@/components/RiskLens/DiscoveryNode';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { ACTIVE_DISCOVERY } from '@/data/pipelineData';

const TONE_BORDER: Record<string, string> = {
  destructive: 'border-destructive/60',
  amber: 'border-amber-500/60',
  primary: 'border-primary/40',
  muted: 'border-border',
};

const TONE_PILL: Record<string, string> = {
  destructive: 'border-destructive/40 text-destructive',
  amber: 'border-amber-500/40 text-amber-700',
  emerald: 'border-emerald-500/40 text-emerald-700',
  primary: 'border-primary/40 text-primary',
  muted: 'border-border text-muted-foreground',
};

const RiskLensActiveDiscovery = () => {
  const d = ACTIVE_DISCOVERY;

  return (
    <RiskLensShell>
      <div className="p-6 space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active discovery
          </h2>
          <Badge variant="outline">
            {d.activeCount} active expansions · {d.baselineFactor}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            decay window: {d.decayWindow} · min strength: {d.minStrength}
          </span>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          How extracted entities expand subsequent queries. The mechanism that catches Jambi at
          month 6 instead of month 36. Initial query is deliberately broad; matches trigger entity
          extraction; new entities tighten subsequent queries; expansions decay without
          reinforcement.
        </p>
      </div>

      {/* Flow diagram */}
      <Card className="bg-muted/30">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {d.flow.map((step, i) => (
              <div key={step.label} className="flex items-center gap-4">
                <DiscoveryNode {...step} />
                {i < d.flow.length - 1 && (
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs italic text-primary">
            ↑ this is what month 6 looks like — broad → narrow → coupling
          </p>
        </CardContent>
      </Card>

      {/* Expansions + bounds */}
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active expansions · {d.activeCount}
          </h2>
          <div className="divide-y divide-border rounded-md border border-border">
            {d.expansions.map((e) => (
              <div key={e.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="flex-1 text-sm font-medium text-foreground">{e.title}</h3>
                  <Badge variant="outline" className={TONE_PILL[e.tone]}>
                    {e.hits}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{e.note}</span>
                  <span className="ml-auto">{e.decay}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{d.remainingNote}</p>
        </div>

        <aside className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Expansion bounds
          </h2>
          <Card>
            <CardContent className="space-y-3 p-4 text-xs">
              {d.bounds.map((b) => (
                <div key={b.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {b.label}
                  </span>
                  <span className="text-foreground">{b.value}</span>
                  {b.status ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        'gap-1',
                        TONE_PILL[b.status.tone],
                      )}
                    >
                      {b.status.tone === 'emerald' && <Check className="h-3 w-3" />}
                      {b.status.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent decays
          </h2>
          <Card>
            <CardContent className="space-y-2 p-4 text-xs">
              {d.recentDecays.map((r) => (
                <div key={r.label} className="flex items-start gap-1.5">
                  <XIcon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium text-foreground">{r.label}</span>
                    <span className="text-muted-foreground"> · {r.detail}</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
      </div>
    </RiskLensShell>
  );
};

export default RiskLensActiveDiscovery;
