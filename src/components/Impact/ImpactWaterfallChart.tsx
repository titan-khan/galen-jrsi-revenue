import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAttribution } from "@/contexts/AttributionContext";
import { WaterfallDataPoint, ImpactCategory, CATEGORY_CONFIG } from "@/types/attribution";

interface ImpactWaterfallChartProps {
  onSegmentClick?: (category: ImpactCategory, attributionId?: string) => void;
}

const CATEGORY_COLORS: Record<ImpactCategory | 'start' | 'end', string> = {
  'start': 'hsl(var(--muted-foreground))',
  'end': 'hsl(var(--primary))',
  'galen-growth': 'hsl(142, 76%, 36%)', // emerald-600
  'galen-risk': 'hsl(217, 91%, 60%)', // blue-500
  'external-seasonal': 'hsl(215, 16%, 47%)', // slate-500
  'external-market': 'hsl(215, 14%, 34%)', // slate-600
  'external-other': 'hsl(215, 13%, 65%)', // slate-400
  'unexplained': 'hsl(38, 92%, 50%)', // amber-500
};

export function ImpactWaterfallChart({ onSegmentClick }: ImpactWaterfallChartProps) {
  const { performanceSummary, formatCurrency } = useAttribution();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const waterfallData = useMemo(() => {
    if (!performanceSummary) return [];

    const { startValue, endValue, attributions } = performanceSummary;
    const data: WaterfallDataPoint[] = [];
    let runningTotal = startValue;

    // Start value
    data.push({
      name: 'Start',
      value: startValue,
      category: 'start',
      fill: CATEGORY_COLORS['start'],
      isTotal: true,
      runningTotal: startValue,
    });

    // Group attributions by category
    const galenGrowth = attributions.filter(a => a.category === 'galen-growth');
    const galenRisk = attributions.filter(a => a.category === 'galen-risk');
    const external = attributions.filter(a => a.category.startsWith('external'));
    const unexplained = attributions.filter(a => a.category === 'unexplained');

    // Galen Growth Drivers (combined)
    const galenGrowthTotal = galenGrowth.reduce((sum, a) => sum + a.value, 0);
    if (galenGrowthTotal > 0) {
      runningTotal += galenGrowthTotal;
      data.push({
        name: 'Growth Drivers',
        value: galenGrowthTotal,
        category: 'galen-growth',
        fill: CATEGORY_COLORS['galen-growth'],
        runningTotal,
      });
    }

    // Galen Risk Mitigation (combined)
    const galenRiskTotal = galenRisk.reduce((sum, a) => sum + a.value, 0);
    if (galenRiskTotal > 0) {
      runningTotal += galenRiskTotal;
      data.push({
        name: 'Risk Mitigation',
        value: galenRiskTotal,
        category: 'galen-risk',
        fill: CATEGORY_COLORS['galen-risk'],
        runningTotal,
      });
    }

    // External Factors (combined)
    const externalTotal = external.reduce((sum, a) => sum + a.value, 0);
    if (externalTotal > 0) {
      runningTotal += externalTotal;
      data.push({
        name: 'External Factors',
        value: externalTotal,
        category: 'external-market',
        fill: CATEGORY_COLORS['external-market'],
        runningTotal,
      });
    }

    // Unexplained
    const unexplainedTotal = unexplained.reduce((sum, a) => sum + a.value, 0);
    if (unexplainedTotal > 0) {
      runningTotal += unexplainedTotal;
      data.push({
        name: 'Unexplained',
        value: unexplainedTotal,
        category: 'unexplained',
        fill: CATEGORY_COLORS['unexplained'],
        runningTotal,
      });
    }

    // End value
    data.push({
      name: 'End',
      value: endValue,
      category: 'end',
      fill: CATEGORY_COLORS['end'],
      isTotal: true,
      runningTotal: endValue,
    });

    return data;
  }, [performanceSummary]);

  // Transform data for waterfall visualization
  const chartData = useMemo(() => {
    return waterfallData.map((item, index) => {
      if (item.isTotal) {
        return {
          ...item,
          base: 0,
          height: item.value,
        };
      }
      
      const previousTotal = waterfallData[index - 1]?.runningTotal || 0;
      return {
        ...item,
        base: previousTotal,
        height: item.value,
      };
    });
  }, [waterfallData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="text-muted-foreground mt-1">
          {data.isTotal ? 'Total: ' : 'Impact: '}
          <span className="font-semibold text-foreground">{formatCurrency(data.value)}</span>
        </p>
        {!data.isTotal && (
          <p className="text-xs text-muted-foreground mt-1">
            Click to see breakdown
          </p>
        )}
      </div>
    );
  };

  const handleBarClick = (data: any) => {
    if (data && !data.isTotal && onSegmentClick) {
      onSegmentClick(data.category);
    }
  };

  if (!performanceSummary) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>Impact Waterfall</span>
          <span className="text-sm font-normal text-muted-foreground">
            {performanceSummary.period.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 20, bottom: 40 }}
              onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0]?.payload)}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              
              {/* Invisible base bar */}
              <Bar 
                dataKey="base" 
                stackId="waterfall" 
                fill="transparent"
              />
              
              {/* Actual value bar */}
              <Bar 
                dataKey="height" 
                stackId="waterfall"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t justify-center text-xs">
          {[
            { key: 'galen-growth', label: 'Growth Drivers' },
            { key: 'galen-risk', label: 'Risk Mitigation' },
            { key: 'external-market', label: 'External' },
            { key: 'unexplained', label: 'Unexplained' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] }}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
