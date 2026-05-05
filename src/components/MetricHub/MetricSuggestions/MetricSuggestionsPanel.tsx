import { useMemo } from 'react';
import { Sparkles, CheckCircle } from 'lucide-react';
import { AISuggestionCard } from '../AISuggestionCard';
import { useMetrics } from '@/contexts/MetricsContext';
import { getActiveSuggestions } from '@/data/metricsTreeData';
import { getComparisonLabel } from '@/services/periodUtils';

interface MetricSuggestionsPanelProps {
  onCreateMetrics?: unknown;
  onCustomize?: unknown;
  onViewDetails?: (metricId: string) => void;
}

export const MetricSuggestionsPanel = ({
  onViewDetails,
}: MetricSuggestionsPanelProps) => {
  const { toggleFollow, dismissedSuggestions, dismissSuggestion, aiSuggestions, isAiLoading, periodFilters, getMetricById } = useMetrics();

  const comparisonLabel = useMemo(
    () => getComparisonLabel(periodFilters.period, periodFilters.comparison),
    [periodFilters.period, periodFilters.comparison]
  );

  const activeSuggestions = useMemo(
    () => getActiveSuggestions(aiSuggestions, dismissedSuggestions),
    [aiSuggestions, dismissedSuggestions]
  );

  const handleFollow = (metricId: string) => {
    toggleFollow(metricId);
  };

  const handleDismiss = (suggestionId: string) => {
    dismissSuggestion(suggestionId);
  };

  return (
    <div className="space-y-5">
      {/* Intro text */}
      <div className="flex items-start gap-3 pb-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-foreground mb-0.5">
            AI-Recommended Metrics
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Based on your followed metrics and their relationships, these metrics may provide
            valuable additional visibility into your business performance.
          </p>
        </div>
      </div>

      {/* Suggestion cards */}
      {activeSuggestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeSuggestions.map((suggestion) => (
            <AISuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              comparisonLabel={comparisonLabel}
              direction={getMetricById(suggestion.metricId)?.direction || 'up_is_good'}
              onFollow={handleFollow}
              onDismiss={handleDismiss}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 space-y-3">
          <CheckCircle className="h-10 w-10 text-emerald-500/40 mx-auto" />
          <div>
            <p className="text-[14px] font-medium text-foreground mb-1">You're all caught up!</p>
            <p className="text-[13px] text-muted-foreground">
              No new suggestions right now. We'll notify you when we find relevant metrics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
