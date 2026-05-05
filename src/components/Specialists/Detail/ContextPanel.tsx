import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ContextPanelData } from '@/services/specialistRunService';

const STATE_STYLES = {
  healthy: { label: 'Healthy', dotColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
  degraded: { label: 'Degraded', dotColor: 'bg-amber-500', textColor: 'text-amber-600' },
  critical: { label: 'Critical', dotColor: 'bg-red-500', textColor: 'text-red-600' },
};

const SEVERITY_DOT = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-400',
  low: 'bg-muted-foreground/40',
};

interface ContextPanelProps {
  data: ContextPanelData;
}

export function ContextPanel({ data }: ContextPanelProps) {
  const stateStyle = STATE_STYLES[data.state];

  return (
    <aside className="w-[280px] shrink-0 border-l border-border bg-muted/10 overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* Header */}
        <h3 className="text-sm font-semibold text-muted-foreground/60 uppercase tracking-wider">
          Context
        </h3>

        {/* Monitoring Status */}
        <div className="space-y-3">
          <Row label="Monitoring" value={data.monitoring.metricName} />
          <Row label="State">
            <span className={cn('flex items-center gap-1.5 text-xs font-medium', stateStyle.textColor)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', stateStyle.dotColor)} />
              {stateStyle.label}
            </span>
          </Row>
          <Row
            label="Confidence"
            value={data.confidence > 0 ? `${data.confidence}%` : '—'}
          />
          <Row
            label="Last Checked"
            value={formatDistanceToNow(new Date(data.lastChecked), { addSuffix: false })}
          />
        </div>

        {/* Separator */}
        <div className="border-t border-border/40" />

        {/* Impact Scope */}
        {data.impactScope.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Impact Scope
            </h4>
            {data.impactScope.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3">
                <span className="text-xs text-muted-foreground/70 flex-shrink-0 max-w-[140px] leading-relaxed">{item.label}</span>
                <span className="text-xs font-medium text-foreground text-right min-w-0 leading-relaxed">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Separator */}
        {data.whatChanged.length > 0 && <div className="border-t border-border/40" />}

        {/* What Changed */}
        {data.whatChanged.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground/60 uppercase tracking-wider">
              What Changed
            </h4>
            <div className="space-y-2.5">
              {data.whatChanged.map((change, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full mt-1.5 shrink-0',
                    SEVERITY_DOT[change.severity],
                  )} />
                  <span className="text-xs text-foreground/80 leading-relaxed">
                    {change.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Reusable key-value row */
function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground/70">{label}</span>
      {children ?? <span className="text-xs font-medium text-foreground">{value}</span>}
    </div>
  );
}
