import { TrendingUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { Link } from "react-router-dom";

export function GrowthDriversCard() {
  const { recommendations } = useTrackedRecommendations();

  // Get implemented/measured recommendations with positive impact
  const growthDrivers = recommendations
    .filter(
      (r) =>
        (r.status === "measured" || r.status === "implemented") &&
        (r.realizedImpact?.actualValueNumeric || 0) > 0
    )
    .sort(
      (a, b) =>
        (b.realizedImpact?.actualValueNumeric || b.potentialImpactNumeric || 0) -
        (a.realizedImpact?.actualValueNumeric || a.potentialImpactNumeric || 0)
    )
    .slice(0, 5);

  const totalValue = growthDrivers.reduce(
    (sum, d) => sum + (d.realizedImpact?.actualValueNumeric || 0),
    0
  );

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-base">Growth Drivers</CardTitle>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
            {formatValue(totalValue)} delivered
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Implemented recommendations driving positive performance
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {growthDrivers.length > 0 ? (
          growthDrivers.map((driver) => (
            <div
              key={driver.id}
              className="flex items-start gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg group"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {driver.title}
                  </p>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">
                    {driver.realizedImpact?.actualValue || driver.potentialImpact}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{driver.agentName}</span>
                  <Link
                    to={`/ai-agents/${driver.agentId}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-3 w-3 text-primary" />
                  </Link>
                </div>
                {driver.status === "measured" && driver.roiPercentage && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {driver.roiPercentage}% of predicted
                  </Badge>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No growth drivers yet</p>
            <p className="text-xs mt-1">
              Implement agent recommendations to track their impact
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
