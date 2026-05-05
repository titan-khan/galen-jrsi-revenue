import { Inbox, GitBranch, TrendingUp, History } from "lucide-react";
import { TrackedRecommendation } from "@/types/agent";

interface ActionCenterHeaderProps {
  recommendations: TrackedRecommendation[];
}

export function ActionCenterHeader({ recommendations }: ActionCenterHeaderProps) {
  const stats = {
    pending: recommendations.filter(r => r.status === 'proposed').length,
    inProgress: recommendations.filter(r => ['approved', 'in-progress'].includes(r.status)).length,
    implemented: recommendations.filter(r => r.status === 'implemented').length,
    measured: recommendations.filter(r => r.status === 'measured').length,
  };

  const totalImpact = recommendations
    .filter(r => r.realizedImpact?.actualValueNumeric)
    .reduce((sum, r) => sum + (r.realizedImpact?.actualValueNumeric || 0), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Inbox className="h-4 w-4" />
          <span className="text-xs font-medium">Pending Approval</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
      </div>
      
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <GitBranch className="h-4 w-4" />
          <span className="text-xs font-medium">In Pipeline</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
      </div>
      
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">Implemented</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{stats.implemented}</p>
      </div>
      
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <History className="h-4 w-4" />
          <span className="text-xs font-medium">Realized Impact</span>
        </div>
        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalImpact)}</p>
      </div>
    </div>
  );
}
