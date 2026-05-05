import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Lightbulb,
  BarChart3,
  Pencil,
  Info,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricSuggestion, GoalAlignment } from "@/types/metricSuggestion";
import { GOAL_LABELS } from "@/types/companyProfile";

interface SuggestionCardProps {
  suggestion: MetricSuggestion;
  onSelect: (id: string, selected: boolean) => void;
  onCustomize?: (id: string) => void;
  showGoalAlignment?: boolean;
}

const classificationConfig = {
  required: { 
    label: 'Required', 
    variant: 'default' as const,
    description: 'Essential for your business model'
  },
  recommended: { 
    label: 'Recommended', 
    variant: 'secondary' as const,
    description: 'Highly relevant to your goals'
  },
  optional: { 
    label: 'Optional', 
    variant: 'outline' as const,
    description: 'Nice to have'
  }
};

const confidenceConfig = {
  high: { label: 'High confidence', color: 'text-emerald-500' },
  medium: { label: 'Medium confidence', color: 'text-amber-500' },
  low: { label: 'Low confidence', color: 'text-muted-foreground' }
};

const complexityConfig = {
  simple: { label: 'Simple', description: 'Single table calculation' },
  moderate: { label: 'Moderate', description: 'Requires filtering or grouping' },
  advanced: { label: 'Advanced', description: 'Multi-table join required' }
};

const indicatorConfig = {
  leading: { 
    label: 'Leading', 
    icon: TrendingUp, 
    color: 'text-blue-500',
    description: 'Predicts future outcomes'
  },
  lagging: { 
    label: 'Lagging', 
    icon: TrendingDown, 
    color: 'text-orange-500',
    description: 'Measures past results'
  },
  coincident: { 
    label: 'Coincident', 
    icon: Minus, 
    color: 'text-muted-foreground',
    description: 'Moves with current state'
  }
};

// Inline Benchmark Visual Component
const BenchmarkIndicator = ({ benchmark }: { benchmark: NonNullable<MetricSuggestion['benchmark']> }) => {
  // Parse percentile for visual indicator (e.g., "Top quartile" = 75%, "Median" = 50%)
  const getPercentilePosition = (percentile?: string): number => {
    if (!percentile) return 50;
    const lower = percentile.toLowerCase();
    if (lower.includes('top 10') || lower.includes('90th')) return 90;
    if (lower.includes('top quartile') || lower.includes('75th') || lower.includes('top 25')) return 75;
    if (lower.includes('median') || lower.includes('50th')) return 50;
    if (lower.includes('bottom quartile') || lower.includes('25th')) return 25;
    return 50; // Default to median
  };

  const position = getPercentilePosition(benchmark.percentile);
  const percentileLabel = benchmark.percentile || 'Industry standard';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/10 border border-border/50">
            <Award className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">Industry Benchmark</span>
                <Badge variant="secondary" className="text-xs font-mono ml-2 shrink-0">
                  {benchmark.value}
                </Badge>
              </div>
              {/* Visual benchmark bar */}
              <div className="relative h-1.5 bg-gradient-to-r from-rose-500/30 via-amber-500/30 to-emerald-500/30 rounded-full overflow-hidden">
                {/* Position marker */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background shadow-sm transition-all"
                  style={{ left: `calc(${position}% - 5px)` }}
                />
                {/* Quartile markers */}
                <div className="absolute top-0 left-1/4 w-px h-full bg-border/50" />
                <div className="absolute top-0 left-1/2 w-px h-full bg-border/50" />
                <div className="absolute top-0 left-3/4 w-px h-full bg-border/50" />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-muted-foreground">Low</span>
                <span className="text-[10px] text-muted-foreground">{percentileLabel}</span>
                <span className="text-[10px] text-muted-foreground">High</span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">{benchmark.label}</p>
            <p className="text-xs text-muted-foreground">
              Target: <span className="font-mono font-medium">{benchmark.value}</span> ({percentileLabel})
            </p>
            <p className="text-xs text-muted-foreground">
              Source: {benchmark.source}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const GoalAlignmentItem = ({ alignment }: { alignment: GoalAlignment }) => {
  const impactColors = {
    high: 'bg-emerald-500',
    medium: 'bg-amber-500',
    low: 'bg-muted'
  };

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
      <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium">
            {GOAL_LABELS[alignment.goal]}
          </span>
          <div className={cn(
            "h-1.5 w-1.5 rounded-full",
            impactColors[alignment.impact]
          )} />
        </div>
        <p className="text-xs text-muted-foreground">
          {alignment.relevance}
        </p>
      </div>
    </div>
  );
};

export const SuggestionCard = ({ 
  suggestion, 
  onSelect,
  onCustomize,
  showGoalAlignment = true
}: SuggestionCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const classification = classificationConfig[suggestion.classification];
  const confidence = confidenceConfig[suggestion.confidence];
  const complexity = complexityConfig[suggestion.complexityLevel];
  const indicator = indicatorConfig[suggestion.indicatorType];
  const IndicatorIcon = indicator.icon;

  return (
    <Card className={cn(
      "transition-all duration-200",
      suggestion.isSelected && "ring-2 ring-primary border-primary"
    )}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={suggestion.isSelected}
            onCheckedChange={(checked) => onSelect(suggestion.id, checked as boolean)}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            {/* Title & Badges */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm leading-tight">
                {suggestion.suggestedName}
              </h4>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={classification.variant} className="text-xs">
                  {classification.label}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-2">
              {suggestion.description}
            </p>

            {/* Quick Info Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                {suggestion.sourceTable}.{suggestion.sourceColumn}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className={cn("flex items-center gap-1", indicator.color)}>
                <IndicatorIcon className="h-3 w-3" />
                {indicator.label}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className={confidence.color}>{confidence.label}</span>
            </div>

            {/* The "Why" - Primary Reasoning */}
            {showGoalAlignment && suggestion.goalAlignments.length > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-primary mb-0.5">
                      Why this matters for you
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.goalAlignments[0].relevance}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Benchmark Display */}
            {suggestion.benchmark && (
              <div className="mt-3">
                <BenchmarkIndicator benchmark={suggestion.benchmark} />
              </div>
            )}
          </div>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 h-7 text-xs text-muted-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show details
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3 space-y-3">
            {/* Full Goal Alignments */}
            {suggestion.goalAlignments.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Goal Alignment
                </p>
                <div className="space-y-1">
                  {suggestion.goalAlignments.map((alignment, i) => (
                    <GoalAlignmentItem key={i} alignment={alignment} />
                  ))}
                </div>
              </div>
            )}

            {/* Industry Context */}
            {suggestion.industryContext && (
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Industry Insight
                </p>
                <p className="text-xs text-muted-foreground">
                  {suggestion.industryContext}
                </p>
              </div>
            )}

            {/* Benchmark */}
            {suggestion.benchmark && (
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Industry Benchmark
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {suggestion.benchmark.label}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.benchmark.value}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Source: {suggestion.benchmark.source}
                </p>
              </div>
            )}

            {/* Technical Details */}
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs font-medium mb-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Technical Details
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Aggregation:</span>
                  <span className="ml-1 font-mono">{suggestion.suggestedAggregation.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date field:</span>
                  <span className="ml-1 font-mono">{suggestion.suggestedDateColumn}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Complexity:</span>
                  <span className="ml-1">{complexity.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-1">{indicator.label} indicator</span>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs font-medium mb-1">AI Reasoning</p>
              <p className="text-xs text-muted-foreground">
                {suggestion.reasoning}
              </p>
            </div>

            {/* Customize Button */}
            {onCustomize && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onCustomize(suggestion.id)}
              >
                <Pencil className="h-3 w-3 mr-2" />
                Customize this metric
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
