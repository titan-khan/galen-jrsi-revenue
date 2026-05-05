import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface ValueSectionProps {
  measure: string;
  aggregation: string;
  sparklineType: "cumulative" | "non-cumulative";
  onMeasureChange: (value: string) => void;
  onAggregationChange: (value: string) => void;
  onSparklineTypeChange: (value: "cumulative" | "non-cumulative") => void;
}

const measures = [
  { value: "sales", label: "Sales" },
  { value: "profit", label: "Profit" },
  { value: "quantity", label: "Quantity" },
  { value: "discount", label: "Discount" },
  { value: "revenue", label: "Revenue" },
];

const aggregations = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "count", label: "Count" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const ValueSection = ({
  measure,
  aggregation,
  sparklineType,
  onMeasureChange,
  onAggregationChange,
  onSparklineTypeChange,
}: ValueSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Value</h4>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
          Clear Selections
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Measure <span className="text-destructive">*</span>
        </Label>
        <Select value={measure} onValueChange={onMeasureChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a measure" />
          </SelectTrigger>
          <SelectContent>
            {measures.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Aggregation</Label>
        <Select value={aggregation} onValueChange={onAggregationChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select aggregation" />
          </SelectTrigger>
          <SelectContent>
            {aggregations.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Sparkline Type</Label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onSparklineTypeChange("non-cumulative")}
            className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-all ${
              sparklineType === "non-cumulative"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/50"
            }`}
          >
            Non-cumulative
          </button>
          <button
            onClick={() => onSparklineTypeChange("cumulative")}
            className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-all ${
              sparklineType === "cumulative"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/50"
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValueSection;
