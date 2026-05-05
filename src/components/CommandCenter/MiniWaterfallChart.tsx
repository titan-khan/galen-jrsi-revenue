import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAttribution } from "@/contexts/AttributionContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MiniWaterfallChartProps {
  onSegmentClick?: (category: string) => void;
}

const CATEGORY_COLORS = {
  'galen-growth': 'bg-emerald-500',
  'galen-risk': 'bg-blue-500',
  'external-seasonal': 'bg-slate-400',
  'external-market': 'bg-slate-500',
  'external-other': 'bg-slate-300',
  'unexplained': 'bg-amber-400',
};

export function MiniWaterfallChart({ onSegmentClick }: MiniWaterfallChartProps) {
  const { performanceSummary, formatCurrency } = useAttribution();

  const segments = useMemo(() => {
    if (!performanceSummary) return [];

    const { totalChange, attributions } = performanceSummary;

    // Group attributions by category
    const grouped = attributions.reduce((acc, attr) => {
      if (!acc[attr.category]) {
        acc[attr.category] = { value: 0, items: [] };
      }
      acc[attr.category].value += attr.value;
      acc[attr.category].items.push(attr);
      return acc;
    }, {} as Record<string, { value: number; items: typeof attributions }>);

    // Convert to array and sort by value
    return Object.entries(grouped)
      .map(([category, data]) => ({
        category,
        value: data.value,
        percentage: (data.value / totalChange) * 100,
        items: data.items,
        color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-400',
      }))
      .sort((a, b) => b.value - a.value);
  }, [performanceSummary]);

  if (!performanceSummary) return null;

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'galen-growth': 'Growth Drivers',
      'galen-risk': 'Risk Mitigation',
      'external-seasonal': 'Seasonality',
      'external-market': 'Market Factors',
      'external-other': 'Other External',
      'unexplained': 'Unexplained',
    };
    return labels[category] || category;
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{formatCurrency(performanceSummary.startValue)}</span>
            <span className="mx-2">→</span>
            <span className="font-medium text-foreground">{formatCurrency(performanceSummary.endValue)}</span>
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              (+{formatCurrency(performanceSummary.totalChange)})
            </span>
          </div>
        </div>

        {/* Horizontal stacked bar */}
        <div className="flex h-8 rounded-lg overflow-hidden">
          {segments.map((segment) => (
            <Tooltip key={segment.category}>
              <TooltipTrigger asChild>
                <button
                  className={`${segment.color} transition-opacity hover:opacity-80 cursor-pointer`}
                  style={{ width: `${segment.percentage}%` }}
                  onClick={() => onSegmentClick?.(segment.category)}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{getCategoryLabel(segment.category)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(segment.value)} ({segment.percentage.toFixed(1)}%)
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {segments.map((segment) => (
            <button
              key={segment.category}
              className="flex items-center gap-1.5 text-xs hover:underline cursor-pointer"
              onClick={() => onSegmentClick?.(segment.category)}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${segment.color}`} />
              <span className="text-muted-foreground">{getCategoryLabel(segment.category)}</span>
              <span className="font-medium">{segment.percentage.toFixed(0)}%</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}