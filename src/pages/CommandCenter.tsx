import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NorthStarPerformanceCard } from "@/components/CommandCenter/NorthStarPerformanceCard";
import { BreakdownMetricsCard } from "@/components/CommandCenter/BreakdownMetricsCard";
import { ContributingMetricsCollapsible } from "@/components/CommandCenter/ContributingMetricsCollapsible";
import { ActionZoneTabs } from "@/components/CommandCenter/ActionZoneTabs";
import { IntelligenceAccordion } from "@/components/CommandCenter/IntelligenceAccordion";
import { DateRangeSelector } from "@/components/CommandCenter/DateRangeSelector";
import { ViewPresetSelector } from "@/components/CommandCenter/ViewPresetSelector";
import { CommandCenterProvider, useCommandCenter } from "@/contexts/CommandCenterContext";
import { AttributionProvider } from "@/contexts/AttributionContext";

function CommandCenterContent() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRealTime, setIsRealTime] = useState(false);
  const { getVisibility } = useCommandCenter();
  const visibility = getVisibility();

  useEffect(() => {
    if (!isRealTime) return;
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [isRealTime]);

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Executive Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Business performance intelligence powered by AI agents
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <ViewPresetSelector />
          <DateRangeSelector
            showRealTimeToggle
            isRealTime={isRealTime}
            onRealTimeChange={setIsRealTime}
          />
        </div>
      </div>

      {/* L1: HERO ZONE - North Star & Breakdown */}
      {visibility.northStar && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 layer-1">
          <NorthStarPerformanceCard />
          <BreakdownMetricsCard />
        </div>
      )}

      {/* L2: CONTEXT ZONE - Collapsible Contributing Metrics */}
      {visibility.contributingMetrics && (
        <div className="layer-2">
          <ContributingMetricsCollapsible />
        </div>
      )}

      {/* L3: ACTION ZONE - Tabbed Risks, Approvals, Investigating */}
      {(visibility.riskAlerts || visibility.approvalQueue) && (
        <div className="layer-3">
          <ActionZoneTabs />
        </div>
      )}

      {/* L4: INTELLIGENCE ZONE - Accordion for Growth Drivers & Agent Insights */}
      {(visibility.growthDrivers || visibility.agentInsights) && (
        <div className="layer-4">
          <IntelligenceAccordion />
        </div>
      )}
    </div>
  );
}

export default function CommandCenter() {
  return (
    <AttributionProvider>
      <CommandCenterProvider>
        <CommandCenterContent />
      </CommandCenterProvider>
    </AttributionProvider>
  );
}