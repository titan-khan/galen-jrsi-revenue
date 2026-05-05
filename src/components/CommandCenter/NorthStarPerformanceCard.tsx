import { TrendingUp, TrendingDown, Sparkles, Globe, HelpCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAttribution } from "@/contexts/AttributionContext";
import { ConfidenceBadge } from "@/components/Impact/ConfidenceBadge";
import { useState } from "react";
import { AttributionDrilldownSheet } from "@/components/Impact/AttributionDrilldownSheet";

export function NorthStarPerformanceCard() {
  const { performanceSummary, formatCurrency, formatPercentage } = useAttribution();
  const [showDrilldown, setShowDrilldown] = useState(false);

  if (!performanceSummary) return null;

  const isPositive = performanceSummary.totalChangePercentage >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {performanceSummary.period.label}
            </span>
            <ConfidenceBadge level={performanceSummary.overallConfidence} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-lg font-semibold text-foreground">
              {performanceSummary.metricName}
            </h2>
            <TrendIcon className={`h-5 w-5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Primary Metric Display */}
          <div className="text-center py-4">
            <div className={`text-4xl font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatPercentage(performanceSummary.totalChangePercentage)}
              <span className="text-xl font-medium text-muted-foreground ml-2">
                ({isPositive ? '+' : ''}{formatCurrency(performanceSummary.totalChange)})
              </span>
            </div>
            <div className="text-lg text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <span>{formatCurrency(performanceSummary.startValue)}</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">{formatCurrency(performanceSummary.endValue)}</span>
            </div>
          </div>

          {/* Attribution Split Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Impact Attribution</span>
              <span className="text-muted-foreground">MECE Breakdown</span>
            </div>
            
            <div className="h-3 rounded-full overflow-hidden flex bg-muted/30">
              <div 
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${performanceSummary.galenPercentage}%` }}
              />
              <div 
                className="bg-slate-400 transition-all duration-500"
                style={{ width: `${performanceSummary.externalPercentage}%` }}
              />
              <div 
                className="bg-amber-400 transition-all duration-500"
                style={{ width: `${performanceSummary.unexplainedPercentage}%` }}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-muted-foreground">Galen</span>
                <span className="font-medium text-foreground">{Math.round(performanceSummary.galenPercentage)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-muted-foreground">External</span>
                <span className="font-medium text-foreground">{Math.round(performanceSummary.externalPercentage)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-muted-foreground">Unexplained</span>
                <span className="font-medium text-foreground">{Math.round(performanceSummary.unexplainedPercentage)}%</span>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{Math.round(performanceSummary.galenPercentage)}%</span> of {performanceSummary.period.label.split(' ')[0]}'s growth is attributed to Galen actions, 
            with <span className="font-medium text-foreground">{Math.round(performanceSummary.externalPercentage)}%</span> from external factors.
          </p>

          {/* Action Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowDrilldown(true)}
          >
            View Detailed Breakdown
          </Button>
        </CardContent>
      </Card>

      <AttributionDrilldownSheet 
        open={showDrilldown} 
        onOpenChange={setShowDrilldown} 
      />
    </>
  );
}
