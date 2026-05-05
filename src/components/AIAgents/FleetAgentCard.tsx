import { Bot, Clock, AlertTriangle, Play, Pause, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Agent } from "@/types/agent";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface FleetAgentCardProps {
  agent: Agent;
  anomalyCount?: number;
  recommendationCount?: number;
  onToggleStatus?: (agentId: string, newStatus: 'active' | 'paused') => void;
}

export function FleetAgentCard({ 
  agent, 
  anomalyCount = 0, 
  recommendationCount = 0,
  onToggleStatus 
}: FleetAgentCardProps) {
  const navigate = useNavigate();

  const statusColors = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    paused: "bg-muted text-muted-foreground",
    running: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    "needs-input": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
  };

  const categoryColors = {
    product: "border-l-blue-500",
    revenue: "border-l-emerald-500",
    operations: "border-l-amber-500",
    risk: "border-l-red-500",
  };

  return (
    <Card 
      className={`border-l-4 ${categoryColors[agent.category]} hover:bg-muted/30 transition-colors cursor-pointer`}
      onClick={() => navigate(`/ai-agents/${agent.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-sm font-medium text-foreground truncate">{agent.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {agent.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${statusColors[agent.status]}`}>
                {agent.status}
              </Badge>
              {anomalyCount > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/50 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {anomalyCount}
                </Badge>
              )}
              {recommendationCount > 0 && (
                <Badge variant="outline" className="text-xs text-primary bg-primary/10 gap-1">
                  {recommendationCount} recs
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {agent.lastRunAt && !isNaN(new Date(agent.lastRunAt).getTime()) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(agent.lastRunAt), { addSuffix: true })}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/ai-agents/${agent.id}`);
                }}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus?.(agent.id, agent.status === 'active' ? 'paused' : 'active');
                }}
              >
                {agent.status === 'active' ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
