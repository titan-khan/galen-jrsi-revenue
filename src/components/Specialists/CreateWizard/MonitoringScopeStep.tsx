import { useState, useMemo, useEffect } from 'react';
import { Check, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Info, Sparkles, Copy } from 'lucide-react';
import { useMetrics } from '@/contexts/MetricsContext';
import { SVGSparkline } from '@/components/MetricHub/SVGSparkline';
import { MetricChips } from './MetricChips';
import { cn } from '@/lib/utils';
import type { BusinessView, MetricConfig, Specialist } from '@/types/specialist';
import type { MetricDefinition, MetricDomain, AISuggestionItem, AISummaryData } from '@/types/metric';

// ── BusinessView → metric domain mapping ────────────────────────────

const BUSINESS_VIEW_DOMAINS: Record<BusinessView, MetricDomain[]> = {
  // JRSI business views
  'accident-monitoring': ['Accident Overview', 'Time Analysis'],
  'risk-mapping': ['TRL Risk'],
  'vehicle-intelligence': ['Vehicle'],
  'santunan-claims': ['Financial'],
  'cause-analysis': ['Cause Analysis'],
  'data-quality': ['Data Quality'],
  // Legacy views
  revenue: ['Revenue', 'Margin'],
  operations: ['Operational', 'Performance'],
  'customer-experience': ['Operational', 'Performance'],
  'cost-optimization': ['Cost', 'Fee'],
  'risk-compliance': ['Cost', 'Operational'],
  'fleet-assets': ['Operational', 'Performance'],
};

// ── Scoring algorithm (AI-enhanced) ─────────────────────────────────

function scoreMetric(
  metric: MetricDefinition,
  aiSuggestions: AISuggestionItem[],
  needsAttention: Array<{ metricId: string }>,
): number {
  let score = 0;

  // Status priority
  const status = metric.displayData.status;
  if (status === 'critical') score += 30;
  else if (status === 'warning') score += 20;
  else if (status === 'healthy') score += 5;

  // Following bonus
  if (metric.isFollowing) score += 15;

  // Metric type bonus
  const mt = metric.metricType;
  if (mt === 'actionable') score += 12;
  else if (mt === 'result') score += 8;
  else if (mt === 'observational') score += 3;

  // Has live data
  if (metric.displayData.currentValue !== '—') score += 10;

  // Has sparkline
  if (metric.displayData.sparklineData.length >= 2) score += 5;

  // Change magnitude (|changePercent| / 5, capped at 5)
  const magnitude = Math.min(Math.abs(metric.displayData.changePercent) / 5, 5);
  score += magnitude;

  // AI suggestion boost — AI explicitly recommended this metric
  const aiSuggestion = aiSuggestions.find((s) => s.metricId === metric.id);
  if (aiSuggestion) {
    score += Math.round(aiSuggestion.confidence * 25); // 15-24 points based on confidence
  }

  // AI needsAttention boost — AI flagged this as problematic
  if (needsAttention.some((n) => n.metricId === metric.id)) {
    score += 20;
  }

  return score;
}

// ── Status dot color ────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  healthy: 'bg-emerald-500',
};

// ── Component ───────────────────────────────────────────────────────

interface MonitoringScopeStepProps {
  businessView: BusinessView | null;
  metrics: MetricConfig[];
  onMetricsChange: (metrics: MetricConfig[]) => void;
  drivers: MetricConfig[];
  onDriversChange: (drivers: MetricConfig[]) => void;
  aiSuggestions?: AISuggestionItem[];
  aiSummary?: AISummaryData | null;
  metricsOverlapMatch?: Specialist | null;
}

interface ScoredMetric {
  metric: MetricDefinition;
  score: number;
  isAiSuggested: boolean;
  isNeedsAttention: boolean;
}

export const MonitoringScopeStep = ({
  businessView,
  metrics,
  onMetricsChange,
  drivers,
  onDriversChange,
  aiSuggestions = [],
  aiSummary = null,
  metricsOverlapMatch = null,
}: MonitoringScopeStepProps) => {
  const { metrics: allSystemMetrics, isLoading } = useMetrics();
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Domain-relevant needs attention items
  const domainNeedsAttention = useMemo(() => {
    if (!businessView || !aiSummary) return [];
    const domains = BUSINESS_VIEW_DOMAINS[businessView];
    return (aiSummary.needsAttention || []).filter((n) => {
      const metric = allSystemMetrics.find((m) => m.id === n.metricId);
      return metric?.domain && domains.includes(metric.domain);
    });
  }, [businessView, aiSummary, allSystemMetrics]);

  // Domain-relevant AI suggestions
  const domainAiSuggestions = useMemo(() => {
    if (!businessView) return [];
    const domains = BUSINESS_VIEW_DOMAINS[businessView];
    return aiSuggestions.filter((s) => domains.includes(s.domain));
  }, [businessView, aiSuggestions]);

  // Score and sort domain-relevant metrics (AI-enhanced)
  const scoredMetrics = useMemo<ScoredMetric[]>(() => {
    if (!businessView) return [];

    const domains = BUSINESS_VIEW_DOMAINS[businessView];
    const domainMetrics = allSystemMetrics.filter(
      (m) => m.domain && domains.includes(m.domain),
    );

    const aiSuggestedIds = new Set(domainAiSuggestions.map((s) => s.metricId));
    const needsAttentionIds = new Set(domainNeedsAttention.map((n) => n.metricId));

    return domainMetrics
      .map((metric) => ({
        metric,
        score: scoreMetric(metric, domainAiSuggestions, domainNeedsAttention),
        isAiSuggested: aiSuggestedIds.has(metric.id),
        isNeedsAttention: needsAttentionIds.has(metric.id),
      }))
      .sort((a, b) => b.score - a.score);
  }, [businessView, allSystemMetrics, domainAiSuggestions, domainNeedsAttention]);

  // Auto-select top 3 on first render (only when metrics array is empty)
  useEffect(() => {
    if (hasAutoSelected || metrics.length > 0 || scoredMetrics.length === 0) return;

    const top3 = scoredMetrics.slice(0, 3).map((sm) => ({
      id: sm.metric.id,
      name: sm.metric.name,
      isCustom: false,
    }));

    onMetricsChange(top3);
    setHasAutoSelected(true);
  }, [scoredMetrics, metrics.length, hasAutoSelected, onMetricsChange]);

  // Reset auto-selection flag when business view changes
  useEffect(() => {
    setHasAutoSelected(false);
  }, [businessView]);

  // Check/uncheck a recommended metric
  const toggleMetric = (metric: MetricDefinition) => {
    const isSelected = metrics.some((m) => m.id === metric.id);
    if (isSelected) {
      onMetricsChange(metrics.filter((m) => m.id !== metric.id));
    } else {
      onMetricsChange([...metrics, { id: metric.id, name: metric.name, isCustom: false }]);
    }
  };

  // Derive selection state
  const selectedIds = useMemo(() => new Set(metrics.map((m) => m.id)), [metrics]);
  const liveDataCount = useMemo(() => {
    return metrics.filter((m) => {
      const sys = allSystemMetrics.find((sm) => sm.id === m.id);
      return sys && sys.displayData.currentValue !== '—';
    }).length;
  }, [metrics, allSystemMetrics]);

  const hasCustomWithoutData = metrics.some((m) => {
    const sys = allSystemMetrics.find((sm) => sm.id === m.id);
    return !sys || sys.displayData.currentValue === '—';
  });

  // ── Empty state: no business view ─────────────────────────────────

  if (!businessView) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Info className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="text-sm font-medium text-muted-foreground/60">
          Select a Business View first
        </p>
        <p className="text-xs text-muted-foreground/40 mt-1 max-w-xs">
          Go back to the Overview step and choose a business area to get metric recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── AI Recommendation Banner ─────────────────────────────────── */}
      {domainNeedsAttention.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
          <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-violet-700 dark:text-violet-300 mb-0.5">
              AI Recommendation
            </p>
            <p className="text-violet-600/80 dark:text-violet-400/70">
              Based on current performance, {domainNeedsAttention.length} metric{domainNeedsAttention.length !== 1 ? 's need' : ' needs'} attention:{' '}
              {domainNeedsAttention
                .slice(0, 3)
                .map((n) => `${n.name} (${n.changePercent > 0 ? '+' : ''}${n.changePercent}%)`)
                .join(', ')}
              {domainNeedsAttention.length > 3 ? ` and ${domainNeedsAttention.length - 3} more` : ''}
              . These have been prioritized for monitoring.
            </p>
          </div>
        </div>
      )}

      {/* ── Recommended Metrics ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Recommended Metrics</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {domainAiSuggestions.length > 0 || domainNeedsAttention.length > 0 ? (
              <>
                AI-ranked by performance signals for your{' '}
                <span className="font-medium text-foreground">
                  {businessView.replace('-', ' ')}
                </span>{' '}
                business view
              </>
            ) : (
              <>
                Based on your{' '}
                <span className="font-medium text-foreground">
                  {businessView.replace('-', ' ')}
                </span>{' '}
                business view — select which metrics to monitor
              </>
            )}
          </p>
        </div>

        {scoredMetrics.length === 0 && !isLoading && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-400">
              <p className="font-medium mb-0.5">No metrics found for this business view</p>
              <p className="text-amber-600/80 dark:text-amber-400/70">
                Add metrics manually using the catalog search below.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/40">
          {scoredMetrics.map(({ metric, isAiSuggested, isNeedsAttention }) => {
            const isChecked = selectedIds.has(metric.id);
            const hasData = metric.displayData.currentValue !== '—';
            const trend = metric.displayData.changePercent;
            const isNeg = trend < 0;
            const TrendIcon = trend < 0 ? TrendingDown : trend > 0 ? TrendingUp : Minus;
            const insightText = metric.displayData.insight?.text;

            return (
              <div key={metric.id}>
                <button
                  type="button"
                  onClick={() => toggleMetric(metric)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    isChecked ? 'bg-primary/5' : 'hover:bg-muted/30',
                  )}
                >
                  {/* Checkbox */}
                  <span
                    className={cn(
                      'flex items-center justify-center h-4.5 w-4.5 rounded border shrink-0 transition-colors',
                      isChecked
                        ? 'bg-primary border-primary text-white'
                        : 'border-border bg-background',
                    )}
                  >
                    {isChecked && <Check className="h-3 w-3" />}
                  </span>

                  {/* Status dot + name */}
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      STATUS_DOT[metric.displayData.status] || 'bg-muted-foreground/30',
                    )}
                  />
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate flex items-center gap-1.5">
                    {metric.name}
                    {/* AI badge */}
                    {isAiSuggested && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI
                      </span>
                    )}
                    {/* Needs attention indicator */}
                    {isNeedsAttention && !isAiSuggested && (
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Needs attention" />
                    )}
                  </span>

                  {/* Current value */}
                  {hasData ? (
                    <span className="text-sm font-medium text-foreground shrink-0 tabular-nums">
                      {metric.displayData.currentValue}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40 shrink-0">No data</span>
                  )}

                  {/* Sparkline */}
                  {metric.displayData.sparklineData.length >= 2 && (
                    <SVGSparkline
                      data={metric.displayData.sparklineData}
                      width={80}
                      height={28}
                      showLabels={false}
                      className="shrink-0"
                    />
                  )}

                  {/* Trend */}
                  {hasData && trend !== 0 && (
                    <span
                      className={cn(
                        'flex items-center gap-0.5 text-[11px] font-medium shrink-0 w-14 justify-end',
                        isNeg ? 'text-red-600' : 'text-emerald-600',
                      )}
                    >
                      <TrendIcon className="h-3 w-3" />
                      {trend > 0 ? '+' : ''}
                      {trend}%
                    </span>
                  )}
                  {hasData && trend === 0 && <span className="w-14 shrink-0" />}
                  {!hasData && <span className="w-14 shrink-0" />}
                </button>

                {/* Per-metric AI insight — show below the row */}
                {insightText && (
                  <div
                    className={cn(
                      'px-4 pb-2.5 -mt-1 ml-[4.5rem]',
                      isChecked ? 'bg-primary/5' : '',
                    )}
                  >
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed italic">
                      {insightText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Validation Banner ────────────────────────────────────────── */}
      {metrics.length > 0 && (
        <div
          className={cn(
            'flex items-start gap-2.5 p-3 rounded-lg border',
            hasCustomWithoutData
              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
              : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
          )}
        >
          <CheckCircle2
            className={cn(
              'h-4 w-4 mt-0.5 shrink-0',
              hasCustomWithoutData ? 'text-blue-500' : 'text-emerald-500',
            )}
          />
          <p className="text-xs">
            {hasCustomWithoutData ? (
              <span className="text-blue-700 dark:text-blue-400">
                <span className="font-medium">
                  {metrics.length} metric{metrics.length !== 1 ? 's' : ''} selected
                </span>
                {' · '}
                {liveDataCount} with live data. Some custom metrics may not have data yet.
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400">
                <span className="font-medium">
                  {metrics.length} metric{metrics.length !== 1 ? 's' : ''} selected
                </span>
                {liveDataCount > 0 && <> · All {liveDataCount} have live data</>}
              </span>
            )}
          </p>
        </div>
      )}

      {metricsOverlapMatch && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20">
          <Copy className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Identical metrics already monitored
            </p>
            <p className="text-amber-700/80 dark:text-amber-400/70 mt-0.5">
              <span className="font-medium">{metricsOverlapMatch.name}</span>
              {metricsOverlapMatch.description && (
                <span> — {metricsOverlapMatch.description.slice(0, 80)}{metricsOverlapMatch.description.length > 80 ? '…' : ''}</span>
              )}
            </p>
            <p className="text-amber-600/70 dark:text-amber-400/60 mt-1">
              Change your metric selection or modify the existing specialist instead.
            </p>
          </div>
        </div>
      )}

      {metrics.length === 0 && scoredMetrics.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-medium">No metrics selected.</span> Select at least one metric to
            continue.
          </p>
        </div>
      )}

      {/* ── Additional Metrics (catalog search) ──────────────────────── */}
      <div className="border-t border-border/40 pt-6">
        <MetricChips
          label="Additional Metrics"
          sublabel="Search the full catalog to add more metrics"
          metrics={metrics}
          onChange={onMetricsChange}
          accentColor="bg-primary/10 text-primary"
        />
      </div>

      {/* ── Key Drivers (optional) ───────────────────────────────────── */}
      <div className="border-t border-border/40 pt-6">
        <MetricChips
          label="Key Drivers"
          sublabel="Optional — add metrics that drive the monitored KPIs"
          metrics={drivers}
          onChange={onDriversChange}
          accentColor="bg-violet-500/10 text-violet-600"
        />
      </div>
    </div>
  );
};
