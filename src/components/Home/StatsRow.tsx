import { memo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatItemProps {
  value: string | number;
  label: string;
  change?: number; // percentage change from previous period
  changeLabel?: string;
  trend?: 'up' | 'down' | 'flat';
  trendIsGood?: boolean; // true if upward trend is positive (e.g., revenue), false if bad (e.g., critical issues)
  priority?: 'primary' | 'secondary';
}

const StatItem = memo(function StatItem({
  value,
  label,
  change,
  changeLabel,
  trend = 'flat',
  trendIsGood = true,
  priority = 'secondary',
}: StatItemProps) {
  const getTrendColor = () => {
    if (trend === 'flat') return 'text-muted-foreground';
    const isPositive = trend === 'up' ? trendIsGood : !trendIsGood;
    return isPositive ? 'text-emerald-600' : 'text-destructive-foreground';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn(
      "flex flex-col",
      priority === 'primary' && "pr-6 border-r border-border"
    )}>
      <div className="flex items-baseline gap-2">
        <span className={cn(
          "font-semibold text-foreground leading-none",
          priority === 'primary' ? "text-2xl" : "text-lg"
        )}>
          {value}
        </span>
        {change !== undefined && (
          <div className={cn("flex items-center gap-0.5 text-xs font-medium", getTrendColor())}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {changeLabel && (
          <span className="text-xs text-muted-foreground/60">({changeLabel})</span>
        )}
      </div>
    </div>
  );
});

interface StatsRowProps {
  valueAtStake: string;
  criticalCount: number;
  pendingActions: number;
  activeSpecialists: number;
  totalSpecialists: number;
}

export const StatsRow = memo(function StatsRow({
  valueAtStake,
  criticalCount,
  pendingActions,
  activeSpecialists,
  totalSpecialists,
}: StatsRowProps) {
  return (
    <div className="mb-6 p-4 bg-card border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-foreground/70">Live · Last 7 days</span>
        </div>
        <span className="text-xs text-muted-foreground">vs previous period</span>
      </div>
      
      <div className="flex items-start gap-6 flex-wrap">
        {/* <StatItem
          value={valueAtStake}
          label="Value at Risk"
          change={12}
          changeLabel="vs last week"
          trend="up"
          trendIsGood={false}
          priority="primary"
        /> */}
        
        <StatItem
          value={criticalCount}
          label="Critical Issues"
          change={criticalCount > 0 ? 50 : 0}
          trend={criticalCount > 0 ? 'up' : 'flat'}
          trendIsGood={false}
        />
        
        <StatItem
          value={pendingActions}
          label="Awaiting Review"
          change={8}
          trend="down"
          trendIsGood={true}
        />
        
        <StatItem
          value={`${activeSpecialists}/${totalSpecialists}`}
          label="Specialists Active"
          trend="flat"
        />
      </div>
    </div>
  );
});

// Keep MetricWithSparkline for backwards compatibility if needed elsewhere
export const MetricWithSparkline = memo(function MetricWithSparkline({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div>
        <p className="text-xl font-semibold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
});
