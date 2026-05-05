import { useState, useCallback } from "react";
import AlertBanner from "@/components/MetricHub/AlertBanner";
import MetricTabs from "@/components/MetricHub/MetricTabs";
import MetricCardGrid from "@/components/MetricHub/MetricCardGrid";
import BrowseMetricsTable from "@/components/MetricHub/BrowseMetricsTable";
import { RelationshipSuggestionsPanel } from "@/components/MetricHub/Relationships";
import { PeriodSelectorRow } from "@/components/MetricHub/PeriodSelectorRow";
import { MetricDetailDrawer } from "@/components/MetricHub/MetricDetailDrawer";
import { MetricsDebugPanel } from "@/components/MetricHub/MetricsDebugPanel";
import { CachingDebugPanel } from "@/components/CachingDebugPanel";
import { useMetrics } from "@/contexts/MetricsContext";
import { RefreshIndicator } from "@/components/RefreshIndicator";

const Metrics = () => {
  const [activeTab, setActiveTab] = useState("following");
  const { getFollowingMetrics, periodFilters, setPeriodFilters, isLoading, isValidating } = useMetrics();

  // Detail drawer state (shared across all tabs)
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenDrawer = useCallback((metricId: string) => {
    setSelectedMetricId(metricId);
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Keep selectedMetricId for animation purposes; will be cleared on next open
  }, []);

  return (
    <div className="p-6">
      <AlertBanner />

      {/* Page Title */}
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-foreground mb-1">Your Metrics</h1>
        <p className="text-muted-foreground text-sm">
          Track your followed metrics and discover insights
        </p>
      </div>

      {/* Background Refresh Indicator - Requirement 2.2 */}
      <RefreshIndicator isValidating={isValidating} message="Refreshing metrics in background..." className="mb-4" />

      {/* Period / Segment / Comparison Selectors */}
      <div className="mb-5">
        <PeriodSelectorRow
          filters={periodFilters}
          onFiltersChange={setPeriodFilters}
        />
      </div>

      {/* Tabs */}
      <MetricTabs
        metricsCount={getFollowingMetrics().length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === "following" && (
        <MetricCardGrid onViewDetails={handleOpenDrawer} />
      )}
      {activeTab === "browse" && (
        <BrowseMetricsTable onViewDetails={handleOpenDrawer} />
      )}
      {activeTab === "relationships" && (
        <RelationshipSuggestionsPanel onViewDetails={handleOpenDrawer} />
      )}

      {/* Metric Detail Drawer — shared across all tabs */}
      <MetricDetailDrawer
        metricId={selectedMetricId}
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Debug Panel — only show in development or with ?debug=true */}
      {(import.meta.env.DEV || new URLSearchParams(window.location.search).get('debug') === 'true') && (
        <>
          <MetricsDebugPanel />
          <CachingDebugPanel />
        </>
      )}
    </div>
  );
};

export default Metrics;
