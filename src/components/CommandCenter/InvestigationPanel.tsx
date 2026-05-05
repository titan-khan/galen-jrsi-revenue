import { useState, useEffect } from "react";
import { Bot, BarChart3, Lightbulb, ArrowRight, Loader2, AlertTriangle, TrendingDown, TrendingUp, Layers } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents } from "@/contexts/AgentsContext";
import { metricsData } from "@/data/metricsData";
import { useNavigate } from "react-router-dom";
import { InvestigationActionCard } from "./InvestigationActionCard";
import { DimensionalDrilldown } from "./DimensionalDrilldown";

interface RiskAlert {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  source: string;
  agentId: string;
  potentialImpact: string;
  status: string;
  detectedAt: string;
}

interface InvestigationPanelProps {
  risk: RiskAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock AI synthesis for demo - in production this would call an AI endpoint
const generateSynthesis = (risk: RiskAlert, agentName: string, relatedMetrics: typeof metricsData) => {
  const syntheses: Record<string, { summary: string; rootCauses: string[]; recommendations: string[] }> = {
    "risk-1": {
      summary: "Analysis indicates a 23% increase in carrier rates for oversized items, primarily affecting the Furniture category. This correlates with Q3 carrier contract renegotiations and increased fuel surcharges.",
      rootCauses: [
        "Carrier rate increases of 15-23% for oversized freight",
        "Fuel surcharge adjustments not reflected in product pricing",
        "Shift in product mix toward larger furniture items",
      ],
      recommendations: [
        "Renegotiate carrier contracts with volume commitments",
        "Implement dynamic shipping cost pass-through for oversized items",
        "Review furniture pricing strategy to maintain margins",
      ],
    },
    "risk-2": {
      summary: "Electronics return rate has increased 0.6% over the past 3 months. Pattern analysis suggests a batch quality issue with a specific supplier shipment received in October.",
      rootCauses: [
        "Supplier batch #EL-2024-1042 shows 3x higher defect rate",
        "Customer complaints cite 'product not as described' (42%)",
        "Missing accessories reported in 18% of returns",
      ],
      recommendations: [
        "Initiate quality audit with affected supplier",
        "Review product listings for accuracy",
        "Implement pre-shipment inspection for flagged batches",
      ],
    },
    "risk-3": {
      summary: "Two enterprise accounts showing signs of disengagement: reduced platform usage, delayed contract discussions, and increased support tickets. Combined ARR at risk: $240K.",
      rootCauses: [
        "Support ticket resolution time increased 40% for enterprise tier",
        "Key stakeholder changes at both accounts",
        "Competitor outreach confirmed via customer success calls",
      ],
      recommendations: [
        "Schedule executive business reviews with both accounts",
        "Assign dedicated support resources to reduce resolution time",
        "Prepare competitive positioning materials",
      ],
    },
  };

  return syntheses[risk.id] || {
    summary: `Investigating ${risk.title}. Analyzing patterns across ${relatedMetrics.length} related metrics and ${agentName} agent data.`,
    rootCauses: ["Analysis in progress..."],
    recommendations: ["Pending deeper investigation"],
  };
};

export function InvestigationPanel({ risk, open, onOpenChange }: InvestigationPanelProps) {
  const navigate = useNavigate();
  const { getAgentById, agents } = useAgents();
  const [isLoading, setIsLoading] = useState(true);
  const [synthesis, setSynthesis] = useState<{
    summary: string;
    rootCauses: string[];
    recommendations: string[];
  } | null>(null);

  const sourceAgent = risk ? getAgentById(risk.agentId) : null;
  
  // Find related metrics based on the agent's monitored metrics
  const relatedMetrics = sourceAgent?.monitoredMetrics
    ?.map(m => metricsData.find(metric => metric.id === m.metricId))
    .filter(Boolean) || [];

  // Find other agents that might have relevant insights
  const relatedAgents = agents.filter(a => 
    a.id !== risk?.agentId && 
    (a.category === sourceAgent?.category || 
     a.monitoredMetrics?.some(m => relatedMetrics.some(rm => rm?.id === m.metricId)))
  ).slice(0, 3);

  useEffect(() => {
    if (open && risk) {
      setIsLoading(true);
      setSynthesis(null);
      // Simulate AI processing
      const timer = setTimeout(() => {
        const result = generateSynthesis(risk, sourceAgent?.name || "Unknown", relatedMetrics as typeof metricsData);
        setSynthesis(result);
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, risk, sourceAgent?.name]);

  if (!risk) return null;

  const severityColors = {
    high: "text-red-600 bg-red-50 border-red-200",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    low: "text-blue-600 bg-blue-50 border-blue-200",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Investigation</SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Risk Summary */}
            <div className={`p-4 rounded-lg border ${severityColors[risk.severity]}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <Badge variant="outline" className={`text-xs capitalize ${severityColors[risk.severity]}`}>
                  {risk.severity} severity
                </Badge>
              </div>
              <h3 className="font-medium text-foreground">{risk.title}</h3>
              <p className="text-sm mt-1 text-muted-foreground">
                Detected by {risk.source} • {risk.detectedAt}
              </p>
              <p className="text-sm font-medium mt-2 text-foreground">
                Impact: {risk.potentialImpact}
              </p>
            </div>

            {/* AI Synthesis Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">AI-Synthesized Analysis</h4>
              </div>

              {isLoading ? (
                <Card>
                  <CardContent className="py-8 flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing data from agents and metrics...
                    </p>
                  </CardContent>
                </Card>
              ) : synthesis ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-foreground leading-relaxed">
                        {synthesis.summary}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        Root Causes Identified
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {synthesis.rootCauses.map((cause, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-primary font-medium">{idx + 1}.</span>
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Recommended Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {synthesis.recommendations.map((rec, idx) => (
                        <InvestigationActionCard
                          key={idx}
                          recommendation={rec}
                          index={idx}
                          riskId={risk.id}
                          riskTitle={risk.title}
                          agentId={risk.agentId}
                          agentName={sourceAgent?.name || "Unknown Agent"}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Related Metrics with Dimensional Drilldown */}
            <div>
              <Tabs defaultValue="metrics" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="metrics" className="text-xs gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Related Metrics
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="text-xs gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Drill into Data
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="metrics" className="mt-3">
                  <div className="space-y-2">
                    {relatedMetrics.length > 0 ? (
                      relatedMetrics.map((metric) => metric && (
                        <div
                          key={metric.id}
                          className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{metric.name}</p>
                              <p className="text-xs text-muted-foreground">{metric.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{metric.displayData?.currentValue}</p>
                              <p className={`text-xs ${(metric.displayData?.changePercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(metric.displayData?.changePercent ?? 0) >= 0 ? '+' : ''}{metric.displayData?.changePercent}%
                              </p>
                              {metric.displayData?.comparisonLabel && (
                                <p className="text-[10px] text-muted-foreground/60">{metric.displayData.comparisonLabel}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No directly related metrics found.</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="breakdown" className="mt-3">
                  {relatedMetrics.length > 0 && relatedMetrics[0] ? (
                    <DimensionalDrilldown
                      metricId={relatedMetrics[0].id}
                      metricName={relatedMetrics[0].name}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No metrics available for dimensional breakdown
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <Separator />

            {/* Related Agents */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Contributing Agents</h4>
              </div>
              <div className="space-y-2">
                {/* Source agent first */}
                {sourceAgent && (
                  <div
                    className="p-3 border rounded-lg bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/ai-agents/${sourceAgent.id}`);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{sourceAgent.name}</p>
                          <p className="text-xs text-muted-foreground">Primary source</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
                
                {/* Related agents */}
                {relatedAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/ai-agents/${agent.id}`);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{agent.category}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex-shrink-0 pt-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate('/action-center');
            }}
          >
            View in Action Center
          </Button>
          {sourceAgent && (
            <Button 
              onClick={() => {
                onOpenChange(false);
                navigate(`/ai-agents/${sourceAgent.id}`);
              }}
            >
              View Agent
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
