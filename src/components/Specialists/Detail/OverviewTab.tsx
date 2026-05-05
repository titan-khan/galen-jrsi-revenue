import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, BarChart3, Loader2, RotateCw, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getNorthStarMetrics } from '@/data/transportXSpecialists';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { useMetrics } from '@/contexts/MetricsContext';
import { cn } from '@/lib/utils';
import type { SpecialistInsight, SpecialistRecommendation } from '@/types/specialist';
import type { MetricConfig } from '@/types/specialist';
import type { ExecutiveSummaryData, RootCauseItem } from '@/services/specialistRunService';

// ─── Props ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  specialistId: string;
  executiveSummary: ExecutiveSummaryData | null;
  rootCauses: RootCauseItem[];
  recommendations: SpecialistRecommendation[];
  insights: SpecialistInsight[];
  isLoading: boolean;
  isRunning?: boolean;
  hasAnyInsights?: boolean;
  onNavigateToInsights?: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────

type IssueType = 'RECURRING' | 'SYSTEMIC' | 'TEMPORARY';

function deriveIssueType(rootCause: RootCauseItem, insights: SpecialistInsight[]): IssueType {
  const linked = insights.filter(
    (i) => i.rootCauseRanks?.includes(rootCause.rank),
  );
  const types = linked.map((i) => i.type);
  if (types.includes('pattern') || types.includes('trend')) return 'SYSTEMIC';
  if (types.every((t) => t === 'anomaly') && linked.length <= 1) return 'TEMPORARY';
  return 'RECURRING';
}

const ISSUE_TYPE_STYLE: Record<IssueType, string> = {
  RECURRING: 'text-amber-600 bg-amber-500/8 border-transparent',
  SYSTEMIC: 'text-red-600 bg-red-500/8 border-transparent',
  TEMPORARY: 'text-muted-foreground bg-muted/60 border-transparent',
};

const SEVERITY_BANNER: Record<string, { border: string; bg: string; icon: string }> = {
  critical: { border: 'border-red-200 dark:border-red-900/40', bg: 'bg-red-50 dark:bg-red-950/20', icon: 'text-red-600' },
  high: { border: 'border-amber-200 dark:border-amber-900/40', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: 'text-amber-600' },
  medium: { border: 'border-blue-200 dark:border-blue-900/40', bg: 'bg-blue-50 dark:bg-blue-950/20', icon: 'text-blue-600' },
  low: { border: 'border-border', bg: 'bg-muted/30', icon: 'text-muted-foreground' },
};

const DOMAIN_OWNERS: Record<string, Record<string, string>> = {
  'supply-chain': { tactical: 'Fleet Mgr', strategic: 'VP Ops' },
  commercial: { tactical: 'Revenue Mgr', strategic: 'VP Commercial' },
  customer: { tactical: 'CX Lead', strategic: 'VP Customer' },
  finance: { tactical: 'Finance Mgr', strategic: 'CFO' },
};

function getOwner(rec: SpecialistRecommendation, domain?: string): string {
  const scope = rec.actionScope || 'tactical';
  if (domain && DOMAIN_OWNERS[domain]) {
    return DOMAIN_OWNERS[domain][scope] || 'Ops';
  }
  return scope === 'strategic' ? 'Management' : 'Ops';
}

function getDeadlineBadge(deadline?: string): { label: string; className: string } {
  if (!deadline) return { label: 'This week', className: 'text-muted-foreground bg-muted/50 border-transparent' };
  const lower = deadline.toLowerCase();
  if (lower === 'immediate' || lower === 'today') {
    return { label: 'Today', className: 'text-red-600 bg-red-500/8 border-transparent' };
  }
  if (lower.includes('week') || lower === 'this_week') {
    return { label: 'This week', className: 'text-amber-600 bg-amber-500/8 border-transparent' };
  }
  try {
    const d = new Date(deadline);
    if (!isNaN(d.getTime())) {
      const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return { label: 'Today', className: 'text-red-600 bg-red-500/8 border-transparent' };
      if (diffDays <= 7) return { label: 'This week', className: 'text-amber-600 bg-amber-500/8 border-transparent' };
      return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: 'text-muted-foreground bg-muted/50 border-transparent' };
    }
  } catch { /* ignore */ }
  return { label: deadline, className: 'text-muted-foreground bg-muted/50 border-transparent' };
}

/** Parse **bold** markers in text into <strong> elements */
function renderBoldText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * Extract first N sentences. Splits on ". " boundaries but ignores periods that
 * are part of common Indonesian/English abbreviations (Kab., Kota., No., etc.) —
 * otherwise the splitter would cut a sentence mid-phrase at "Kab." and similar.
 */
function extractSentences(text: string, max = 2): string {
  const ID_ABBREV = /\b(Kab|Kota|Kec|Prov|Kel|Jl|No|Drs|Drg|Ir|Yth|St|Tn|Ny|Sdr|Dll|Dsb|Tsb|a\.l|a\.n|d\.a|u\.b|u\.p)$/i;

  const rawChunks = text.trim().split(/\.\s+/);
  const sentences: string[] = [];
  let buffer = '';

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const isLast = i === rawChunks.length - 1;
    // buffer already ends in "." (abbreviation period), so join with a single space
    const piece = (buffer ? buffer + ' ' : '') + chunk + (isLast ? '' : '.');

    // If the chunk ends in a known abbreviation, the period was an abbreviation
    // mark — not a sentence boundary. Buffer it and merge with the next chunk.
    if (!isLast && ID_ABBREV.test(chunk)) {
      buffer = piece;
      continue;
    }

    sentences.push(piece);
    buffer = '';
    if (sentences.length >= max) break;
  }

  return sentences.join(' ').trim();
}

// ─── Resolved Metrics Hook (same as before — specialist-aligned) ──────

interface ResolvedMetric {
  label: string;
  value: string;
  trend: number;
  changeLabel: string;
  comparisonLabel: string; // e.g. "vs Dec 2025"
  hasData: boolean;
  direction: 'up_is_good' | 'down_is_good' | 'neutral';
}

function useResolvedMetrics(specialistId: string): ResolvedMetric[] {
  const { getSpecialistById } = useSpecialists();
  const { metrics: allSystemMetrics } = useMetrics();
  const specialist = getSpecialistById(specialistId);

  return useMemo(() => {
    // Legacy hardcoded specialists
    const legacyData = getNorthStarMetrics(specialistId);
    if (legacyData.northStar.length > 0) {
      return legacyData.northStar.map((m) => ({
        label: m.label,
        value: m.value,
        trend: m.trend,
        changeLabel: `${m.trend > 0 ? '+' : ''}${m.trend}${m.unit ? ` ${m.unit}` : '%'}`,
        comparisonLabel: m.trendLabel || 'vs prev period',
        hasData: true,
        direction: (m as { direction?: string }).direction as ResolvedMetric['direction'] || 'up_is_good',
      }));
    }

    // Dynamic (user-created) specialists — use their configured metrics[]
    if (!specialist) return [];
    const specialistMetrics = specialist.metrics || [];
    if (specialistMetrics.length === 0) return [];

    return specialistMetrics.slice(0, 6).map((mc: MetricConfig) => {
      let systemMetric = allSystemMetrics.find(
        (sm) => sm.id === mc.id || sm.id === `metric-${mc.id}`,
      );
      if (!systemMetric) {
        systemMetric = allSystemMetrics.find(
          (sm) => sm.name.toLowerCase() === mc.name.toLowerCase(),
        );
      }

      if (systemMetric && systemMetric.displayData.currentValue !== '—') {
        const pct = systemMetric.displayData.changePercent;
        return {
          label: systemMetric.name,
          value: systemMetric.displayData.currentValue,
          trend: pct,
          changeLabel: `${pct > 0 ? '+' : ''}${pct}%`,
          comparisonLabel: systemMetric.displayData.comparisonLabel || '',
          hasData: true,
          direction: systemMetric.direction || 'up_is_good',
        };
      }

      return {
        label: mc.name,
        value: '—',
        trend: 0,
        changeLabel: '',
        comparisonLabel: '',
        hasData: false,
        direction: 'up_is_good' as const,
      };
    });
  }, [specialistId, specialist, allSystemMetrics]);
}

// ─── Sub-components ────────────────────────────────────────────────────

function BottomLineBanner({ executiveSummary }: { executiveSummary: ExecutiveSummaryData }) {
  const style = SEVERITY_BANNER[executiveSummary.severity] || SEVERITY_BANNER.medium;

  // Build bullet points: headline is first, keyFinding (truncated to 1-2 sentences) is second
  const bullets: string[] = [];
  if (executiveSummary.headline) bullets.push(executiveSummary.headline);
  if (executiveSummary.keyFinding) {
    bullets.push(extractSentences(executiveSummary.keyFinding, 2));
  }

  return (
    <div className={cn('rounded-lg border p-3 flex items-start gap-2.5', style.border, style.bg)}>
      <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-1', style.icon)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
          Inti Temuan
        </p>
        <ul className="space-y-1">
          {bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-foreground leading-snug">
              <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-40" />
              <span>{renderBoldText(bullet)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KeyMetricsRow({ metrics }: { metrics: ResolvedMetric[] }) {
  if (metrics.length === 0) return null;

  // Use static Tailwind classes (dynamic string concat won't work with JIT)
  const cols =
    metrics.length <= 3 ? 'grid-cols-3' :
    metrics.length <= 4 ? 'grid-cols-4' :
    metrics.length <= 5 ? 'grid-cols-3 lg:grid-cols-5' :
    'grid-cols-3 lg:grid-cols-6';

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
        Metrik Utama
      </h3>
      <div className={cn('grid gap-3', cols)}>
        {metrics.map((metric, idx) => {
          // Direction-aware color: for "down_is_good" metrics (e.g. Return Rate),
          // going UP is bad (red) and going DOWN is good (green).
          const isGood = metric.direction === 'neutral'
            ? false
            : metric.direction === 'down_is_good'
              ? metric.trend < 0
              : metric.trend > 0;
          const isBad = metric.direction === 'neutral'
            ? false
            : metric.direction === 'down_is_good'
              ? metric.trend > 0
              : metric.trend < 0;

          return (
            <div
              key={idx}
              className={cn(
                'rounded-lg border bg-card p-3 text-center',
                metric.hasData ? 'border-border' : 'border-dashed border-border/60',
              )}
            >
              <p className="text-sm text-muted-foreground/70 mb-1 truncate">{metric.label}</p>
              <p className={cn(
                'text-lg font-bold tracking-tight',
                metric.hasData ? 'text-foreground' : 'text-muted-foreground/30',
              )}>
                {metric.value}
              </p>
              {metric.hasData && metric.changeLabel && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span
                    className={cn(
                      'inline-block text-sm font-medium rounded-full px-2 py-0.5',
                      isGood && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                      isBad && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                      !isGood && !isBad && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {metric.changeLabel}
                  </span>
                  {metric.comparisonLabel && (
                    <span className="text-xs text-muted-foreground/50">{metric.comparisonLabel}</span>
                  )}
                </div>
              )}
              {!metric.hasData && (
                <p className="text-xs text-muted-foreground/40 mt-1">Awaiting data</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopIssuesTable({
  rootCauses,
  insights,
  onNavigateToInsights,
}: {
  rootCauses: RootCauseItem[];
  insights: SpecialistInsight[];
  onNavigateToInsights?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 3;

  const sorted = useMemo(
    () =>
      [...rootCauses].sort((a, b) => b.contributionPct - a.contributionPct),
    [rootCauses],
  );

  const visible = showAll ? sorted : sorted.slice(0, INITIAL_COUNT);
  const hiddenCount = sorted.length - INITIAL_COUNT;

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
        Top Issues (by impact)
      </h3>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead className="text-sm font-medium h-9 w-8 text-muted-foreground/60">#</TableHead>
              <TableHead className="text-sm font-medium h-9 text-muted-foreground/60">Issue</TableHead>
              <TableHead className="text-sm font-medium h-9 w-20 text-right text-muted-foreground/60">Impact</TableHead>
              <TableHead className="text-sm font-medium h-9 w-28 text-center text-muted-foreground/60">Type</TableHead>
              <TableHead className="text-sm font-medium h-9 w-14 text-right text-muted-foreground/60">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((rc) => {
              const issueType = deriveIssueType(rc, insights);
              return (
                <TableRow key={rc.rank} className="hover:bg-muted/20 border-border/40">
                  <TableCell className="text-xs text-muted-foreground/60 py-2.5 font-medium">
                    {rc.rank}
                  </TableCell>
                  <TableCell className="text-xs text-foreground/80 py-2.5 font-medium">
                    {rc.cause}
                  </TableCell>
                  <TableCell className="text-xs text-right py-2.5 font-semibold text-foreground">
                    {rc.contributionPct}%
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-semibold h-5 px-2', ISSUE_TYPE_STYLE[issueType])}
                    >
                      {issueType}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <button
                      onClick={onNavigateToInsights}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      →RC{rc.rank}
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/20 transition-colors border-t border-border/40"
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', showAll && 'rotate-180')} />
            {showAll ? 'Lihat lebih sedikit' : `Lihat ${hiddenCount} lainnya`}
          </button>
        )}
      </div>
    </div>
  );
}

function ImmediateActions({
  recommendations,
  domain,
}: {
  recommendations: SpecialistRecommendation[];
  domain?: string;
}) {
  const EFFORT_PRIORITY: Record<string, number> = { low: 0, medium: 1, high: 2 };
  const INITIAL_COUNT = 3;
  const [showAll, setShowAll] = useState(false);

  const allActions = useMemo(
    () =>
      [...recommendations]
        .filter((r) => r.status === 'proposed')
        .sort((a, b) => {
          const ae = EFFORT_PRIORITY[a.effort || 'medium'] ?? 1;
          const be = EFFORT_PRIORITY[b.effort || 'medium'] ?? 1;
          return ae - be;
        }),
    [recommendations],
  );

  const visible = showAll ? allActions : allActions.slice(0, INITIAL_COUNT);
  const hiddenCount = allActions.length - INITIAL_COUNT;

  if (allActions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
        Tindakan Segera
      </h3>
      <div className="rounded-lg border border-border bg-card divide-y divide-border/40">
        {visible.map((action) => {
          const deadline = getDeadlineBadge(action.deadline);
          const owner = getOwner(action, domain);

          return (
            <div key={action.id} className="flex items-start gap-3 px-3 py-2.5">
              {/* Checkbox visual */}
              <div className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border bg-background" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground leading-snug">{action.title}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Penanggung jawab: {owner}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn('text-xs font-medium h-5 px-2 shrink-0', deadline.className)}
              >
                {deadline.label}
              </Badge>
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/20 transition-colors"
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', showAll && 'rotate-180')} />
            {showAll ? 'Lihat lebih sedikit' : `Lihat ${hiddenCount} lainnya`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function OverviewTab({
  specialistId,
  executiveSummary,
  rootCauses,
  recommendations,
  insights,
  isLoading,
  isRunning,
  hasAnyInsights,
  onNavigateToInsights,
}: OverviewTabProps) {
  const { getSpecialistById } = useSpecialists();
  const specialist = getSpecialistById(specialistId);
  const resolvedMetrics = useResolvedMetrics(specialistId);

  const hasAnalysisData = !!executiveSummary || rootCauses.length > 0 || recommendations.length > 0;

  // ── Loading skeleton ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-5 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card p-3 animate-pulse">
          <div className="h-3 bg-muted rounded w-1/4 mb-3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-muted rounded w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  // ── Running state (no data yet) ──────────────────────────────────
  if (isRunning && !hasAnyInsights) {
    return (
      <div className="space-y-4">
        {/* Show metrics while running */}
        {resolvedMetrics.length > 0 && <KeyMetricsRow metrics={resolvedMetrics} />}

        <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <Loader2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5 animate-spin" />
          <div className="text-xs text-blue-700 dark:text-blue-400">
            <p className="font-medium mb-0.5">Generating executive summary</p>
            <p className="text-blue-600/80 dark:text-blue-400/70">
              Analyzing data and generating insights. This usually takes 30-60 seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state (no analysis, not running) ───────────────────────
  if (!hasAnalysisData && !isRunning) {
    return (
      <div className="space-y-4">
        {/* Show metrics even without analysis */}
        {resolvedMetrics.length > 0 && <KeyMetricsRow metrics={resolvedMetrics} />}

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground/60">No analysis available yet</p>
          <p className="text-xs text-muted-foreground/40 mt-1 max-w-xs">
            Run the specialist to generate an executive summary with key issues and recommended actions.
          </p>
        </div>
      </div>
    );
  }

  // ── Executive Summary Layout ─────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Section 1: Bottom Line */}
      {executiveSummary && (
        <div data-section-id="overview-bottom-line">
          <BottomLineBanner executiveSummary={executiveSummary} />
        </div>
      )}

      {/* Section 2: Key Metrics (from specialist config) */}
      {resolvedMetrics.length > 0 && (
        <div data-section-id="overview-key-metrics">
          <KeyMetricsRow metrics={resolvedMetrics} />
        </div>
      )}

      {/* Section 3: Top Issues */}
      {rootCauses.length > 0 && (
        <div data-section-id="overview-top-issues">
          <TopIssuesTable
            rootCauses={rootCauses}
            insights={insights}
            onNavigateToInsights={onNavigateToInsights}
          />
        </div>
      )}

      {/* Section 4: Immediate Actions */}
      {recommendations.length > 0 && (
        <div data-section-id="overview-actions">
          <ImmediateActions
            recommendations={recommendations}
            domain={specialist?.domain}
          />
        </div>
      )}
    </div>
  );
}
