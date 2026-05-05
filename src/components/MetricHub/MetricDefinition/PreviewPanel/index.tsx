import EmptyPreview from "./EmptyPreview";
import MetricCard from "./MetricCard";
import SparklineChart from "./SparklineChart";
import InsightsFeed from "./InsightsFeed";
import FilterChips from "./FilterChips";
import { MetricFormState } from "../hooks/useMetricForm";

interface PreviewPanelProps {
  formState: MetricFormState;
  isReady: boolean;
}

const PreviewPanel = ({ formState, isReady }: PreviewPanelProps) => {
  if (!isReady) {
    return (
      <div className="h-full bg-muted/20">
        <EmptyPreview />
      </div>
    );
  }

  const measureLabels: Record<string, string> = {
    sales: "13.9k",
    profit: "458K",
    quantity: "12,847",
    discount: "15.2%",
    revenue: "3.1M",
  };

  return (
    <div className="h-full bg-muted/20 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Filter Chips */}
        <FilterChips formState={formState} />

        {/* Metric Title & KPI */}
        <MetricCard
          name={formState.name}
          value={measureLabels[formState.measure] || "0"}
          change={12.4}
          changeLabel="vs previous period"
          sentiment={formState.valueSentiment}
        />

        {/* AI Insights */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            AI Insights
          </h3>
          <InsightsFeed
            measure={formState.measure}
            sentiment={formState.valueSentiment}
          />
        </div>

        {/* Full-Width Chart */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Trend</h3>
          <SparklineChart cumulative={formState.sparklineType === "cumulative"} />
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
