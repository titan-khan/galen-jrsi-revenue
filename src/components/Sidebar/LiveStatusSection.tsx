import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { useAgents } from "@/contexts/AgentsContext";
import { useSidebar as useUISidebar } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LiveStatusSection() {
  const { state } = useUISidebar();
  const collapsed = state === "collapsed";
  const { recommendations } = useTrackedRecommendations();
  const { agents } = useAgents();
  const location = useLocation();
  const isOnActionCenter = location.pathname === "/action-center" || location.pathname.startsWith("/action-center/");

  const statusData = useMemo(() => {
    const pendingApprovals = recommendations.filter((r) => r.status === "proposed").length;
    const needsInputAgents = agents.filter((a) => a.status === "needs-input").length;
    const activeAgents = agents.filter((a) => a.status === "running" || a.status === "active").length;
    
    // No hardcoded risk count - derive from actual data
    const riskCount = 0;
    
    const totalIssues = pendingApprovals + needsInputAgents + riskCount;
    const isHealthy = totalIssues === 0;
    
    return {
      isHealthy,
      totalIssues,
      pendingApprovals,
      needsInputAgents,
      riskCount,
      activeAgents,
    };
  }, [recommendations, agents]);

  const statusColor = statusData.isHealthy 
    ? "text-green-500" 
    : statusData.totalIssues > 3 
      ? "text-destructive" 
      : "text-yellow-500";

  const bgColor = statusData.isHealthy
    ? "bg-green-500/10"
    : statusData.totalIssues > 3
      ? "bg-destructive/10"
      : "bg-yellow-500/10";

  const StatusContent = (
    <div className={cn(
      "rounded-lg p-3 transition-all",
      bgColor
    )}>
      <div className="flex items-center gap-2">
        {statusData.isHealthy ? (
          <CheckCircle2 className={cn("h-4 w-4", statusColor)} />
        ) : (
          <AlertTriangle className={cn("h-4 w-4", statusColor)} />
        )}
        
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", statusColor)}>
              {statusData.isHealthy 
                ? "All systems healthy" 
                : `${statusData.totalIssues} items require your decision`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statusData.isHealthy 
                ? `${statusData.activeAgents} agents active`
                : `${statusData.pendingApprovals} approvals pending`}
            </p>
          </div>
        )}
      </div>
      
      {!collapsed && !statusData.isHealthy && !isOnActionCenter && (
        <NavLink 
          to="/action-center"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
        >
          View details
          <ArrowRight className="h-3 w-3" />
        </NavLink>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-2">
            {StatusContent}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="font-medium">
            {statusData.isHealthy 
              ? "All systems healthy" 
              : `${statusData.totalIssues} items require your decision`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {statusData.activeAgents} agents active
            {!statusData.isHealthy && (
              <> • {statusData.pendingApprovals} approvals</>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div className="px-2">{StatusContent}</div>;
}
