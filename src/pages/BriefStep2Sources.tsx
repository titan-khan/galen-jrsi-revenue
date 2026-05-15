import { useMemo, useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { WizardStepHeader } from '@/components/RiskLens/WizardStepHeader';
import { SourceCandidateRow } from '@/components/RiskLens/SourceCandidateRow';
import { SOURCE_CANDIDATES, BUNDLE_SUMMARY } from '@/data/briefData';

const CATEGORY_LABEL = {
  social: 'Social & user-generated',
  news: 'News & editorial',
  regulatory: 'Regulatory & official',
} as const;

const PRESETS = ['recommended', 'budget', 'free-only', 'custom'] as const;

const BriefStep2Sources = () => {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>('recommended');

  const grouped = useMemo(() => {
    return (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((cat) => ({
      key: cat,
      label: CATEGORY_LABEL[cat],
      sources: SOURCE_CANDIDATES.filter((s) => s.category === cat),
    }));
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WizardStepHeader
        step={2}
        title="Sumber data mana yang ditarik?"
        backHref="/research/monitor/new"
        backLabel="Brief"
        nextHref="/research/monitor/new/readiness"
      />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_360px] gap-0 min-h-0">
        <section className="space-y-4 overflow-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="max-w-xl text-sm text-muted-foreground">
              Ranked by how well each source matches your brief. Toggle the ones you want; we estimate
              cost & coverage live.
            </p>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs',
                    p === preset
                      ? 'border-foreground bg-muted text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p === preset ? `${p} preset` : p}
                </button>
              ))}
            </div>
          </div>

          {grouped.map((g) => (
            <div key={g.key} className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h2>
              {g.sources.map((s) => (
                <SourceCandidateRow key={s.id} source={s} />
              ))}
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] italic text-muted-foreground">
              ↑ free sources are credible but narrow · pair w/ social for momentum signal
            </p>
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
            >
              + request a new source
            </button>
          </div>
        </section>

        <aside className="space-y-4 overflow-auto border-t lg:border-t-0 lg:border-l border-dashed border-border bg-muted/30 px-5 py-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your bundle · {SOURCE_CANDIDATES.filter((s) => s.on).length} sources on
          </h2>

          <Card className="p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Est. monthly spend
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">{BUNDLE_SUMMARY.totalSpendLabel}</span>
              <span className="text-xs text-muted-foreground">of {BUNDLE_SUMMARY.budgetLabel} budget</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-border bg-background">
              <div className="h-full bg-primary/70" style={{ width: `${BUNDLE_SUMMARY.spendPct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {BUNDLE_SUMMARY.spendPct}% of budget · headroom for active discovery
            </p>
          </Card>

          <Card className="p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Brief coverage
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums text-emerald-700">
                {BUNDLE_SUMMARY.briefCoverage}%
              </span>
              <span className="text-xs text-muted-foreground">of event types covered</span>
            </div>
            <ul className="mt-2.5 space-y-1 text-xs">
              {BUNDLE_SUMMARY.coverageBreakdown.map((c) => {
                const Icon = c.tone === 'emerald' ? Check : AlertTriangle;
                return (
                  <li key={c.label} className="flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        'h-3 w-3',
                        c.tone === 'emerald' ? 'text-emerald-600' : 'text-amber-600',
                      )}
                    />
                    <span>
                      {c.label} · {c.value}%
                      {c.note && <span className="text-muted-foreground"> · {c.note}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Alert className="mt-3 border-amber-500/60 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-xs">
                {BUNDLE_SUMMARY.bindingCallout}
              </AlertDescription>
            </Alert>
          </Card>

          <Card className="p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Expected throughput
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {BUNDLE_SUMMARY.throughput.map((t) => (
                <li key={t.label} className="flex justify-between">
                  <span>{t.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-semibold',
                      t.tone === 'emerald' && 'border-emerald-500/60 text-emerald-700',
                    )}
                  >
                    {t.value}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>

          <p className="text-[11px] italic text-muted-foreground">
            ↑ this is the budget conversation w/ your manager · save preset to share
          </p>
        </aside>
      </div>
    </div>
  );
};

export default BriefStep2Sources;
