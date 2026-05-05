import { TrendingUp, TrendingDown, Sparkles, Globe, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { useAttribution } from "@/contexts/AttributionContext";

interface PerformanceJustificationCardProps {
  onViewDetails?: () => void;
}

export function PerformanceJustificationCard({ onViewDetails }: PerformanceJustificationCardProps) {
  const { performanceSummary, formatCurrency, formatPercentage } = useAttribution();

  if (!performanceSummary) return null;

  const { 
    metricName,
    period,
    startValue,
    endValue,
    totalChange,
    totalChangePercentage,
    galenPercentage,
    externalPercentage,
    unexplainedPercentage,
    overallConfidence,
  } = performanceSummary;

  const isPositive = totalChange >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {period.label} Performance
            </p>
            <CardTitle className="text-2xl flex items-center gap-2">
              {metricName}
              <TrendIcon className={`h-6 w-6 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
            </CardTitle>
          </div>
          <ConfidenceBadge level={overallConfidence} size="md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metric Change */}
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatPercentage(totalChangePercentage)}
          </span>
          <span className="text-lg text-muted-foreground">
            ({formatCurrency(totalChange)})
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          {formatCurrency(startValue)} → {formatCurrency(endValue)}
        </div>

        {/* Attribution Split Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-foreground">Impact Attribution</span>
            <span className="text-muted-foreground">MECE Breakdown</span>
          </div>
          
          <div className="h-4 rounded-full overflow-hidden flex bg-muted">
            {galenPercentage > 0 && (
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${galenPercentage}%` }}
              />
            )}
            {externalPercentage > 0 && (
              <div 
                className="h-full bg-gradient-to-r from-slate-400 to-slate-300 transition-all duration-500"
                style={{ width: `${externalPercentage}%` }}
              />
            )}
            {unexplainedPercentage > 0 && (
              <div 
                className="h-full bg-amber-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.1)_4px,rgba(0,0,0,0.1)_8px)] transition-all duration-500"
                style={{ width: `${unexplainedPercentage}%` }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <Sparkles className="h-3 w-3 text-emerald-600" />
              <span className="font-medium">Galen Actions</span>
              <span className="text-muted-foreground">{galenPercentage.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-slate-400" />
              <Globe className="h-3 w-3 text-slate-600" />
              <span className="font-medium">External Factors</span>
              <span className="text-muted-foreground">{externalPercentage.toFixed(0)}%</span>
            </div>
            {unexplainedPercentage > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]" />
                <HelpCircle className="h-3 w-3 text-amber-600" />
                <span className="font-medium">Unexplained</span>
                <span className="text-muted-foreground">{unexplainedPercentage.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Executive Summary */}
        <div className="pt-2 border-t">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-emerald-600">{galenPercentage.toFixed(0)}%</span>
            {" "}of {period.label}'s growth is attributed to Galen-driven actions, while{" "}
            <span className="font-semibold text-slate-600">{externalPercentage.toFixed(0)}%</span>
            {" "}is from external market factors.
          </p>
        </div>

        {onViewDetails && (
          <Button 
            variant="outline" 
            className="w-full mt-2" 
            onClick={onViewDetails}
          >
            View Detailed Breakdown
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
