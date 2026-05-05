import { useState } from "react";
import { BarChart3, Filter, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface DimensionValue {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "flat";
}

export interface MetricDimension {
  id: string;
  name: string;
  type: "categorical" | "hierarchical";
  values: DimensionValue[];
}

interface DimensionalDrilldownProps {
  metricId: string;
  metricName: string;
  dimensions?: MetricDimension[];
}

function formatValue(value: number, metricName: string): string {
  if (metricName.toLowerCase().includes("margin") || 
      metricName.toLowerCase().includes("rate") ||
      metricName.toLowerCase().includes("nim")) {
    return `${value.toFixed(1)}%`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(1);
}

export function DimensionalDrilldown({
  metricId,
  metricName,
  dimensions,
}: DimensionalDrilldownProps) {
  // Use provided dimensions only - no demo fallback
  const availableDimensions = dimensions || [];
  const [selectedDimension, setSelectedDimension] = useState<string>(
    availableDimensions[0]?.id || ""
  );

  const currentDimension = availableDimensions.find((d) => d.id === selectedDimension);

  if (!currentDimension || availableDimensions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No dimensional data available</p>
        <p className="text-xs mt-1">Add dimension filters to this metric to enable drilldown analysis</p>
      </div>
    );
  }

  const chartData = currentDimension.values.map((v) => ({
    name: v.label,
    value: v.value,
    change: v.change,
    trend: v.trend,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Breakdown by</span>
        </div>
        <Select value={selectedDimension} onValueChange={setSelectedDimension}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableDimensions.map((dim) => (
              <SelectItem key={dim.id} value={dim.id}>
                {dim.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bar Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => [formatValue(value, metricName), metricName]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.trend === "down" ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed breakdown */}
      <div className="space-y-2">
        {currentDimension.values.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {formatValue(item.value, metricName)}
              </span>
              <div
                className={`flex items-center gap-1 text-xs ${
                  item.trend === "down" ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {item.trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : item.trend === "down" ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                <span>
                  {item.change > 0 ? "+" : ""}
                  {item.change.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
