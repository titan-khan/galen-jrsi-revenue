import { useState } from 'react';
import { AnalysisPlanStep } from '@/types/agent';
import { Search, BarChart3, FileText, Lightbulb } from 'lucide-react';

interface PlanStepItemProps {
  step: AnalysisPlanStep;
  isLast?: boolean;
}

const getStepIcon = (stepNumber: number) => {
  const icons = [Search, BarChart3, FileText, Lightbulb];
  const Icon = icons[(stepNumber - 1) % icons.length];
  return Icon;
};

export function PlanStepItem({ step, isLast }: PlanStepItemProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getStepIcon(step.stepNumber);
  const isLongDescription = step.description.length > 80;
  
  return (
    <div className="flex gap-3">
      {/* Icon and vertical line */}
      <div className="flex flex-col items-center">
        <div className="p-1.5 rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border my-1" />
        )}
      </div>
      
      {/* Content */}
      <div className={isLast ? "pb-0" : "pb-4"}>
        <h4 className="font-medium text-foreground text-sm">{step.title}</h4>
        <p className={`text-sm text-muted-foreground mt-0.5 ${!expanded && isLongDescription ? 'line-clamp-2' : ''}`}>
          {step.description}
        </p>
        {isLongDescription && !expanded && (
          <button 
            onClick={() => setExpanded(true)} 
            className="text-sm text-primary hover:underline mt-0.5"
          >
            More
          </button>
        )}
        {expanded && (
          <button 
            onClick={() => setExpanded(false)} 
            className="text-sm text-primary hover:underline mt-0.5"
          >
            Less
          </button>
        )}
      </div>
    </div>
  );
}
