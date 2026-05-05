import { CircleCheck, CircleAlert, CircleHelp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfidenceLevel } from "@/types/attribution";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  label: string;
  description: string;
  icon: typeof CircleCheck;
  className: string;
}> = {
  high: {
    label: 'High Confidence',
    description: 'Based on controlled experiments, A/B tests, or direct measurement with statistical significance.',
    icon: CircleCheck,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  medium: {
    label: 'Medium Confidence',
    description: 'Based on historical correlations, attribution models, or industry benchmarks with reasonable assumptions.',
    icon: CircleAlert,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  low: {
    label: 'Low Confidence',
    description: 'Estimated based on limited data, assumptions, or residual calculations. Use with caution.',
    icon: CircleHelp,
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
};

export function ConfidenceBadge({ level, showLabel = true, size = "sm", className }: ConfidenceBadgeProps) {
  const config = CONFIDENCE_CONFIG[level];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "cursor-help border",
            config.className,
            size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
            className
          )}
        >
          <Icon className={cn(iconSize, showLabel && "mr-1")} />
          {showLabel && config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm font-medium mb-1">{config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
