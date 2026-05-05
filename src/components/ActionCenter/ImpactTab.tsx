import { useState } from "react";
import { TrendingUp, TrendingDown, CheckCircle, BarChart3, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrackedRecommendation } from "@/types/agent";
import { ImpactCategory } from "@/types/attribution";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  PerformanceJustificationCard,
  ImpactWaterfallChart,
  IssueTreeView,
  ExternalFactorsPanel,
  AttributionDrilldownSheet,
  MonthlyReportExport,
} from "@/components/Impact";

interface ImpactTabProps {
  recommendations: TrackedRecommendation[];
}

export function ImpactTab({ recommendations }: ImpactTabProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [drilldownCategory, setDrilldownCategory] = useState<ImpactCategory | undefined>();
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [showMeasured, setShowMeasured] = useState(true);

  const measuredRecs = recommendations.filter(r => r.status === 'measured' && r.realizedImpact);
  const implementedRecs = recommendations.filter(r => r.status === 'implemented');

  const totalPredicted = measuredRecs.reduce((sum, r) => sum + (r.potentialImpactNumeric || 0), 0);
  const totalRealized = measuredRecs.reduce((sum, r) => sum + (r.realizedImpact?.actualValueNumeric || 0), 0);
  const overallROI = totalPredicted > 0 ? Math.round((totalRealized / totalPredicted) * 100) : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const handleSegmentClick = (category: ImpactCategory) => {
    setDrilldownCategory(category);
    setDrilldownOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Performance Justification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceJustificationCard 
          onViewDetails={() => setShowDetails(!showDetails)} 
        />
        <ImpactWaterfallChart onSegmentClick={handleSegmentClick} />
      </div>

      {/* Detailed Views (collapsible) */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleContent className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Detailed Breakdown</h3>
            <MonthlyReportExport />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IssueTreeView onNodeClick={handleSegmentClick} />
            <ExternalFactorsPanel />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Legacy Summary Cards (hidden when details shown) */}
      {!showDetails && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm">Predicted Impact</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPredicted)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                From {measuredRecs.length} measured recommendations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Realized Impact</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRealized)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Validated business value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Overall ROI</span>
              </div>
              <p className={`text-2xl font-bold ${overallROI >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {overallROI}%
              </p>
              <Progress 
                value={Math.min(overallROI, 150)} 
                max={150} 
                className="h-1.5 mt-2" 
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Measured Recommendations */}
      <Collapsible open={showMeasured} onOpenChange={setShowMeasured}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 p-0 h-auto hover:bg-transparent">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Measured Recommendations ({measuredRecs.length})
              </h3>
              {showMeasured ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <div className="space-y-3 mt-3">
            {measuredRecs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recommendations have been measured yet</p>
                  <p className="text-xs mt-1">Impact will appear here once implementations are measured</p>
                </CardContent>
              </Card>
            ) : (
              measuredRecs.map((rec) => {
                const roi = rec.roiPercentage || 0;
                return (
                  <Card key={rec.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-foreground mb-1">{rec.title}</h4>
                          <Link
                            to={`/ai-agents/${rec.agentId}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {rec.agentName}
                          </Link>
                          {rec.realizedImpact?.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              "{rec.realizedImpact.notes}"
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-muted-foreground">Predicted:</span>
                            <span className="text-sm font-medium">{rec.potentialImpact}</span>
                          </div>
                          <div className="flex items-center gap-2 justify-end mt-1">
                            <span className="text-xs text-muted-foreground">Actual:</span>
                            <span className="text-sm font-bold text-emerald-600">
                              {rec.realizedImpact?.actualValue}
                            </span>
                          </div>
                          <Badge 
                            variant={roi >= 100 ? "default" : "secondary"}
                            className={`mt-2 ${roi >= 100 ? 'bg-emerald-600' : ''}`}
                          >
                            {roi >= 100 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {roi}% ROI
                          </Badge>
                        </div>
                      </div>
                      {rec.realizedImpact?.measuredAt && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Measured on {format(new Date(rec.realizedImpact.measuredAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Awaiting Measurement */}
      {implementedRecs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            Awaiting Measurement ({implementedRecs.length})
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {implementedRecs.map((rec) => (
              <Card key={rec.id} className="border-dashed">
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Implemented {rec.implementedAt && format(new Date(rec.implementedAt), "MMM d")}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">{rec.potentialImpact}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Drilldown Sheet */}
      <AttributionDrilldownSheet 
        open={drilldownOpen} 
        onOpenChange={setDrilldownOpen}
        category={drilldownCategory}
      />
    </div>
  );
}
