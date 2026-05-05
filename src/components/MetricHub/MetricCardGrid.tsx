import { useMemo } from "react";
import MetricCard from "./MetricCard";
import EmptyState from "./EmptyState";
import { AISummaryPanel } from "./AISummaryPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics } from "@/contexts/MetricsContext";
import type { MetricDomain } from "@/types/metric";

interface MetricCardGridProps {
  onViewDetails?: (metricId: string) => void;
}

const DOMAIN_ORDER: MetricDomain[] = [
  // PKB Palangka Raya pilot — primary product domain
  'Compliance', 'Revenue', 'Treatment', 'Demographic', 'SWDKLLJ', 'Operational',
  // JRSI / road safety
  'Safety', 'Claims', 'Vehicle', 'Risk', 'Cause', 'Temporal', 'Data Quality',
  // Old labels (kept for backward compat)
  'Accident Overview', 'Financial', 'TRL Risk', 'Cause Analysis', 'Time Analysis',
  // Generic
  'Cost', 'Fee', 'Margin', 'Performance', 'Governance',
];

function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-7 w-24" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-full rounded" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* AI Summary skeleton */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Metric card skeletons grouped by domain */}
      {['Revenue', 'Cost', 'Operational'].map((domain) => (
        <div key={domain} className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const MetricCardGrid = ({ onViewDetails }: MetricCardGridProps) => {
  const { getFollowingMetrics, toggleFollow, isLoading } = useMetrics();
  // Demote experimental metrics (e.g. M-REV-004 Optimistic Revenue) from the headline
  // exec dashboard. They remain discoverable in Browse but won't anchor decisions.
  const followingMetrics = getFollowingMetrics().filter(
    (m) => m.metricType !== "experimental"
  );

  // Group followed metrics by domain (same pattern as BrowseMetricsTable)
  const grouped = useMemo(() => {
    const groups: Record<string, typeof followingMetrics> = {};
    for (const m of followingMetrics) {
      const domain = m.domain || 'Other';
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(m);
    }
    return DOMAIN_ORDER
      .filter(d => groups[d])
      .map(d => ({ domain: d, metrics: groups[d] }));
  }, [followingMetrics]);

  // Show skeleton on initial load (when all values are still default "—")
  const hasRealData = followingMetrics.some(m => m.displayData.currentValue !== '—');
  if (isLoading && !hasRealData && followingMetrics.length > 0) {
    return <LoadingSkeleton />;
  }

  if (followingMetrics.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* AI Summary Panel — show when 3+ metrics are followed */}
      {followingMetrics.length >= 3 && (
        <AISummaryPanel onScrollToMetric={onViewDetails} />
      )}

      {/* Grouped Metric Cards — consistent with Browse tab */}
      {grouped.map(({ domain, metrics: domainMetrics }) => (
        <div key={domain} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-foreground">{domain}</h3>
            <span className="text-[11px] text-muted-foreground/50">
              {domainMetrics.length} metric{domainMetrics.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {domainMetrics.map((metric) => (
              <MetricCard
                key={metric.id}
                metric={metric}
                onUnfollow={toggleFollow}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricCardGrid;
