import { TrendingUp, Bot, ExternalLink, AlertTriangle, CheckCircle, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { Link, useNavigate } from "react-router-dom";

interface AgentInsight {
  id: string;
  type: "analysis" | "anomaly" | "recommendation" | "milestone";
  title: string;
  agentName: string;
  agentId: string;
  timestamp: string;
  timeGroup: "today" | "yesterday" | "this-week";
}

const typeIcons = {
  analysis: TrendingUp,
  anomaly: AlertTriangle,
  recommendation: Bot,
  milestone: CheckCircle,
};

const typeColors = {
  analysis: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  anomaly: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  recommendation: "text-primary bg-primary/10",
  milestone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
};

// Transform sidebar insights to AgentInsight format
function transformInsights(sidebarInsights: ReturnType<typeof useSidebar>['insights']): AgentInsight[] {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
  
  return sidebarInsights.map((insight, idx) => {
    const insightDate = new Date(insight.timestamp);
    const dateString = insightDate.toDateString();
    let timeGroup: AgentInsight['timeGroup'] = 'this-week';
    if (dateString === today) timeGroup = 'today';
    else if (dateString === yesterday) timeGroup = 'yesterday';

    const typeMap: Record<string, AgentInsight['type']> = {
      discovery: 'analysis',
      risk: 'anomaly',
      milestone: 'milestone',
      status: 'recommendation',
    };

    return {
      id: insight.id,
      type: typeMap[insight.type] || 'analysis',
      title: insight.message,
      agentName: insight.source,
      agentId: `agent-${idx}`,
      timestamp: formatTimestamp(insight.timestamp),
      timeGroup,
    };
  });
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return 'Yesterday';
}

export function IntelligenceAccordion() {
  const navigate = useNavigate();
  const { disclosureState, setExpandedIntelligenceSection } = useCommandCenter();
  const { recommendations } = useTrackedRecommendations();
  const { insights } = useSidebar();

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

  const transformedInsights = transformInsights(insights);
  const todayInsightsCount = transformedInsights.filter((i) => i.timeGroup === "today").length;

  const handleTrackInActionCenter = () => {
    navigate('/action-center');
  };

  const groupedInsights = {
    today: transformedInsights.filter((i) => i.timeGroup === "today"),
    yesterday: transformedInsights.filter((i) => i.timeGroup === "yesterday"),
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={disclosureState.expandedIntelligenceSection || undefined}
      onValueChange={(value) => setExpandedIntelligenceSection(value || null)}
      className="space-y-2"
    >
      {/* Growth Drivers Section */}
      <AccordionItem value="growth-drivers" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium">Growth Drivers</p>
              <p className="text-sm text-muted-foreground">
                Implemented recommendations driving positive performance
              </p>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 mr-2">
              {formatValue(totalValue)} delivered
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <div className="space-y-3">
            {growthDrivers.length > 0 ? (
              growthDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-start gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg group"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {driver.title}
                      </p>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
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
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No growth drivers yet</p>
                <p className="text-xs mt-1">
                  Implement agent recommendations to track their impact
                </p>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Agent Insights Section */}
      <AccordionItem value="agent-insights" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-primary/10 rounded">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium">Agent Insights</p>
              <p className="text-sm text-muted-foreground">
                Recent observations from your AI agents
              </p>
            </div>
            <div className="flex items-center gap-2 mr-2">
              <Badge variant="outline">{todayInsightsCount} today</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrackInActionCenter();
                }}
              >
                <Inbox className="h-3 w-3" />
                Action Center
              </Button>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <div className="space-y-4">
            {transformedInsights.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Bot className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No insights yet</p>
                <p className="text-xs mt-1">
                  Create agents to start receiving insights
                </p>
              </div>
            ) : (
              Object.entries(groupedInsights).map(([group, insights]) => {
                if (insights.length === 0) return null;
                const groupLabel = group === "today" ? "Today" : "Yesterday";

                return (
                  <div key={group}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {groupLabel}
                    </p>
                    <div className="space-y-2">
                      {insights.map((insight) => {
                        const Icon = typeIcons[insight.type];
                        return (
                          <div
                            key={insight.id}
                            className="flex items-start gap-3 p-2 hover:bg-muted/30 rounded-lg transition-colors group"
                          >
                            <div className={`p-1.5 rounded-md ${typeColors[insight.type]}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground line-clamp-1">
                                {insight.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {insight.agentName}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {insight.timestamp}
                                </span>
                                <Link
                                  to={`/ai-agents/${insight.agentId}`}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
