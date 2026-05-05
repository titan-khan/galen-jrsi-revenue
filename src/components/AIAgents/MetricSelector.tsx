import { useState } from 'react';
import { Check, Search, BarChart3, AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMetrics } from '@/contexts/MetricsContext';
import { cn } from '@/lib/utils';
import type { MetricDefinition, MetricStatus } from '@/types/metric';

interface MetricSelectorProps {
  selectedMetricIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const statusConfig: Record<MetricStatus, { icon: typeof BarChart3; color: string; label: string }> = {
  healthy: { icon: BarChart3, color: 'text-emerald-600', label: 'Healthy' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', label: 'Warning' },
  critical: { icon: AlertCircle, color: 'text-red-600', label: 'Critical' },
};

export function MetricSelector({ selectedMetricIds, onSelectionChange }: MetricSelectorProps) {
  const { metrics } = useMetrics();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMetrics = metrics.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const categories = Array.from(new Set(metrics.map((m) => m.category)));
  const metricsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = filteredMetrics.filter((m) => m.category === cat);
    return acc;
  }, {} as Record<string, MetricDefinition[]>);

  const toggleMetric = (id: string) => {
    if (selectedMetricIds.includes(id)) {
      onSelectionChange(selectedMetricIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedMetricIds, id]);
    }
  };

  const selectedCount = selectedMetricIds.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Select Metrics to Monitor</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose which metrics this agent should analyze
          </p>
        </div>
        {selectedCount > 0 && (
          <Badge variant="secondary">{selectedCount} selected</Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search metrics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-6">
          {categories.map((category) => {
            const categoryMetrics = metricsByCategory[category];
            if (categoryMetrics.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryMetrics.map((metric) => {
                    const isSelected = selectedMetricIds.includes(metric.id);
                    const status = statusConfig[metric.displayData.status];
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={metric.id}
                        onClick={() => toggleMetric(metric.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-muted-foreground/30'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground truncate">
                              {metric.name}
                            </span>
                            <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', status.color)} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {metric.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-foreground">
                            {metric.displayData.currentValue}
                          </span>
                          <span
                            className={cn(
                              'text-xs block',
                              metric.displayData.changePercent >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            )}
                          >
                            {metric.displayData.changePercent >= 0 ? '+' : ''}
                            {metric.displayData.changePercent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredMetrics.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No metrics found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMetricIds.map((id) => {
            const metric = metrics.find((m) => m.id === id);
            if (!metric) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                onClick={() => toggleMetric(id)}
              >
                {metric.name}
                <span className="ml-1">×</span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
