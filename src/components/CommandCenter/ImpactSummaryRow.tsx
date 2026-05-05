import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAttribution } from "@/contexts/AttributionContext";
import { MiniWaterfallChart } from "./MiniWaterfallChart";
import { useState } from "react";
import { AttributionDrilldownSheet } from "@/components/Impact/AttributionDrilldownSheet";

export function ImpactSummaryRow() {
  const { performanceSummary, formatCurrency, formatPercentage } = useAttribution();
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  if (!performanceSummary) return null;

  const { predictedImpact, realizedImpact, overallROI } = performanceSummary;

  const handleOpenDrilldown = (category?: string) => {
    setDrilldownCategory(category || null);
    setDrilldownOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Predicted Impact */}
        <Card className="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Target className="h-3.5 w-3.5" />
              <span>Predicted Impact</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(predictedImpact)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From 12 approved actions
            </p>
          </CardContent>
        </Card>

        {/* Realized Impact */}
        <Card className="bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Realized Impact</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(realizedImpact)}
            </p>
            <div className="flex items-center gap-1 text-xs mt-1">
              {realizedImpact >= predictedImpact ? (
                <>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(realizedImpact - predictedImpact)} above target
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400">
                    {formatCurrency(predictedImpact - realizedImpact)} below target
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overall ROI */}
        <Card className="bg-gradient-to-br from-violet-50/50 to-background dark:from-violet-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Overall ROI</span>
            </div>
            <p className={`text-2xl font-bold ${overallROI >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {overallROI.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceSummary.galenPercentage.toFixed(0)}% attributed to Galen
            </p>
          </CardContent>
        </Card>

        {/* View Breakdown */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-4 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Attribution Breakdown</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">Galen</span>
                  <span className="font-medium">{performanceSummary.galenPercentage.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">External</span>
                  <span className="font-medium">{performanceSummary.externalPercentage.toFixed(0)}%</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => handleOpenDrilldown()}
              >
                Details
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mini Waterfall */}
      <MiniWaterfallChart onSegmentClick={handleOpenDrilldown} />

      <AttributionDrilldownSheet
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        category={drilldownCategory}
      />
    </>
  );
}