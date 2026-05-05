import { useState, useMemo } from "react";
import { BarChart3, Bot, FileText, Check } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useMetrics } from "@/contexts/MetricsContext";
import { useAgents } from "@/contexts/AgentsContext";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AddPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPinDialog({ open, onOpenChange }: AddPinDialogProps) {
  const { addPin, isPinned, pinnedItems, maxPins } = useSidebar();
  const { metrics } = useMetrics();
  const { agents } = useAgents();
  const { recommendations } = useTrackedRecommendations();

  const canAddMore = pinnedItems.length < maxPins;

  const handleSelect = (type: 'metric' | 'agent' | 'recommendation', id: string, name: string, value?: string, status?: string) => {
    if (!canAddMore) return;
    
    addPin({
      id,
      type,
      name,
      value,
      status,
      trend: type === 'metric' ? 'up' : undefined, // Demo trend
    });
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search metrics, agents, or recommendations..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {!canAddMore && (
          <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/50">
            Maximum {maxPins} pins reached. Remove a pin to add more.
          </div>
        )}
        
        <CommandGroup heading="Metrics">
          {metrics.slice(0, 8).map((metric) => {
            const pinned = isPinned(metric.id);
            return (
              <CommandItem
                key={metric.id}
                value={`metric-${metric.name}`}
                onSelect={() => handleSelect('metric', metric.id, metric.name, metric.displayData?.currentValue)}
                disabled={pinned || !canAddMore}
                className={cn(pinned && "opacity-50")}
              >
                <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{metric.name}</span>
                <span className="text-xs text-muted-foreground mr-2">
                  {metric.displayData?.currentValue}
                </span>
                {pinned && <Check className="h-4 w-4 text-primary" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
        
        <CommandGroup heading="Agents">
          {agents.map((agent) => {
            const pinned = isPinned(agent.id);
            return (
              <CommandItem
                key={agent.id}
                value={`agent-${agent.name}`}
                onSelect={() => handleSelect('agent', agent.id, agent.name, undefined, agent.status)}
                disabled={pinned || !canAddMore}
                className={cn(pinned && "opacity-50")}
              >
                <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{agent.name}</span>
                <span className="text-xs text-muted-foreground capitalize mr-2">
                  {agent.status}
                </span>
                {pinned && <Check className="h-4 w-4 text-primary" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
        
        <CommandGroup heading="Recommendations">
          {recommendations.slice(0, 5).map((rec) => {
            const pinned = isPinned(rec.id);
            return (
              <CommandItem
                key={rec.id}
                value={`recommendation-${rec.title}`}
                onSelect={() => handleSelect('recommendation', rec.id, rec.title, undefined, rec.status)}
                disabled={pinned || !canAddMore}
                className={cn(pinned && "opacity-50")}
              >
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1 truncate">{rec.title}</span>
                <span className="text-xs text-muted-foreground capitalize mr-2">
                  {rec.status}
                </span>
                {pinned && <Check className="h-4 w-4 text-primary" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
