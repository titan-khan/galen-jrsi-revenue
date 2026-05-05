import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface InsightsSettingsProps {
  adjustableFilters: string[];
  valueSentiment: "up-good" | "up-bad";
  insightTypes: {
    trend: boolean;
    comparison: boolean;
    anomaly: boolean;
  };
  onAdjustableFiltersChange: (filters: string[]) => void;
  onValueSentimentChange: (sentiment: "up-good" | "up-bad") => void;
  onInsightTypeToggle: (type: "trend" | "comparison" | "anomaly", value: boolean) => void;
}

const availableFilters = [
  { value: "category", label: "Category" },
  { value: "region", label: "Region" },
  { value: "segment", label: "Segment" },
  { value: "sub_category", label: "Sub-Category" },
];

const InsightsSettings = ({
  adjustableFilters,
  valueSentiment,
  insightTypes,
  onAdjustableFiltersChange,
  onValueSentimentChange,
  onInsightTypeToggle,
}: InsightsSettingsProps) => {
  const toggleFilter = (filter: string) => {
    if (adjustableFilters.includes(filter)) {
      onAdjustableFiltersChange(adjustableFilters.filter((f) => f !== filter));
    } else {
      onAdjustableFiltersChange([...adjustableFilters, filter]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Adjustable Filters</Label>
        <p className="text-xs text-muted-foreground">
          Select which dimensions users can filter by when viewing insights
        </p>
        <div className="flex flex-wrap gap-2">
          {availableFilters.map((filter) => (
            <Badge
              key={filter.value}
              variant={adjustableFilters.includes(filter.value) ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => toggleFilter(filter.value)}
            >
              {filter.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Value Sentiment</Label>
        <p className="text-xs text-muted-foreground">
          Define whether an increase in this metric is positive or negative
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onValueSentimentChange("up-good")}
            className={`flex-1 py-2.5 px-3 text-sm rounded-lg border transition-all ${
              valueSentiment === "up-good"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "bg-background border-border hover:bg-muted/50"
            }`}
          >
            ↑ Up is Good
          </button>
          <button
            onClick={() => onValueSentimentChange("up-bad")}
            className={`flex-1 py-2.5 px-3 text-sm rounded-lg border transition-all ${
              valueSentiment === "up-bad"
                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                : "bg-background border-border hover:bg-muted/50"
            }`}
          >
            ↑ Up is Bad
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Insight Types</Label>
        <p className="text-xs text-muted-foreground">
          Enable or disable specific types of AI-generated insights
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Trend Analysis</p>
              <p className="text-xs text-muted-foreground">Identify patterns over time</p>
            </div>
            <Switch
              checked={insightTypes.trend}
              onCheckedChange={(v) => onInsightTypeToggle("trend", v)}
            />
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Comparison</p>
              <p className="text-xs text-muted-foreground">Compare periods and segments</p>
            </div>
            <Switch
              checked={insightTypes.comparison}
              onCheckedChange={(v) => onInsightTypeToggle("comparison", v)}
            />
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Anomaly Detection</p>
              <p className="text-xs text-muted-foreground">Highlight unusual values</p>
            </div>
            <Switch
              checked={insightTypes.anomaly}
              onCheckedChange={(v) => onInsightTypeToggle("anomaly", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsSettings;
