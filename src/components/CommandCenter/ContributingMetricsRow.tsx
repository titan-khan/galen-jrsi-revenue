import { TrendingUp, Shield, Globe, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAttribution } from "@/contexts/AttributionContext";
import { ImpactCategory } from "@/types/attribution";

const CATEGORY_CONFIG: Record<ImpactCategory, { label: string; color: string; bgColor: string; icon: typeof TrendingUp }> = {
  'galen-growth': {
    label: 'Growth Driver',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: TrendingUp,
  },
  'galen-risk': {
    label: 'Risk Mitigation',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Shield,
  },
  'external-seasonal': {
    label: 'Seasonality',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: Globe,
  },
  'external-market': {
    label: 'Market Factor',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: Globe,
  },
  'external-other': {
    label: 'External',
    color: 'text-slate-500 dark:text-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: Globe,
  },
  'unexplained': {
    label: 'Unexplained',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: HelpCircle,
  },
};

export function ContributingMetricsRow() {
  const { performanceSummary, formatCurrency, formatPercentage } = useAttribution();

  if (!performanceSummary) return null;

  // Get top contributors sorted by impact
  const topContributors = performanceSummary.attributions
    .filter(attr => attr.category !== 'unexplained')
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          What's Driving Performance
        </h3>
        <Badge variant="outline" className="text-xs">
          {performanceSummary.period.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topContributors.map((contributor) => {
          const config = CATEGORY_CONFIG[contributor.category];
          const Icon = config.icon;

          return (
            <Card key={contributor.id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${config.bgColor}`} />
              <CardContent className="pt-4 pb-4 pl-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${config.bgColor}`}>
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {config.label}
                  </Badge>
                </div>

                <p className="text-sm font-medium text-foreground line-clamp-1 mb-1">
                  {contributor.label}
                </p>

                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${config.color}`}>
                    {formatCurrency(contributor.value)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {contributor.percentage.toFixed(1)}% of change
                  </span>
                </div>

                {contributor.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {contributor.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}