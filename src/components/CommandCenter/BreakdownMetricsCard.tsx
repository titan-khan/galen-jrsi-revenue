import { useState } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, Search, Target, CheckCircle2, DollarSign, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAttribution } from "@/contexts/AttributionContext";
import { getSupportingMetrics } from "@/data/supportingMetrics";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";

interface BreakdownMetricsCardProps {
  northStarId?: string;
}

export function BreakdownMetricsCard({ northStarId = 'superstore-sales' }: BreakdownMetricsCardProps) {
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);
  const { performanceSummary, formatCurrency } = useAttribution();
  const { recommendations } = useTrackedRecommendations();
  
  const supportingMetrics = getSupportingMetrics(northStarId);
  const measuredRecs = recommendations.filter(r => r.status === 'measured' && r.realizedImpact).slice(0, 2);
  
  // Target status
  const target = 12000000; // $12M
  const current = performanceSummary?.endValue || 11830000;
  const isOnTrack = current >= target * 0.9;

  const predictedImpact = performanceSummary?.predictedImpact || 0;
  const realizedImpact = performanceSummary?.realizedImpact || 0;
  const overallROI = performanceSummary?.overallROI || 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Breakdown Metrics</CardTitle>
          <Badge 
            variant="outline" 
            className={isOnTrack 
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }
          >
            <Target className="h-3 w-3 mr-1" />
            Target: $12M {isOnTrack ? <CheckCircle2 className="h-3 w-3 ml-1" /> : null}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ROI Summary Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-border/50 bg-blue-500/5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Target className="h-3 w-3" />
              Predicted
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(predictedImpact)}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-emerald-500/5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              Realized
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(realizedImpact)}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-violet-500/5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <BarChart3 className="h-3 w-3" />
              ROI
            </div>
            <div className={`text-lg font-bold ${overallROI >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {overallROI.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* 2x2 Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {supportingMetrics.slice(0, 4).map((metric) => {
            const isPositive = metric.trend === 'up';
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;
            
            return (
              <div 
                key={metric.id}
                className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {metric.name}
                  </span>
                </div>
                <div className="text-xl font-bold text-foreground">
                  {metric.value}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
                  <span className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {metric.changeFormatted}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span>{metric.previousValue}</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                  <span>{metric.value}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Why is this changing? Collapsible */}
        <Collapsible open={isWhyExpanded} onOpenChange={setIsWhyExpanded}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-auto py-2 px-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="text-emerald-500">✨</span>
                Why is this changing?
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isWhyExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 pl-3">
              {measuredRecs.length > 0 ? (
                measuredRecs.map((rec) => (
                  <div 
                    key={rec.id}
                    className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/30"
                  >
                    <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{rec.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Contributed +${((rec.realizedImpact?.actualValueNumeric || 0) / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No measured recommendations yet.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Deep Dive Button */}
        <Button variant="outline" className="w-full gap-2">
          <Search className="h-4 w-4" />
          Deep Dive
        </Button>
      </CardContent>
    </Card>
  );
}
