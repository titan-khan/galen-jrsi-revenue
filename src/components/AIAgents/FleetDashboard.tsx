import { Bot, Activity, AlertTriangle, Inbox, ArrowRight, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/contexts/AgentsContext";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { FleetAgentCard } from "./FleetAgentCard";
import { Link, useNavigate } from "react-router-dom";

export function FleetDashboard() {
  const navigate = useNavigate();
  const { agents } = useAgents();
  const { recommendations } = useTrackedRecommendations();

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    running: agents.filter(a => a.status === 'running').length,
    needsInput: agents.filter(a => a.status === 'needs-input').length,
  };

  const pendingRecs = recommendations.filter(r => r.status === 'proposed').length;

  // Get recommendation counts per agent
  const getRecommendationCount = (agentId: string) => {
    return recommendations.filter(r => r.agentId === agentId && r.status === 'proposed').length;
  };

  // Sort agents: needs-input first, then running, then active, then others
  const sortedAgents = [...agents].sort((a, b) => {
    const statusOrder = { 'needs-input': 0, 'running': 1, 'active': 2, 'paused': 3, 'draft': 4 };
    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
  });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-medium">Total Agents</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">Needs Input</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.needsInput}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Inbox className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Pending Recs</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-primary">{pendingRecs}</p>
              {pendingRecs > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-primary"
                  onClick={() => navigate('/action-center')}
                >
                  View
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Link to Action Center */}
      {pendingRecs > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <Link 
              to="/action-center" 
              className="flex items-center justify-between text-sm text-primary hover:underline"
            >
              <span>
                {pendingRecs} recommendation{pendingRecs !== 1 ? 's' : ''} awaiting approval in Action Center
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Agent Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">All Agents</h3>
          <Button size="sm" className="gap-1.5" onClick={() => navigate('/ai-agents/new')}>
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAgents.map((agent) => (
            <FleetAgentCard
              key={agent.id}
              agent={agent}
              recommendationCount={getRecommendationCount(agent.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
