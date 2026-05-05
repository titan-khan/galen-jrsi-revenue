import { TrackedRecommendation } from '@/types/agent';
import { TrendingUp, TrendingDown, Target, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ROISummaryCardProps {
  recommendations: TrackedRecommendation[];
  className?: string;
}

function parseNumericValue(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/[\d.]+/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  if (value.toLowerCase().includes('m')) return num * 1000000;
  if (value.toLowerCase().includes('k')) return num * 1000;
  return num;
}

export function ROISummaryCard({ recommendations, className }: ROISummaryCardProps) {
  const implemented = recommendations.filter(r => r.status === 'implemented' || r.status === 'measured');
  const measured = recommendations.filter(r => r.status === 'measured');
  const inProgress = recommendations.filter(r => r.status === 'in-progress');
  
  const totalPredicted = recommendations.reduce((sum, r) => {
    return sum + (r.potentialImpactNumeric || parseNumericValue(r.potentialImpact));
  }, 0);
  
  const totalRealized = measured.reduce((sum, r) => {
    return sum + (r.realizedImpact?.actualValueNumeric || parseNumericValue(r.realizedImpact?.actualValue));
  }, 0);
  
  const overallROI = totalPredicted > 0 ? Math.round((totalRealized / totalPredicted) * 100) : 0;
  
  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className={cn("border rounded-xl bg-card overflow-hidden", className)}>
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">ROI Summary</h3>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {/* Total Recommendations */}
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Target className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{recommendations.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {implemented.length} implemented
          </p>
        </div>
        
        {/* Predicted Value */}
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Predicted</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatValue(totalPredicted)}</p>
          <p className="text-xs text-muted-foreground mt-1">potential value</p>
        </div>
        
        {/* Realized Value */}
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Realized</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatValue(totalRealized)}</p>
          <p className="text-xs text-muted-foreground mt-1">{measured.length} measured</p>
        </div>
        
        {/* ROI % */}
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            {overallROI >= 100 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="text-xs font-medium">ROI</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            overallROI >= 100 ? "text-emerald-600" : overallROI >= 50 ? "text-amber-600" : "text-red-600"
          )}>
            {overallROI}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {inProgress.length} in progress
          </p>
        </div>
      </div>
    </div>
  );
}
