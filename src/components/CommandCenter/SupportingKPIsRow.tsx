import { useState } from "react";
import { TrendingUp, TrendingDown, Search, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPIDrilldownSheet } from "./KPIDrilldownSheet";
import { KPISelector } from "./KPISelector";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { metricsData } from "@/data/metricsData";

export interface SupportingKPI {
  id: string;
  name: string;
  value: string;
  change: number;
  trend: "up" | "down";
  whyAttribution: string;
  agentSource?: string;
}

function mapMetricToKPI(metric: typeof metricsData[0]): SupportingKPI {
  const change = metric.displayData.changePercent;
  const isNegativeGood = metric.valueSentiment === "up-bad";
  
  return {
    id: metric.id,
    name: metric.name,
    value: metric.displayData.currentValue,
    change: Math.abs(change),
    trend: change >= 0 ? "up" : "down",
    whyAttribution: metric.displayData.insight.text,
    agentSource: `${metric.category} Monitor`,
  };
}

export function SupportingKPIsRow() {
  const { selectedKPIIds, dateRange } = useCommandCenter();
  const [selectedKPI, setSelectedKPI] = useState<SupportingKPI | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Get KPIs from metrics data based on selected IDs
  const kpis: SupportingKPI[] = selectedKPIIds
    .map((id) => metricsData.find((m) => m.id === id))
    .filter((m): m is typeof metricsData[0] => m !== undefined)
    .map(mapMetricToKPI);

  const handleKPIClick = (kpi: SupportingKPI) => {
    setSelectedKPI(kpi);
    setSheetOpen(true);
  };

  // Get comparison label based on date range
  const getComparisonLabel = () => {
    switch (dateRange) {
      case "today": return "vs. yesterday";
      case "yesterday": return "vs. day before";
      case "week-over-week": return "vs. same week last year";
      case "last-quarter": return "vs. previous quarter";
      case "ytd": return "vs. same period last year";
      default: return "vs. previous period";
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Supporting KPIs</h2>
            <span className="text-xs text-muted-foreground">({getComparisonLabel()})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setSelectorOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configure
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-3">No KPIs configured</p>
                <Button variant="outline" onClick={() => setSelectorOpen(true)}>
                  Select KPIs
                </Button>
              </CardContent>
            </Card>
          ) : (
            kpis.map((kpi) => {
              // Find the metric to check valueSentiment
              const metric = metricsData.find((m) => m.id === kpi.id);
              const isNegativeGood = metric?.valueSentiment === "up-bad";
              const isPositive = isNegativeGood
                ? kpi.trend === "down"
                : kpi.trend === "up";

              return (
                <Card
                  key={kpi.id}
                  className="relative group hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-muted-foreground">{kpi.name}</span>
                    </div>

                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-2xl font-semibold text-foreground">{kpi.value}</span>
                      <div
                        className={`flex items-center gap-1 text-sm ${
                          isPositive ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {kpi.trend === "up" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span>
                          {kpi.trend === "up" ? "+" : "-"}
                          {kpi.change}%
                        </span>
                      </div>
                    </div>

                    {/* Deep Dive Button - Always visible for touch accessibility */}
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleKPIClick(kpi)}
                      >
                        <Search className="h-3 w-3" />
                        Deep Dive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <KPIDrilldownSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        kpi={selectedKPI}
      />

      <KPISelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
      />
    </>
  );
}
