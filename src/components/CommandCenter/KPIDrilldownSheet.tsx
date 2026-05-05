import { TrendingUp, TrendingDown, Bot, Zap, Calendar, ArrowRight, Layers } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DimensionalDrilldown } from "./DimensionalDrilldown";

interface ContributingFactor {
  id: string;
  type: "recommendation" | "anomaly" | "external";
  title: string;
  source: string;
  agentId?: string;
  impact: string;
  impactDirection: "positive" | "negative";
  confidence: "high" | "medium" | "low";
}

interface KPIData {
  id: string;
  name: string;
  value: string;
  change: number;
  trend: "up" | "down";
  whyAttribution: string;
  agentSource?: string;
}

interface KPIDrilldownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: KPIData | null;
}

// Demo historical data
const generateHistoricalData = (kpiName: string) => {
  const baseValues: Record<string, number[]> = {
    "Customer Acquisition": [2100, 2250, 2400, 2350, 2500, 2650, 2700, 2847],
    "Profit Margin": [26.5, 26.2, 25.8, 25.5, 25.1, 24.8, 24.7, 24.6],
    "NPS Score": [65, 66, 67, 68, 69, 70, 71, 72],
    "Churn Rate": [2.8, 2.7, 2.7, 2.6, 2.5, 2.4, 2.4, 2.3],
  };

  const values = baseValues[kpiName] || [100, 105, 102, 108, 110, 112, 115, 118];
  const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

  return months.map((month, i) => ({
    month,
    value: values[i],
  }));
};

// Demo contributing factors per KPI
const CONTRIBUTING_FACTORS: Record<string, ContributingFactor[]> = {
  "Customer Acquisition": [
    {
      id: "cf-1",
      type: "recommendation",
      title: "Enterprise sales team expansion",
      source: "Sales Performance Tracker",
      agentId: "agent-3",
      impact: "+340 new logos",
      impactDirection: "positive",
      confidence: "high",
    },
    {
      id: "cf-2",
      type: "recommendation",
      title: "Referral program optimization",
      source: "Customer Experience Guardian",
      agentId: "agent-4",
      impact: "+180 referrals",
      impactDirection: "positive",
      confidence: "medium",
    },
    {
      id: "cf-3",
      type: "external",
      title: "Q4 marketing campaign",
      source: "Marketing Team",
      impact: "+420 leads converted",
      impactDirection: "positive",
      confidence: "high",
    },
  ],
  "Profit Margin": [
    {
      id: "cf-4",
      type: "anomaly",
      title: "Shipping cost increase in Furniture category",
      source: "Profit Margin Watchdog",
      agentId: "agent-1",
      impact: "-1.8% margin impact",
      impactDirection: "negative",
      confidence: "high",
    },
    {
      id: "cf-5",
      type: "recommendation",
      title: "Vendor contract renegotiation",
      source: "Profit Margin Watchdog",
      agentId: "agent-1",
      impact: "+0.5% margin recovery",
      impactDirection: "positive",
      confidence: "medium",
    },
    {
      id: "cf-6",
      type: "external",
      title: "Raw material price volatility",
      source: "External Market",
      impact: "-0.8% margin pressure",
      impactDirection: "negative",
      confidence: "medium",
    },
  ],
  "NPS Score": [
    {
      id: "cf-7",
      type: "recommendation",
      title: "Support response time improvement",
      source: "Customer Experience Guardian",
      agentId: "agent-4",
      impact: "+4 NPS points",
      impactDirection: "positive",
      confidence: "high",
    },
    {
      id: "cf-8",
      type: "recommendation",
      title: "Proactive outreach to at-risk accounts",
      source: "Customer Experience Guardian",
      agentId: "agent-4",
      impact: "+2 NPS points",
      impactDirection: "positive",
      confidence: "medium",
    },
  ],
  "Churn Rate": [
    {
      id: "cf-9",
      type: "recommendation",
      title: "Retention campaign for enterprise segment",
      source: "Customer Experience Guardian",
      agentId: "agent-4",
      impact: "-0.3% churn reduction",
      impactDirection: "positive",
      confidence: "high",
    },
    {
      id: "cf-10",
      type: "recommendation",
      title: "Product onboarding improvements",
      source: "Product Line Evaluator",
      agentId: "agent-7",
      impact: "-0.1% early churn",
      impactDirection: "positive",
      confidence: "medium",
    },
  ],
};

const typeColors = {
  recommendation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anomaly: "bg-amber-50 text-amber-700 border-amber-200",
  external: "bg-blue-50 text-blue-700 border-blue-200",
};

const confidenceLabels = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function KPIDrilldownSheet({ open, onOpenChange, kpi }: KPIDrilldownSheetProps) {
  if (!kpi) return null;

  const historicalData = generateHistoricalData(kpi.name);
  const factors = CONTRIBUTING_FACTORS[kpi.name] || [];
  const isPositive =
    (kpi.trend === "up" && kpi.change > 0) ||
    (kpi.trend === "down" && kpi.change < 0 && kpi.name.includes("Churn"));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              KPI Breakdown
            </Badge>
          </div>
          <SheetTitle className="text-xl">{kpi.name}</SheetTitle>
          <SheetDescription>{kpi.whyAttribution}</SheetDescription>
        </SheetHeader>

        {/* Current Value */}
        <div className="flex items-end justify-between py-4 border-b">
          <div>
            <p className="text-sm text-muted-foreground">Current Value</p>
            <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
          </div>
          <div
            className={`flex items-center gap-1 text-lg font-medium ${
              isPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {kpi.trend === "up" ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
            <span>
              {kpi.change > 0 ? "+" : ""}
              {kpi.change}%
            </span>
          </div>
        </div>

        {/* Historical Trend */}
        <div className="py-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">8-Month Trend</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Separator />

        {/* Tabs for Factors and Dimensional Breakdown */}
        <div className="py-6">
          <Tabs defaultValue="factors" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="factors" className="text-xs gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Factors ({factors.length})
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Breakdown
              </TabsTrigger>
            </TabsList>
            <TabsContent value="factors" className="mt-4">
              <div className="space-y-3">
                {factors.map((factor) => (
                  <div
                    key={factor.id}
                    className={`p-3 border rounded-lg ${
                      factor.impactDirection === "positive"
                        ? "bg-emerald-50/50 border-emerald-100"
                        : "bg-red-50/50 border-red-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${typeColors[factor.type]}`}
                          >
                            {factor.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {confidenceLabels[factor.confidence]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">{factor.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {factor.agentId ? (
                            <Link
                              to={`/ai-agents/${factor.agentId}`}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Bot className="h-3 w-3" />
                              {factor.source}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{factor.source}</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold shrink-0 ${
                          factor.impactDirection === "positive"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {factor.impact}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="breakdown" className="mt-4">
              <DimensionalDrilldown
                metricId={kpi.id}
                metricName={kpi.name}
              />
            </TabsContent>
          </Tabs>
        </div>

        {kpi.agentSource && (
          <>
            <Separator />
            <div className="py-6">
              <p className="text-xs text-muted-foreground mb-2">Primary monitoring agent</p>
              <Link
                to={`/ai-agents/agent-${kpi.agentSource.includes("Margin") ? "1" : kpi.agentSource.includes("Sales") ? "3" : "4"}`}
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{kpi.agentSource}</p>
                  <p className="text-xs text-muted-foreground">View agent details</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
