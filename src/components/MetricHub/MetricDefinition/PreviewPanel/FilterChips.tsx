import { Badge } from "@/components/ui/badge";
import { Calendar, GitCompare } from "lucide-react";
import { MetricFormState } from "../hooks/useMetricForm";

interface FilterChipsProps {
  formState: MetricFormState;
}

const FilterChips = ({ formState }: FilterChipsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
        <Calendar className="w-3 h-3" />
        Month to Date
      </Badge>
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
        <GitCompare className="w-3 h-3" />
        vs Previous Period
      </Badge>
      {formState.adjustableFilters.map((filter) => (
        <Badge
          key={filter}
          variant="outline"
          className="px-3 py-1.5 text-xs font-medium bg-background"
        >
          {filter} | All
        </Badge>
      ))}
    </div>
  );
};

export default FilterChips;
