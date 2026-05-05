import { useState, useMemo } from "react";
import { X, Plus, BarChart3, Bot, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSidebar as useUISidebar } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddPinDialog } from "./AddPinDialog";
import type { MetricDefinition } from "@/types/metric";
import type { Agent } from "@/types/agent";
import { metricsData } from "@/data/metricsData";

const typeIcons = {
  metric: BarChart3,
  agent: Bot,
  recommendation: FileText,
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

// Simple hook that doesn't throw if context is missing
function useSafeMetrics(): MetricDefinition[] {
  // Use static data as fallback - the context will be available after initial mount
  return metricsData;
}

function useSafeAgents(): Agent[] {
  // Return empty array as fallback
  return [];
}

export function PinnedItemsSection() {
  const { pinnedItems, removePin, maxPins, addPin } = useSidebar();
  const { state } = useUISidebar();
  const collapsed = state === "collapsed";
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Use safe versions that don't require the full context
  const metrics = useSafeMetrics();
  const agents = useSafeAgents();

  // Get smart suggestions when no pins exist
  const suggestedItems = useMemo(() => {
    if (pinnedItems.length > 0) return [];
    
    const suggestions: Array<{id: string; type: 'metric' | 'agent'; name: string; value?: string}> = [];
    
    // Suggest the first 2 following metrics (or any if none following)
    const followedMetrics = metrics.filter(m => m.isFollowing);
    const metricsToSuggest = followedMetrics.length > 0 ? followedMetrics : metrics;
    metricsToSuggest.slice(0, 2).forEach(m => {
      suggestions.push({
        id: m.id,
        type: 'metric',
        name: m.name,
        value: m.displayData?.currentValue
      });
    });
    
    // Suggest 1 active agent
    const activeAgent = agents.find(a => a.status === 'running' || a.status === 'active');
    if (activeAgent) {
      suggestions.push({
        id: activeAgent.id,
        type: 'agent',
        name: activeAgent.name,
        value: activeAgent.status
      });
    }
    
    return suggestions;
  }, [pinnedItems.length, metrics, agents]);

  const getItemUrl = (item: typeof pinnedItems[0]) => {
    switch (item.type) {
      case 'metric':
        return `/metrics/edit/${item.id}`;
      case 'agent':
        return `/ai-agents/${item.id}`;
      case 'recommendation':
        return '/action-center';
      default:
        return '/';
    }
  };

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 px-2">
        {pinnedItems.map((item) => {
          const Icon = typeIcons[item.type];
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <NavLink
                  to={getItemUrl(item)}
                  className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{item.name}</p>
                {item.value && (
                  <p className="text-xs text-muted-foreground">{item.value}</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {pinnedItems.length < maxPins && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Add pin</TooltipContent>
          </Tooltip>
        )}
        
        <AddPinDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    );
  }

  return (
    <div className="px-2 space-y-1">
      {pinnedItems.length === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-2">
            Suggested pins:
          </p>
          {suggestedItems.map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <button
                key={item.id}
                onClick={() => addPin({ ...item, type: item.type })}
                className="flex items-center gap-2 w-full rounded-md p-2 hover:bg-muted transition-colors text-left"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  {item.value && (
                    <p className="text-xs text-muted-foreground">{item.value}</p>
                  )}
                </div>
                <Plus className="h-3 w-3 text-muted-foreground" />
              </button>
            );
          })}
          {suggestedItems.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 px-2">
              No items available to pin
            </p>
          )}
        </div>
      ) : (
        pinnedItems.map((item) => {
          const Icon = typeIcons[item.type];
          const TrendIcon = item.trend ? trendIcons[item.trend] : null;
          
          return (
            <div
              key={item.id}
              className="group flex items-center gap-2 rounded-md p-2 hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              
              <NavLink
                to={getItemUrl(item)}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">{item.name}</p>
                {item.status && (
                  <p className="text-xs text-muted-foreground capitalize">{item.status}</p>
                )}
              </NavLink>
              
              {item.value && (
                <div className="flex items-center gap-1 text-xs font-medium">
                  <span>{item.value}</span>
                  {TrendIcon && (
                    <TrendIcon className={cn(
                      "h-3 w-3",
                      item.trend === 'up' && "text-green-500",
                      item.trend === 'down' && "text-destructive",
                      item.trend === 'stable' && "text-muted-foreground"
                    )} />
                  )}
                </div>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => removePin(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })
      )}
      
      {pinnedItems.length < maxPins && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add pin
        </Button>
      )}
      
      <AddPinDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
