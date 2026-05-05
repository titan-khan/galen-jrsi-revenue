import { useState } from 'react';
import { AnalysisSummary, AnalysisSummaryItem } from '@/types/agent';
import { ArrowRight, Sparkles, Search, Lightbulb, ShieldCheck, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ApprovedSummaryCardProps {
  summary: AnalysisSummary;
  onNavigateToStep: (stepId: string) => void;
  onContinueAnalysis: () => void;
  onGenerateRecommendations: () => void;
  showActions?: boolean;
  isLoading?: boolean;
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const confidenceConfig = {
  high: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', label: 'High', tooltip: 'Strong data support' },
  medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', label: 'Med', tooltip: 'Moderate data support' },
  low: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300', label: 'Low', tooltip: 'Limited data' },
};

function FindingItem({ 
  item, 
  onNavigate 
}: { 
  item: AnalysisSummaryItem; 
  onNavigate: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const confidence = item.confidence || 'medium';
  const confConfig = confidenceConfig[confidence];

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <div 
          className="group flex items-center gap-3 py-2.5 px-3 hover:bg-accent/50 cursor-pointer border-b last:border-b-0 transition-colors"
        >
          <ChevronDown 
            className={cn(
              "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
              isExpanded && "rotate-180"
            )} 
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    item.priority === 'high' && "bg-red-500",
                    item.priority === 'medium' && "bg-amber-500",
                    item.priority === 'low' && "bg-slate-400"
                  )} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} priority</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 gap-0.5 ${confConfig.color}`}>
                    <ShieldCheck className="h-3 w-3" />
                    {confConfig.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{confConfig.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">{item.title}</span>
            {!isExpanded && (
              <span className="text-muted-foreground text-sm truncate hidden sm:inline">
                {item.description}
              </span>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1 pl-10 border-b last:border-b-0 bg-muted/20">
          <p className="text-sm text-muted-foreground mb-2">
            {item.description}
          </p>
          
          {item.dataSources && item.dataSources.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="font-medium">Sources:</span>
              <div className="flex gap-1 flex-wrap">
                {item.dataSources.map((source, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs h-5">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
          >
            View full analysis
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ApprovedSummaryCard({ 
  summary, 
  onNavigateToStep,
  onContinueAnalysis,
  onGenerateRecommendations,
  showActions = true,
  isLoading = false
}: ApprovedSummaryCardProps) {
  const highPriorityCount = summary.keyFindings.filter(f => f.priority === 'high').length;

  return (
    <div className={cn(
      "border rounded-xl bg-card overflow-hidden animate-fade-in",
      isLoading && "opacity-60 pointer-events-none"
    )}>
      {/* Compact Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-semibold text-foreground">Analysis Approved</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(summary.generatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Inline Executive Summary */}
      <div className="px-4 py-2.5 bg-muted/30 text-sm flex items-center gap-2 flex-wrap">
        <span className="font-medium text-foreground">{summary.keyFindings.length} findings</span>
        {highPriorityCount > 0 && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-red-700 dark:text-red-400 font-medium">{highPriorityCount} high priority</span>
          </>
        )}
        <span className="text-muted-foreground">· ~2 min analysis</span>
      </div>

      {/* Key Findings - Compact List */}
      {summary.keyFindings.length > 0 && (
        <div className="border-t">
          {summary.keyFindings.map((item) => (
            <FindingItem 
              key={item.id} 
              item={item} 
              onNavigate={() => onNavigateToStep(item.stepId)} 
            />
          ))}
        </div>
      )}

      {/* Compact Action CTAs - only show when showActions is true */}
      {showActions && (
        <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">Next:</span>
          <div className="flex gap-2 flex-1 sm:flex-none justify-end">
            <Button variant="outline" size="sm" onClick={onContinueAnalysis}>
              <Search className="h-4 w-4 mr-1.5" />
              More Analysis
            </Button>
            <Button size="sm" onClick={onGenerateRecommendations}>
              <Lightbulb className="h-4 w-4 mr-1.5" />
              Get Recommendations
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
