import { useMemo, lazy, Suspense } from 'react';
import { generateMetricsTrend } from '@/data/transportXSpecialists';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';

// Lazy-load VegaLiteChart to avoid bundling vega upfront
const VegaLiteChart = lazy(() => import('@/components/ui/VegaLiteChart'));

type DateRange = '7d' | '30d' | '90d';

interface MetricsMovementChartProps {
  specialistId: string;
  dateRange?: DateRange;
}

export function MetricsMovementChart({ specialistId, dateRange = '30d' }: MetricsMovementChartProps) {
  const trendData = useMemo(() => generateMetricsTrend(specialistId, dateRange), [specialistId, dateRange]);

  const spec = useMemo(() => {
    if (trendData.length === 0) return null;

    const { metricLabel, metricType } = trendData[0];

    // Common encoding
    const xField = { field: 'date', type: 'temporal' as const, axis: { format: '%b %d', labelAngle: -45, title: null } };
    const yTitle = metricType === 'percentage' ? `${metricLabel} (%)` : metricLabel;
    const yField = {
      field: 'value',
      type: 'quantitative' as const,
      title: yTitle,
      scale: metricType === 'percentage' ? { domain: [0, 100] } : metricType === 'score' ? { domain: [-20, 60] } : undefined,
    };

    // Build layer-based chart
    if (metricType === 'percentage' || metricType === 'score') {
      return {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { values: trendData },
        layer: [
          {
            mark: { type: 'area', opacity: 0.15, interpolate: 'monotone' },
            encoding: { x: xField, y: yField },
          },
          {
            mark: { type: 'line', strokeWidth: 2, interpolate: 'monotone' },
            encoding: { x: xField, y: yField },
          },
          {
            mark: { type: 'point', size: 16, filled: true, opacity: 0 },
            encoding: {
              x: xField,
              y: yField,
              tooltip: [
                { field: 'date', type: 'temporal', title: 'Date', format: '%b %d' },
                { field: 'value', type: 'quantitative', title: metricLabel, format: '.1f' },
              ],
              opacity: {
                condition: { param: 'hover', value: 1, empty: false },
                value: 0,
              },
            },
            params: [{ name: 'hover', select: { type: 'point', on: 'pointerover', nearest: true } }],
          },
        ],
      };
    }

    // Bar chart for count/currency
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: trendData },
      mark: { type: 'bar', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3, tooltip: true },
      encoding: {
        x: xField,
        y: { ...yField, title: yTitle },
        tooltip: [
          { field: 'date', type: 'temporal', title: 'Date', format: '%b %d' },
          { field: 'value', type: 'quantitative', title: metricLabel },
        ],
      },
    };
  }, [trendData]);

  if (!spec || trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground/60 border border-border rounded-xl">
        No metrics data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        {trendData[0].metricLabel} — Last {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} Days
      </h3>
      <ChartErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-[280px] bg-muted/10 rounded-xl border border-border">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground/40" />
            </div>
          }
        >
          <VegaLiteChart spec={spec} height={280} className="rounded-xl border border-border bg-card p-4" />
        </Suspense>
      </ChartErrorBoundary>
    </div>
  );
}
