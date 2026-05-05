import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnomalyAlert } from '@/types/agent';
import { AlertTriangle, Activity, CheckCircle2, Eye, EyeOff, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnomalyAlertsProps {
  agentId: string;
  alerts?: AnomalyAlert[];
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onIgnore?: (alertId: string) => void;
}

const severityConfig = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground border-border' },
  medium: { label: 'Medium', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  critical: { label: 'Critical', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const typeConfig = {
  spike: { label: 'Spike', icon: ArrowUpRight, color: 'text-orange-500' },
  drop: { label: 'Drop', icon: ArrowDownRight, color: 'text-red-500' },
  'trend-change': { label: 'Trend Change', icon: Activity, color: 'text-amber-500' },
  'threshold-breach': { label: 'Threshold', icon: AlertTriangle, color: 'text-destructive' },
};

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  acknowledged: { label: 'Acknowledged', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  ignored: { label: 'Ignored', color: 'bg-muted text-muted-foreground border-border' },
};

export function AnomalyAlerts({ agentId, alerts = [], onAcknowledge, onResolve, onIgnore }: AnomalyAlertsProps) {
  const [filter, setFilter] = useState<'all' | 'new' | 'acknowledged' | 'resolved'>('all');
  
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.status === filter);

  const newCount = alerts.filter(a => a.status === 'new').length;

  const formatValue = (value: number, metricName: string) => {
    if (metricName.toLowerCase().includes('rate') || metricName.toLowerCase().includes('margin')) {
      return `${value.toFixed(1)}%`;
    }
    if (metricName.toLowerCase().includes('revenue')) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Anomaly Alerts</CardTitle>
            {newCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {newCount} new
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {(['all', 'new', 'acknowledged', 'resolved'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No anomalies detected</p>
            <p className="text-xs mt-1">The agent will alert you when it detects unusual patterns</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const severity = severityConfig[alert.severity];
            const type = typeConfig[alert.type];
            const status = statusConfig[alert.status];
            const TypeIcon = type.icon;

            return (
              <div
                key={alert.id}
                className={cn(
                  "p-4 border rounded-lg transition-colors",
                  alert.status === 'new' && "bg-blue-500/5 border-blue-200",
                  alert.status === 'resolved' && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg bg-muted", type.color)}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.metricName}</span>
                        <Badge variant="outline" className={`text-xs ${severity.color}`}>
                          {severity.label}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${status.color}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={cn("font-semibold", type.color)}>
                          {formatValue(alert.value, alert.metricName)}
                        </span>
                        <span className="text-muted-foreground">
                          Expected: {formatValue(alert.expectedValue || 0, alert.metricName)}
                        </span>
                        <span className={cn(
                          "text-xs font-medium",
                          (alert.deviation || 0) > 0 ? "text-orange-500" : "text-red-500"
                        )}>
                          {(alert.deviation || 0) > 0 ? '+' : ''}{alert.deviation?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Detected {formatDistanceToNow(new Date(alert.detectedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {alert.status === 'new' && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onAcknowledge?.(alert.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Acknowledge
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => onIgnore?.(alert.id)}
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {alert.status === 'acknowledged' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onResolve?.(alert.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
