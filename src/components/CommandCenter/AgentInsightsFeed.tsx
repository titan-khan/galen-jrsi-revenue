import { Bot, TrendingUp, AlertTriangle, CheckCircle, ExternalLink, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";

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
  analysis: "text-blue-600 bg-blue-50",
  anomaly: "text-amber-600 bg-amber-50",
  recommendation: "text-primary bg-primary/10",
  milestone: "text-emerald-600 bg-emerald-50",
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

export function AgentInsightsFeed() {
  const navigate = useNavigate();
  const { insights } = useSidebar();
  
  const transformedInsights = transformInsights(insights);
  
  const groupedInsights = {
    today: transformedInsights.filter((i) => i.timeGroup === "today"),
    yesterday: transformedInsights.filter((i) => i.timeGroup === "yesterday"),
    "this-week": transformedInsights.filter((i) => i.timeGroup === "this-week"),
  };

  const handleTrackInActionCenter = () => {
    navigate('/action-center');
  };

  const todayCount = groupedInsights.today.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Agent Insights Feed</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {todayCount} today
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleTrackInActionCenter}
            >
              <Inbox className="h-3 w-3" />
              Action Center
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Recent observations from your AI agents
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {transformedInsights.length === 0 ? (
          <div className="py-8 text-center">
            <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No insights yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create agents to start receiving insights
            </p>
          </div>
        ) : (
          Object.entries(groupedInsights).map(([group, insights]) => {
            if (insights.length === 0) return null;
            const groupLabel =
              group === "today"
                ? "Today"
                : group === "yesterday"
                ? "Yesterday"
                : "This Week";

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
                        <div
                          className={`p-1.5 rounded-md ${typeColors[insight.type]}`}
                        >
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
      </CardContent>
    </Card>
  );
}
