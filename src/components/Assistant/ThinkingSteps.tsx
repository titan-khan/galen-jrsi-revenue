import { useState } from 'react';
import { Brain, ChevronDown, Loader2, Check, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ThinkingStepsProps {
  steps: string[];
  isStreaming: boolean;
  defaultExpanded?: boolean;
  onCancel?: () => void;
}

export function ThinkingSteps({
  steps,
  isStreaming,
  defaultExpanded = false,
  onCancel,
}: ThinkingStepsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (steps.length === 0 && !isStreaming) return null;

  const stepCount = steps.length;
  const label = isStreaming
    ? 'Analyzing...'
    : `Analyzed (${stepCount} step${stepCount !== 1 ? 's' : ''})`;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 text-xs transition-colors w-full py-1.5 px-2 rounded-md',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            isStreaming && 'text-primary'
          )}
        >
          {isStreaming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Brain className="h-3.5 w-3.5" />
          )}
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 ml-2 border-l-2 border-muted space-y-1.5 py-2">
          {steps.map((step, idx) => {
            const isComplete = !isStreaming || idx < steps.length - 1;
            const isCurrent = isStreaming && idx === steps.length - 1;
            
            // Check if step mentions an agent
            const agentMatch = step.match(/@([\w-]+)/);
            
            return (
              <div
                key={idx}
                className={cn(
                  'text-xs flex items-start gap-2',
                  'animate-fade-in',
                  isComplete ? 'text-muted-foreground' : 'text-foreground'
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {isComplete ? (
                  <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                )}
                <span className={cn(isComplete && 'italic')}>
                  {agentMatch ? (
                    <>
                      {step.split(agentMatch[0])[0]}
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {agentMatch[0]}
                      </span>
                      {step.split(agentMatch[0]).slice(1).join(agentMatch[0])}
                    </>
                  ) : (
                    step
                  )}
                </span>
              </div>
            );
          })}
          {isStreaming && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Circle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="inline-block w-1.5 h-3 bg-primary/50 animate-pulse" />
            </div>
          )}
        </div>
        
        {/* Cancel button */}
        {isStreaming && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={onCancel}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
