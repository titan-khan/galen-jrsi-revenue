import { Users, Lightbulb, CheckCircle, DollarSign, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSpecialists } from "@/contexts/SpecialistsContext";
import { SpecialistCard } from "./SpecialistCard";
import { useNavigate } from "react-router-dom";

export function TeamOverview() {
  const navigate = useNavigate();
  const { specialists, getTeamPerformance, getSpecialistById } = useSpecialists();

  const performance = getTeamPerformance();
  // Pending recommendations now live in agent_recommendations table
  // Accessed via useHomeData hook on the Home page

  // Sort specialists: active first, then paused
  const sortedSpecialists = [...specialists].sort((a, b) => {
    const statusOrder: Record<string, number> = { 'active': 0, 'paused': 1 };
    return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
  });

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="space-y-6">
      {/* Team Performance Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Team Size</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{performance.totalSpecialists}</p>
            <p className="text-xs text-muted-foreground mt-1">{performance.activeSpecialists} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">Insights Generated</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{performance.insightsGenerated}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">Approval Rate</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{performance.approvalRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{performance.actionsRecommended} actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Value Delivered</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatValue(performance.valueDelivered)}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Specialist Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Your Specialist Team</h3>
          <Button size="sm" className="gap-1.5" onClick={() => navigate('/specialists/new')}>
            <Plus className="h-4 w-4" />
            Hire Specialist
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSpecialists.map((specialist) => (
            <SpecialistCard key={specialist.id} specialist={specialist} />
          ))}
        </div>
      </div>
    </div>
  );
}
