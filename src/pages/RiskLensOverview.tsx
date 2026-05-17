import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Lightbulb,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  Pin,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { SeverityBadge } from '@/components/RiskLens/SeverityBadge';
import {
  RISK_EVENTS,
  MED_STUB_EVENTS,
  WORKLIST_STATS,
  SENTIMENT_BREAKDOWN,
} from '@/data/riskLensData';

// Severity bands for composite index 0–100
function bandFor(score: number): {
  tone: 'destructive' | 'amber' | 'emerald' | 'muted';
  label: string;
  caption: string;
} {
  if (score >= 70)
    return {
      tone: 'destructive',
      label: 'TINGGI',
      caption: 'perlu triase prioritas',
    };
  if (score >= 40)
    return { tone: 'amber', label: 'MENENGAH', caption: 'pantau · jadwalkan review' };
  if (score >= 15)
    return { tone: 'emerald', label: 'RENDAH', caption: 'situasi stabil' };
  return { tone: 'muted', label: 'TENANG', caption: 'tidak ada sinyal kritis' };
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  claim_processing_delay: 'Penundaan pencairan klaim',
  mass_casualty_event: 'Kecelakaan massal',
  claim_denial_dispute: 'Sengketa penolakan klaim',
  regulatory_query: 'Inquiry regulator',
  fraud_indicator_pattern: 'Indikasi fraud',
};

// Faux 7-day trajectory ending at the current composite — last value matches the live score
function sparklineFor(current: number): number[] {
  return [42, 51, 48, 60, 68, 72, current];
}

const RiskLensOverview = () => {
  // ============================
  // Derived metrics
  // ============================
  const { composite, band, severityDist, themes, sourceMix, deltaPct } = useMemo(() => {
    const highCount = WORKLIST_STATS.high;
    const medCount = WORKLIST_STATS.medium;
    const lowCount = WORKLIST_STATS.low;
    const total = highCount + medCount + lowCount;

    // Composite = mean of top 5 priority scores × 100
    const topN = [
      ...RISK_EVENTS.map((e) => e.priorityScore),
      ...MED_STUB_EVENTS.map((e) => e.priorityScore),
    ]
      .sort((a, b) => b - a)
      .slice(0, 5);
    const compositeRaw = topN.reduce((a, b) => a + b, 0) / Math.max(topN.length, 1);
    const composite = Math.round(compositeRaw * 100);
    const band = bandFor(composite);

    const severityDist = [
      {
        level: 'HIGH' as const,
        count: highCount,
        pct: total ? Math.round((highCount / total) * 100) : 0,
      },
      {
        level: 'MED' as const,
        count: medCount,
        pct: total ? Math.round((medCount / total) * 100) : 0,
      },
      {
        level: 'LOW' as const,
        count: lowCount,
        pct: total ? Math.round((lowCount / total) * 100) : 0,
      },
    ];

    const themeCounts = new Map<string, number>();
    RISK_EVENTS.forEach((e) => {
      themeCounts.set(e.eventType, (themeCounts.get(e.eventType) ?? 0) + 1);
    });
    const themeTotal = Array.from(themeCounts.values()).reduce((a, b) => a + b, 0);
    const themes = Array.from(themeCounts.entries())
      .map(([key, count]) => ({
        key,
        label: EVENT_TYPE_LABEL[key] ?? key,
        count,
        pct: themeTotal ? Math.round((count / themeTotal) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const sourceCounts = new Map<string, number>();
    RISK_EVENTS.forEach((e) =>
      e.provenance.forEach((p) =>
        sourceCounts.set(p.source, (sourceCounts.get(p.source) ?? 0) + 1),
      ),
    );
    const sourceMixTotal = Array.from(sourceCounts.values()).reduce((a, b) => a + b, 0);
    const sourceMix = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({
        source,
        count,
        pct: sourceMixTotal ? (count / sourceMixTotal) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      composite,
      band,
      severityDist,
      themes,
      sourceMix,
      deltaPct: 12,
    };
  }, []);

  const topEvent = [...RISK_EVENTS].sort((a, b) => b.priorityScore - a.priorityScore)[0];
  const spark = sparklineFor(composite);
  const sparkMax = Math.max(...spark);
  const s = SENTIMENT_BREAKDOWN;

  return (
    <RiskLensShell>
      <div className="mx-auto w-full max-w-5xl space-y-5 p-6">
        {/* ============ HERO — Risk pulse ============ */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Risiko reputasi · indeks komposit
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span
                    className={cn(
                      'font-mono text-5xl font-bold tabular-nums leading-none',
                      band.tone === 'destructive' && 'text-red-600',
                      band.tone === 'amber' && 'text-amber-700',
                      band.tone === 'emerald' && 'text-emerald-700',
                      band.tone === 'muted' && 'text-foreground',
                    )}
                  >
                    {composite}
                  </span>
                  <span className="text-base text-muted-foreground">/ 100</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold',
                      band.tone === 'destructive' &&
                        'border-red-500/60 bg-red-500/15 text-red-700',
                      band.tone === 'amber' &&
                        'border-amber-500/60 bg-amber-500/15 text-amber-700',
                      band.tone === 'emerald' &&
                        'border-emerald-500/60 bg-emerald-500/15 text-emerald-700',
                      band.tone === 'muted' &&
                        'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {band.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{band.caption}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  7 hari terakhir
                </div>
                <svg
                  viewBox="0 0 140 36"
                  className="h-10 w-[140px]"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={cn(
                      band.tone === 'destructive' && 'text-red-500',
                      band.tone === 'amber' && 'text-amber-500',
                      band.tone === 'emerald' && 'text-emerald-500',
                      band.tone === 'muted' && 'text-muted-foreground',
                    )}
                    points={spark
                      .map(
                        (v, i) =>
                          `${(i / (spark.length - 1)) * 140},${34 - (v / sparkMax) * 32}`,
                      )
                      .join(' ')}
                  />
                </svg>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold',
                    deltaPct > 0 ? 'text-red-600' : 'text-emerald-700',
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {deltaPct > 0 ? '↑' : '↓'} {Math.abs(deltaPct)}% vs minggu lalu
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ SENTIMEN BERITA ============ */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                💬 Sentimen berita online · {s.windowLabel}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                N = {s.sampleSize} artikel ter-coupling
              </span>
            </div>

            {/* Hero — dominant sentiment */}
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-4xl font-bold tabular-nums leading-none text-amber-600">
                {s.netral}%
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Sentimen netral</div>
                <p className="text-xs text-muted-foreground">{s.dominantCaption}</p>
              </div>
            </div>

            {/* 3 sentiment bars */}
            <div className="space-y-2.5">
              <SentimentBar
                tone="positif"
                icon={<Smile className="h-3.5 w-3.5 text-emerald-600" />}
                label="Positif"
                pct={s.positif}
              />
              <SentimentBar
                tone="netral"
                icon={<Meh className="h-3.5 w-3.5 text-amber-600" />}
                label="Netral"
                pct={s.netral}
              />
              <SentimentBar
                tone="negatif"
                icon={<Frown className="h-3.5 w-3.5 text-red-600" />}
                label="Negatif"
                pct={s.negatif}
              />
            </div>

            {/* Negative themes */}
            <div className="border-t border-dashed border-border pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Pin className="h-3.5 w-3.5" />
                Tema negatif dominan
              </div>
              <ul className="space-y-1.5">
                {s.negativeThemes.map((t) => (
                  <li
                    key={t.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-foreground/90">{t.label}</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-red-600">
                      {t.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* ============ DISTRIBUSI + TEMA EVENT ============ */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Severity distribution */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Distribusi severity event
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {WORKLIST_STATS.open} terbuka
                </span>
              </div>
              <div className="space-y-2.5">
                {severityDist.map((sev) => (
                  <div key={sev.level} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <SeverityBadge level={sev.level} />
                      <span className="ml-auto font-mono text-sm font-semibold tabular-nums">
                        {sev.count}
                      </span>
                      <span className="w-10 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {sev.pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full transition-all',
                          sev.level === 'HIGH' && 'bg-red-500',
                          sev.level === 'MED' && 'bg-amber-500',
                          sev.level === 'LOW' && 'bg-emerald-500',
                        )}
                        style={{ width: `${Math.max(sev.pct, sev.count === 0 ? 0 : 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top themes (event types) */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tema event HIGH
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {RISK_EVENTS.length} event
                </span>
              </div>
              <ul className="space-y-2">
                {themes.map((t) => (
                  <li key={t.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-foreground">{t.label}</span>
                      <span className="flex items-baseline gap-1">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {t.count}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          · {t.pct}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary/70"
                        style={{ width: `${Math.max(t.pct, 4)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* ============ INSIGHT ============ */}
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Lightbulb className="h-3.5 w-3.5" />
              Insight risiko reputasi
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              Meski sentimen keseluruhan{' '}
              <span className="font-semibold text-amber-700">
                {s.netral}% netral
              </span>{' '}
              (berita informatif/prosedural), sentimen negatif (
              <span className="font-semibold text-red-600">{s.negatif}%</span>) terkonsentrasi
              pada isu <span className="font-semibold text-foreground">keterlambatan &amp;
              penolakan klaim</span>. Risiko aktif di{' '}
              <span className="font-semibold text-foreground">Jambi</span> (priority{' '}
              {topEvent.priorityScore.toFixed(2)} · @LBHJakarta aktif) dan{' '}
              <span className="font-semibold text-foreground">Bekasi</span> (kecelakaan massal,
              DPR Komisi V inquiry). Rekomendasi: prioritaskan event Jambi untuk tindakan
              preventif sebelum eskalasi viral.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm">
                <Link to={`/research/risk-lens/${topEvent.id}`}>
                  Buka event prioritas
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/research/risk-lens/worklist">
                  Lihat {WORKLIST_STATS.open} event di worklist
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ============ SOURCE MIX ============ */}
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sumber sinyal · 7 hari
              </h2>
              <span className="text-[11px] text-muted-foreground">
                top {sourceMix.length} dari {sourceMix.reduce((a, b) => a + b.count, 0)} mention
                ter-coupling
              </span>
            </div>
            <ul className="space-y-1.5">
              {sourceMix.map((src) => (
                <li
                  key={src.source}
                  className="grid grid-cols-[120px_1fr_36px] items-center gap-3"
                >
                  <span className="truncate text-xs font-medium text-foreground">
                    {src.source}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary/60" style={{ width: `${src.pct}%` }} />
                  </div>
                  <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {src.count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </RiskLensShell>
  );
};

function SentimentBar({
  tone,
  icon,
  label,
  pct,
}: {
  tone: 'positif' | 'netral' | 'negatif';
  icon: React.ReactNode;
  label: string;
  pct: number;
}) {
  const barColor =
    tone === 'positif'
      ? 'bg-emerald-500'
      : tone === 'netral'
      ? 'bg-amber-500'
      : 'bg-red-500';
  const pctColor =
    tone === 'positif'
      ? 'text-emerald-700'
      : tone === 'netral'
      ? 'text-amber-700'
      : 'text-red-600';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs">
        {icon}
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('ml-auto font-mono text-sm font-bold tabular-nums', pctColor)}>
          {pct}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', barColor)}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default RiskLensOverview;
