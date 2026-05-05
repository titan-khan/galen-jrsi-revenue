import { formatDistanceToNow } from "date-fns";
import { useLocation } from "react-router-dom";
import { Sparkles, AlertTriangle, Trophy, Bell, ArrowRight } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSidebar as useUISidebar } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const typeIcons = {
  discovery: Sparkles,
  risk: AlertTriangle,
  milestone: Trophy,
  status: Bell,
};

const severityColors = {
  info: "text-blue-500 bg-blue-500/10",
  warning: "text-yellow-500 bg-yellow-500/10",
  success: "text-green-500 bg-green-500/10",
  error: "text-destructive bg-destructive/10",
};

export function QuickInsightsFeed() {
  const { insights } = useSidebar();
  const { state } = useUISidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isOnActionCenter = location.pathname === "/action-center" || location.pathname.startsWith("/action-center/");

  // Show only latest 4 insights
  const displayInsights = insights.slice(0, 4);

  if (collapsed) {
    const hasInsights = insights.length > 0;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md relative",
              hasInsights ? "bg-primary/10" : "bg-muted"
            )}>
              <Bell className={cn(
                "h-4 w-4",
                hasInsights ? "text-primary" : "text-muted-foreground"
              )} />
              {hasInsights && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {insights.length}
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[250px]">
          <p className="font-medium mb-2">Latest Updates</p>
          {displayInsights.slice(0, 2).map((insight) => (
            <p key={insight.id} className="text-xs text-muted-foreground mb-1">
              • {insight.message}
            </p>
          ))}
          {insights.length > 2 && (
            <p className="text-xs text-muted-foreground">
              +{insights.length - 2} more
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (displayInsights.length === 0) {
    return (
      <div className="px-2">
        <p className="text-xs text-muted-foreground py-2">
          No recent updates
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-2">
      {displayInsights.map((insight) => {
        const Icon = typeIcons[insight.type];
        const colorClass = severityColors[insight.severity || 'info'];
        
        return (
          <div
            key={insight.id}
            className="rounded-lg p-2 bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className={cn("rounded p-1 shrink-0", colorClass)}>
                <Icon className="h-3 w-3" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight line-clamp-2">
                  {insight.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(insight.timestamp), { addSuffix: true })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {insight.source}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {!isOnActionCenter && (
        <NavLink
          to="/action-center"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          View all in Action Center
          <ArrowRight className="h-3 w-3" />
        </NavLink>
      )}
    </div>
  );
}
