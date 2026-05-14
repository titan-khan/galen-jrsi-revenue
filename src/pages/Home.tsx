import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Users, TrendingUp, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RISK_EVENTS, WORKLIST_STATS } from '@/data/riskLensData';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { useMetrics } from '@/contexts/MetricsContext';
import { useHomeData } from '@/hooks/useHomeData';
import { usePageLoadMonitoring } from '@/hooks/usePageLoadMonitoring';
import { usePrefetch } from '@/hooks/usePrefetch';
import { cacheKeys } from '@/lib/cacheKeys';
import { fetchSpecialists } from '@/services/agentsService';
import { formatIDR } from '@/utils/currency';
import {
  QuickActions,
  StatsRow,
  SectionHeader,
  SimpleListItem,
  CompactCard,
  MetricCard,
  InsightDetailDialog
} from '@/components/Home';
import { InlineQueryErrorBoundary } from '@/components/ErrorBoundaries';
import { RefreshIndicator } from '@/components/RefreshIndicator';

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function Home() {
  const { specialists } = useSpecialists();
  const { metrics } = useMetrics();
  const { allInsights, pendingRecommendations, valueAtStake, criticalCount, isLoading, isValidating } = useHomeData(specialists);

  // Track page load performance (Requirement 2.4, 15.6)
  usePageLoadMonitoring('home', isLoading, !isLoading && allInsights.length > 0);

  // Route-based prefetching: Prefetch specialist list when navigating to home page
  // Requirements: 13.2, 13.3
  const { prefetch } = usePrefetch();
  
  useEffect(() => {
    // Prefetch specialists list data in the background
    // This will populate the cache so the Specialists page loads instantly
    prefetch(
      cacheKeys.specialists.list(),
      fetchSpecialists
    );
  }, [prefetch]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'insight' | 'recommendation';
    title: string;
    description?: string;
    specialistName?: string;
    domain?: string;
    severity?: 'critical' | 'high' | 'medium' | 'normal';
    timestamp?: string;
    href: string;
    ctaLabel?: string;
  } | null>(null);

  const stats = useMemo(() => {
    const activeCount = specialists.filter(s => s.status === 'active').length;

    return {
      criticalCount,
      activeCount,
      totalSpecialists: specialists.length,
      pendingActions: pendingRecommendations.length,
    };
  }, [specialists, criticalCount, pendingRecommendations]);

  // Get active specialists for cards
  const activeSpecialists = useMemo(() => {
    return specialists
      .filter(s => s.status === 'active')
      .slice(0, 4);
  }, [specialists]);

  // Get recent metrics (following metrics with significant changes)
  const recentMetrics = useMemo(() => {
    return metrics
      .filter(m => m.isFollowing)
      .sort((a, b) => Math.abs(b.displayData.changePercent) - Math.abs(a.displayData.changePercent))
      .slice(0, 4);
  }, [metrics]);

  const handleItemClick = (item: typeof selectedItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  return (
    <div className="flex-1 p-4 md:p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Background Refresh Indicator - Requirement 2.2 */}
        <RefreshIndicator isValidating={isValidating} className="mb-4" />

        {/* Quick Actions */}
        <QuickActions />

        {/* Stats Row with Sparklines */}
        <StatsRow
          valueAtStake={valueAtStake > 0 ? formatIDR(valueAtStake) : '—'}
          criticalCount={stats.criticalCount}
          pendingActions={stats.pendingActions}
          activeSpecialists={stats.activeCount}
          totalSpecialists={stats.totalSpecialists}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Lists */}
          <div className="lg:col-span-3 space-y-6">
            {/* Risk Lens — coupling events needing triage */}
            <div>
              <SectionHeader
                icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
                title="Research alerts"
                viewAllPath="/research/risk-lens"
              />
              <div className="border rounded-lg bg-card divide-y divide-border">
                {RISK_EVENTS.slice(0, 4).map((event) => (
                  <Link
                    key={event.id}
                    to={`/research/risk-lens/${event.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors group"
                  >
                    <span className="font-mono text-base font-bold tabular-nums text-destructive shrink-0 w-12">
                      {event.priorityScore.toFixed(2)}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-destructive/40 text-destructive text-[10px] shrink-0"
                    >
                      {event.severity}
                    </Badge>
                    <span className="flex-1 text-sm text-foreground truncate min-w-0">
                      {event.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {event.detectedAgo.replace(' ago', '')}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
                <div className="px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>
                    {WORKLIST_STATS.open} open · {WORKLIST_STATS.high} high · {WORKLIST_STATS.medium} medium
                  </span>
                  <span className="ml-auto">last refresh {WORKLIST_STATS.lastRefresh}</span>
                </div>
              </div>
            </div>

            {/* Insight Updates */}
            {/* <div>
              <SectionHeader
                icon={<AlertTriangle className="h-4 w-4 text-destructive-foreground" />}
                title="Insight updates"
                viewAllPath="/specialists"
              />
              <div className="border rounded-lg bg-card divide-y divide-border">
                {allInsights.length > 0 ? (
                  allInsights.slice(0, 5).map((insight) => (
                    <SimpleListItem
                      key={insight.id}
                      specialistName={`@${insight.specialistHandle}`}
                      domain={insight.specialistDomain}
                      title={insight.headline}
                      description={insight.description}
                      severity={insight.severity === 'critical' ? 'critical' : insight.severity === 'high' ? 'high' : 'medium'}
                      ctaLabel="Investigate"
                      timestamp={getTimeAgo(insight.detectedAt)}
                      href={`/specialists/${insight.specialistId}`}
                      onClick={() => handleItemClick({
                        type: 'insight',
                        title: insight.headline,
                        description: insight.description,
                        specialistName: `@${insight.specialistHandle}`,
                        domain: insight.specialistDomain,
                        severity: insight.severity === 'critical' ? 'critical' : insight.severity === 'high' ? 'high' : 'medium',
                        timestamp: getTimeAgo(insight.detectedAt),
                        href: `/specialists/${insight.specialistId}`,
                        ctaLabel: 'Investigate',
                      })}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {isLoading ? 'Loading insights…' : 'No insights yet. Run your specialists to generate analysis.'}
                  </p>
                )}
              </div>
            </div> */}

            {/* Pending Actions */}
            <div>
              <SectionHeader
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                title="Pending actions"
                viewAllPath="/specialists"
              />
              <div className="border rounded-lg bg-card divide-y divide-border">
                {pendingRecommendations.length > 0 ? (
                  pendingRecommendations.slice(0, 5).map((rec) => (
                    <SimpleListItem
                      key={rec.id}
                      specialistName={`@${rec.specialistHandle}`}
                      domain={rec.specialistDomain}
                      title={rec.title}
                      description={rec.description}
                      ctaLabel="Review"
                      timestamp={getTimeAgo(rec.createdAt)}
                      href={`/specialists/${rec.specialistId}`}
                      onClick={() => handleItemClick({
                        type: 'recommendation',
                        title: rec.title,
                        description: rec.description,
                        specialistName: `@${rec.specialistHandle}`,
                        domain: rec.specialistDomain,
                        timestamp: getTimeAgo(rec.createdAt),
                        href: `/specialists/${rec.specialistId}`,
                        ctaLabel: 'Review',
                      })}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {isLoading ? 'Loading…' : 'No pending actions'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Specialists */}
            <div>
              <SectionHeader
                icon={<Users className="h-4 w-4 text-primary" />}
                title="Active specialists"
                createPath="/specialists/new"
                createLabel="Hire"
                viewAllPath="/specialists"
              />
              <div className="grid grid-cols-2 gap-2">
                {activeSpecialists.map((specialist) => (
                  <CompactCard
                    key={specialist.id}
                    title={specialist.name}
                    handle={specialist.handle}
                    domain={specialist.domain}
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    href={`/specialists/${specialist.id}`}
                  />
                ))}
              </div>
            </div>

            {/* Recent Metrics */}
            <div>
              <SectionHeader
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                title="Recent metrics"
                createPath="/metrics/new"
                viewAllPath="/metrics"
              />
              <InlineQueryErrorBoundary>
                {recentMetrics.length > 0 ? (
                  <div className="space-y-2">
                    {recentMetrics.map((metric) => (
                      <MetricCard key={metric.id} metric={metric} />
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg bg-card p-4">
                    <p className="text-sm text-muted-foreground text-center">
                      No metrics tracked yet. <a href="/metrics" className="text-primary hover:underline">Browse metrics</a> to get started.
                    </p>
                  </div>
                )}
              </InlineQueryErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      {selectedItem && (
        <InsightDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          type={selectedItem.type}
          title={selectedItem.title}
          description={selectedItem.description}
          specialistName={selectedItem.specialistName}
          domain={selectedItem.domain as any}
          severity={selectedItem.severity}
          timestamp={selectedItem.timestamp}
          href={selectedItem.href}
          ctaLabel={selectedItem.ctaLabel}
        />
      )}
    </div>
  );
}
