import React, { useState, useMemo, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { BrowseSearchBar } from "./BrowseSearchBar";
import { CompactMetricCard } from "./CompactMetricCard";
import { AISuggestionCard } from "./AISuggestionCard";
import { useMetrics } from "@/contexts/MetricsContext";
import { getActiveSuggestions } from "@/data/metricsTreeData";
import { getComparisonLabel } from "@/services/periodUtils";
import type { MetricDomain } from "@/types/metric";

interface BrowseMetricsTableProps {
  onViewDetails?: (metricId: string) => void;
}

const DOMAIN_ORDER: MetricDomain[] = [
  // PKB pilot domains (primary, MECE) — shown first
  'Compliance', 'Revenue', 'Treatment',
  // Legacy / generic
  'Cost', 'Fee', 'Margin', 'Operational', 'Performance',
  // Legacy JRSI
  'Accident Overview', 'Financial', 'Vehicle', 'TRL Risk', 'Cause Analysis', 'Data Quality', 'Time Analysis',
];

const BrowseMetricsTable = React.forwardRef<HTMLDivElement, BrowseMetricsTableProps>(
  ({ onViewDetails }, ref) => {
    const {
      metrics,
      toggleFollow,
      getDomainCategories,
      aiSuggestions,
      dismissedSuggestions,
      dismissSuggestion,
      periodFilters,
      getMetricById,
    } = useMetrics();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const categories = useMemo(() => getDomainCategories(), [getDomainCategories]);

    const comparisonLabel = useMemo(
      () => getComparisonLabel(periodFilters.period, periodFilters.comparison),
      [periodFilters.period, periodFilters.comparison]
    );

    const activeSuggestions = useMemo(
      () => getActiveSuggestions(aiSuggestions, dismissedSuggestions),
      [aiSuggestions, dismissedSuggestions]
    );

    const handleSearchChange = useCallback((query: string) => {
      setSearchQuery(query);
    }, []);

    const handleCategoryChange = useCallback((cat: string) => {
      setCategoryFilter(cat);
    }, []);

    const handleFollowSuggestion = useCallback((metricId: string) => {
      toggleFollow(metricId);
    }, [toggleFollow]);

    const handleDismissSuggestion = useCallback((suggestionId: string) => {
      dismissSuggestion(suggestionId);
    }, [dismissSuggestion]);

    // Filter metrics
    const filteredMetrics = useMemo(() => {
      let result = metrics;

      // Category filter
      if (categoryFilter !== 'all') {
        result = result.filter(m => m.domain === categoryFilter);
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          m =>
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            (m.domain && m.domain.toLowerCase().includes(q))
        );
      }

      return result;
    }, [metrics, categoryFilter, searchQuery]);

    // Group by domain
    const grouped = useMemo(() => {
      const groups: Record<string, typeof filteredMetrics> = {};
      for (const m of filteredMetrics) {
        const domain = m.domain || 'Other';
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(m);
      }
      // Return in order
      return DOMAIN_ORDER
        .filter(d => groups[d])
        .map(d => ({ domain: d, metrics: groups[d] }));
    }, [filteredMetrics]);

    return (
      <div ref={ref} className="space-y-6">
        {/* AI Recommendations — promoted above search */}
        {activeSuggestions.length > 0 && !searchQuery && categoryFilter === 'all' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-5 w-5 rounded bg-primary/10">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <h3 className="text-[13px] font-semibold text-foreground">Recommended for you</h3>
              <span className="text-[11px] text-muted-foreground/50">
                Based on your followed metrics
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeSuggestions.map((suggestion) => (
                <AISuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  comparisonLabel={comparisonLabel}
                  direction={getMetricById(suggestion.metricId)?.direction || 'up_is_good'}
                  onFollow={handleFollowSuggestion}
                  onDismiss={handleDismissSuggestion}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search bar + category filter */}
        <BrowseSearchBar
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          categories={categories}
        />

        {/* Grouped metric cards */}
        {grouped.length > 0 ? (
          grouped.map(({ domain, metrics: domainMetrics }) => (
            <div key={domain} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-foreground">{domain}</h3>
                <span className="text-[11px] text-muted-foreground/50">
                  {domainMetrics.length} metric{domainMetrics.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {domainMetrics.map((metric) => (
                  <CompactMetricCard
                    key={metric.id}
                    metric={metric}
                    onToggleFollow={toggleFollow}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-[13px] text-muted-foreground/60">
            {searchQuery
              ? `No metrics match "${searchQuery}"`
              : 'No metrics available'}
          </div>
        )}
      </div>
    );
  }
);

BrowseMetricsTable.displayName = "BrowseMetricsTable";

export default BrowseMetricsTable;
