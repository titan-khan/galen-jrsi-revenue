import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface Filter {
  dimension: string;
  operator: string;
  value: string;
}

interface FiltersSectionProps {
  filters: Filter[];
  onAddFilter: () => void;
  onRemoveFilter: (index: number) => void;
  onUpdateFilter: (index: number, field: "dimension" | "operator" | "value", value: string) => void;
}

const dimensions = [
  { value: "category", label: "Category" },
  { value: "region", label: "Region" },
  { value: "segment", label: "Segment" },
  { value: "sub_category", label: "Sub-Category" },
  { value: "state", label: "State" },
];

const operators = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
];

const FiltersSection = ({
  filters,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
}: FiltersSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Filters</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddFilter}
          className="h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No filters applied. Add filters to narrow down your data.
        </p>
      ) : (
        <div className="space-y-3">
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={filter.dimension}
                onValueChange={(v) => onUpdateFilter(index, "dimension", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Dimension" />
                </SelectTrigger>
                <SelectContent>
                  {dimensions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.operator}
                onValueChange={(v) => onUpdateFilter(index, "operator", v)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Value"
                value={filter.value}
                onChange={(e) => onUpdateFilter(index, "value", e.target.value)}
                className="flex-1"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveFilter(index)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FiltersSection;
