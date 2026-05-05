import { useMemo } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DEFAULT_AI_SUMMARY } from '@/data/metricsTreeData';
import { useMetrics } from '@/contexts/MetricsContext';
import { getComparisonLabel } from '@/services/periodUtils';
import { cn } from '@/lib/utils';

interface AISummaryPanelProps {
  onScrollToMetric?: (metricId: string) => void;
}

export function AISummaryPanel({ onScrollToMetric }: AISummaryPanelProps) {
  const navigate = useNavigate();
  const { aiSummary, isAiLoading, metrics, isLoading, periodFilters } = useMetrics();

  const comparisonLabel = useMemo(
    () => getComparisonLabel(periodFilters.period, periodFilters.comparison),
    [periodFilters.period, periodFilters.comparison]
  );

  // Build a live summary from current metric data when AI hasn't generated one yet
  const summary = useMemo(() => {
    if (aiSummary) return aiSummary;

    // If still loading DB data, show loading placeholder
    if (isLoading) return DEFAULT_AI_SUMMARY;

    // Build a basic summary from live metric data
    const followed = metrics.filter(m => m.isFollowing);
    const positiveChanges: string[] = [];
    const negativeChanges: string[] = [];
    const topRisers: Array<{ metricId: string; name: string; changePercent: number }> = [];
    const needsAttention: Array<{ metricId: string; name: string; changePercent: number }> = [];

    for (const m of followed) {
      const cp = m.displayData.changePercent;
      if (cp === 0) continue;

      const direction = m.direction || 'up_is_good';
      const isGood = direction === 'down_is_good' ? cp < 0 : cp > 0;
      const label = `${m.name} ${cp > 0 ? 'up' : 'down'} ${Math.abs(cp)}% to ${m.displayData.currentValue}`;

      if (isGood) {
        positiveChanges.push(label);
        topRisers.push({ metricId: m.id, name: m.name, changePercent: Math.abs(cp) });
      } else {
        negativeChanges.push(label);
        needsAttention.push({ metricId: m.id, name: m.name, changePercent: cp });
      }
    }

    topRisers.sort((a, b) => b.changePercent - a.changePercent);
    needsAttention.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    const paragraph = positiveChanges.length > 0 || negativeChanges.length > 0
      ? `Your followed metrics show ${positiveChanges.length} positive and ${negativeChanges.length} concerning signals. ${positiveChanges[0] || ''}. ${negativeChanges[0] ? `However, ${negativeChanges[0]}.` : ''}`
      : 'Waiting for metrics data to generate AI summary...';

    return {
      agentName: 'Metrics Agent',
      timestamp: new Date().toISOString(),
      paragraph,
      boldParts: followed.slice(0, 3).map(m => m.displayData.currentValue),
      positiveChanges,
      negativeChanges,
      topRisers: topRisers.slice(0, 4),
      needsAttention: needsAttention.slice(0, 4),
    };
  }, [aiSummary, metrics, isLoading]);

  // Trust indicator — distinguish live LLM output from static fallback so executives
  // know what they're looking at. STATIC_PKB_AGENT_NAME must match MetricsContext.
  const STATIC_PKB_AGENT_NAME = 'Galen PKB Pilot Agent';
  const aiLiveEnabled = import.meta.env.VITE_ENABLE_AI_SUMMARY_LIVE === 'true';
  const isStaticFallback = !aiLiveEnabled || (summary.agentName === STATIC_PKB_AGENT_NAME && summary.paragraph.startsWith('Snapshot 2026-05-05'));

  const timeAgo = useMemo(() => {
    if (isAiLoading) return 'generating…';
    if (isStaticFallback) return 'snapshot 2026-05-05';
    try {
      const ts = new Date(summary.timestamp).getTime();
      if (!Number.isFinite(ts)) return 'recently';
      const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      const diffHr = Math.round(diffMin / 60);
      return `${diffHr}h ago`;
    } catch {
      return 'recently';
    }
  }, [isAiLoading, isStaticFallback, summary.timestamp]);

  // Bold parts in the paragraph
  const formattedParagraph = useMemo(() => {
    let html = summary.paragraph;
    for (const part of summary.boldParts) {
      html = html.replace(part, `<strong class="font-semibold text-foreground">${part}</strong>`);
    }
    return html;
  }, [summary.paragraph, summary.boldParts]);

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            {isAiLoading ? (
              <Loader2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground">AI Summary</span>
            <span className="text-[11px] text-muted-foreground/60">
              {summary.agentName} · {timeAgo}
            </span>
            {isStaticFallback ? (
              <span
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                title="Showing static snapshot. Set VITE_ENABLE_AI_SUMMARY_LIVE=true and deploy metrics-ai edge function to enable live LLM briefings."
              >
                Static fallback
              </span>
            ) : (
              <span
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                title="Generated by metrics-ai edge function (Claude)"
              >
                Live · LLM
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Paragraph */}
      <p
        className="text-[13px] leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: formattedParagraph }}
      />

      {/* Change highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Positive changes */}
        <div className="space-y-1.5">
          {summary.positiveChanges.slice(0, 3).map((change, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <TrendingUp className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-emerald-700 dark:text-emerald-400">{change}</span>
            </div>
          ))}
        </div>

        {/* Negative changes */}
        <div className="space-y-1.5">
          {summary.negativeChanges.slice(0, 3).map((change, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
              <span className="text-red-700 dark:text-red-400">{change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pill buttons row */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-7 text-[11px] gap-1.5 rounded-full',
            'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            'dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50',
          )}
          onClick={() => {
            if (summary.topRisers[0]) onScrollToMetric?.(summary.topRisers[0].metricId);
          }}
        >
          <TrendingUp className="h-3 w-3" />
          Top Risers ({summary.topRisers.length})
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-7 text-[11px] gap-1.5 rounded-full',
            'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
            'dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50',
          )}
          onClick={() => {
            if (summary.needsAttention[0]) onScrollToMetric?.(summary.needsAttention[0].metricId);
          }}
        >
          <AlertTriangle className="h-3 w-3" />
          Needs Attention ({summary.needsAttention.length})
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-100/50"
          onClick={() => {
            const topIssues = [
              ...summary.negativeChanges.slice(0, 2),
              ...summary.positiveChanges.slice(0, 1),
            ].join(', ');
            const prompt = topIssues
              ? `Based on the metrics summary: ${topIssues}. What actions should we prioritize this period?`
              : `Summarize our key metrics performance and suggest actions for this period.`;
            navigate('/assistant', { state: { prefillMessage: prompt } });
          }}
        >
          <MessageSquare className="h-3 w-3" />
          Ask Assistant
        </Button>
      </div>
    </div>
  );
}
