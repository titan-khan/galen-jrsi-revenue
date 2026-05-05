import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeSectionProps {
  dateField: string;
  timeGranularity: string;
  onDateFieldChange: (value: string) => void;
  onTimeGranularityChange: (value: string) => void;
}

const dateFields = [
  { value: "order_date", label: "Order Date" },
  { value: "ship_date", label: "Ship Date" },
  { value: "created_at", label: "Created At" },
  { value: "updated_at", label: "Updated At" },
];

const granularities = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

const TimeSection = ({
  dateField,
  timeGranularity,
  onDateFieldChange,
  onTimeGranularityChange,
}: TimeSectionProps) => {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Time</h4>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Date Field <span className="text-destructive">*</span>
        </Label>
        <Select value={dateField} onValueChange={onDateFieldChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a date field" />
          </SelectTrigger>
          <SelectContent>
            {dateFields.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Time Granularity</Label>
        <Select value={timeGranularity} onValueChange={onTimeGranularityChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select granularity" />
          </SelectTrigger>
          <SelectContent>
            {granularities.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TimeSection;
