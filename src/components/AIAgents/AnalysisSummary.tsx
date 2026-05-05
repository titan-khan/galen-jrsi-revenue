import { AnalysisSummary as AnalysisSummaryType, AnalysisSummaryItem } from '@/types/agent';
import { FileText, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AnalysisSummaryProps {
  summary: AnalysisSummaryType;
  onNavigateToStep: (stepId: string) => void;
}

const priorityColors = {
  high: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

function SummaryItem({ 
  item, 
  onNavigate 
}: { 
  item: AnalysisSummaryItem; 
  onNavigate: () => void;
}) {
  return (
    <div 
      className="group p-4 border rounded-lg bg-background hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onNavigate}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={priorityColors[item.priority]}>
              {item.priority}
            </Badge>
            <h5 className="font-medium text-foreground truncate">{item.title}</h5>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 gap-1"
        >
          View details
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function AnalysisSummaryCard({ summary, onNavigateToStep }: AnalysisSummaryProps) {
  return (
    <div className="border rounded-xl bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Analysis Summary</h3>
            <p className="text-xs text-muted-foreground">
              Generated {new Date(summary.generatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Key Findings */}
      {summary.keyFindings.length > 0 && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Key Findings
            </h4>
            <Badge variant="secondary" className="ml-auto">
              {summary.keyFindings.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {summary.keyFindings.map((item) => (
              <SummaryItem 
                key={item.id} 
                item={item} 
                onNavigate={() => onNavigateToStep(item.stepId)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
