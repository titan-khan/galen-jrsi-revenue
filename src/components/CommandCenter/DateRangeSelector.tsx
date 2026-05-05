import { Calendar, RefreshCw, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import type { DateRangeOption } from "@/types/commandCenter";

const dateRangeOptions: { value: DateRangeOption; label: string; group: string; comparison?: string }[] = [
  { value: "today", label: "Today", group: "Quick", comparison: "vs. yesterday" },
  { value: "yesterday", label: "Yesterday", group: "Quick", comparison: "vs. day before" },
  { value: "last-7-days", label: "Last 7 days", group: "Quick", comparison: "vs. previous 7 days" },
  { value: "last-30-days", label: "Last 30 days", group: "Quick", comparison: "vs. previous 30 days" },
  { value: "week-over-week", label: "Week over Week", group: "Comparison", comparison: "vs. same week last year" },
  { value: "last-quarter", label: "Last Quarter", group: "Comparison", comparison: "vs. previous quarter" },
  { value: "ytd", label: "Year to Date", group: "Comparison", comparison: "vs. same period last year" },
];

interface DateRangeSelectorProps {
  showRealTimeToggle?: boolean;
  isRealTime?: boolean;
  onRealTimeChange?: (enabled: boolean) => void;
}

export function DateRangeSelector({
  showRealTimeToggle = false,
  isRealTime = false,
  onRealTimeChange,
}: DateRangeSelectorProps) {
  const { dateRange, setDateRange } = useCommandCenter();

  const quickOptions = dateRangeOptions.filter((o) => o.group === "Quick");
  const comparisonOptions = dateRangeOptions.filter((o) => o.group === "Comparison");
  const selectedOption = dateRangeOptions.find((o) => o.value === dateRange);

  return (
    <div className="flex items-center gap-3">
      {showRealTimeToggle && (
        <div className="flex items-center gap-2">
          <Switch
            id="real-time"
            checked={isRealTime}
            onCheckedChange={onRealTimeChange}
          />
          <Label htmlFor="real-time" className="text-xs flex items-center gap-1.5 cursor-pointer">
            <Clock className="h-3 w-3" />
            Real-time
          </Label>
          {isRealTime && (
            <RefreshCw className="h-3 w-3 text-primary animate-spin" />
          )}
        </div>
      )}

      <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
        <SelectTrigger className="w-[180px]">
          <Calendar className="h-3.5 w-3.5 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Quick</SelectLabel>
            {quickOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Comparison</SelectLabel>
            {comparisonOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {selectedOption?.comparison && (
        <span className="text-xs text-muted-foreground hidden lg:inline">
          {selectedOption.comparison}
        </span>
      )}
    </div>
  );
}
