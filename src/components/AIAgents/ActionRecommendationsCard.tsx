import { ActionRecommendations, ActionRecommendation, TrackedRecommendation, RecommendationStatus } from '@/types/agent';
import { ArrowRight, Target, Zap, FileText, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrackedRecommendations } from '@/contexts/TrackedRecommendationsContext';
import { cn } from '@/lib/utils';

interface ActionRecommendationsCardProps {
  recommendations: ActionRecommendations;
  agentId: string;
  agentName: string;
  onViewDetails: (recommendation: ActionRecommendation) => void;
}

const priorityConfig = {
  high: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    label: 'High',
  },
  medium: {
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    label: 'Medium',
  },
  low: {
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    label: 'Low',
  },
};

const statusConfig: Record<RecommendationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  proposed: { label: 'Proposed', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: <Target className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', icon: <Clock className="h-3 w-3" /> },
  implemented: { label: 'Implemented', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  measured: { label: 'Measured', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: <TrendingUp className="h-3 w-3" /> },
  dismissed: { label: 'Dismissed', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
};

function RecommendationItem({ 
  recommendation, 
  trackedRec,
  onViewDetails,
  onTrack,
  onUpdateStatus,
}: { 
  recommendation: ActionRecommendation; 
  trackedRec?: TrackedRecommendation;
  onViewDetails: () => void;
  onTrack: () => void;
  onUpdateStatus: (status: RecommendationStatus) => void;
}) {
  const config = priorityConfig[recommendation.priority];
  const isTracked = !!trackedRec;
  const status = trackedRec?.status;

  return (
    <div className="py-3 px-4 border-b last:border-b-0 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs h-5 ${config.color}`}>
              {config.label}
            </Badge>
            {status && (
              <Badge variant="outline" className={cn("text-xs h-5", statusConfig[status].color)}>
                {statusConfig[status].icon}
                <span className="ml-1">{statusConfig[status].label}</span>
              </Badge>
            )}
            {trackedRec?.roiPercentage !== undefined && (
              <Badge variant="outline" className={cn(
                "text-xs h-5",
                trackedRec.roiPercentage >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}>
                {trackedRec.roiPercentage}% ROI
              </Badge>
            )}
            <h4 className="font-medium text-sm text-foreground">{recommendation.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {recommendation.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            {recommendation.potentialImpact && (
              <span>Impact: <strong className="text-foreground">{recommendation.potentialImpact}</strong></span>
            )}
            {trackedRec?.realizedImpact?.actualValue && (
              <span>Realized: <strong className="text-emerald-600">{trackedRec.realizedImpact.actualValue}</strong></span>
            )}
            {!trackedRec?.realizedImpact && recommendation.estimatedEffort && (
              <span>Effort: <strong className="text-foreground">{recommendation.estimatedEffort}</strong></span>
            )}
            {recommendation.relatedFindingTitle && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {recommendation.relatedFindingTitle}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isTracked && (
            <Button
              variant="default"
              size="sm"
              className="text-xs h-7"
              onClick={onTrack}
            >
              Track
            </Button>
          )}
          {isTracked && status === 'proposed' && (
            <Button
              variant="default"
              size="sm"
              className="text-xs h-7"
              onClick={() => onUpdateStatus('approved')}
            >
              Approve
            </Button>
          )}
          {isTracked && status === 'approved' && (
            <Button
              variant="default"
              size="sm"
              className="text-xs h-7"
              onClick={() => onUpdateStatus('in-progress')}
            >
              Start
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={onViewDetails}
          >
            Details
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ActionRecommendationsCard({ recommendations, agentId, agentName, onViewDetails }: ActionRecommendationsCardProps) {
  const { recommendations: trackedRecs, addRecommendation, updateStatus } = useTrackedRecommendations();

  const getTrackedRec = (recId: string) => trackedRecs.find(tr => tr.id === recId);

  const handleTrack = (rec: ActionRecommendation) => {
    addRecommendation(rec, agentId, agentName);
  };

  const handleUpdateStatus = (recId: string, status: RecommendationStatus) => {
    updateStatus(recId, status);
  };

  // Count tracked recommendations
  const trackedCount = recommendations.items.filter(r => getTrackedRec(r.id)).length;
  const measuredCount = recommendations.items.filter(r => getTrackedRec(r.id)?.status === 'measured').length;

  return (
    <div className="border rounded-xl bg-card overflow-hidden animate-fade-in">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-foreground">Action Recommendations</h3>
        </div>
        <div className="flex items-center gap-2">
          {measuredCount > 0 && (
            <Badge variant="outline" className="gap-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <TrendingUp className="h-3 w-3" />
              {measuredCount} measured
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1 text-xs">
            <Zap className="h-3 w-3" />
            {recommendations.items.length}
          </Badge>
        </div>
      </div>

      {/* Compact Recommendations List */}
      <div>
        {recommendations.items.map((recommendation) => (
          <RecommendationItem
            key={recommendation.id}
            recommendation={recommendation}
            trackedRec={getTrackedRec(recommendation.id)}
            onViewDetails={() => onViewDetails(recommendation)}
            onTrack={() => handleTrack(recommendation)}
            onUpdateStatus={(status) => handleUpdateStatus(recommendation.id, status)}
          />
        ))}
      </div>
    </div>
  );
}
