import { useState } from 'react';
import { TrackedRecommendation, RecommendationStatus, RealizedImpact } from '@/types/agent';
import { X, ExternalLink, Calendar, User, CheckCircle2, Clock, AlertCircle, XCircle, Target, TrendingUp, FileText, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RecommendationDetailPanelProps {
  recommendation: TrackedRecommendation;
  onClose: () => void;
  onUpdateStatus: (id: string, status: RecommendationStatus) => void;
  onRecordImpact: (id: string, impact: RealizedImpact) => void;
  onUpdateRecommendation: (id: string, updates: Partial<TrackedRecommendation>) => void;
}

const statusConfig: Record<RecommendationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  proposed: { label: 'Proposed', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: <Target className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', icon: <Clock className="h-3 w-3" /> },
  implemented: { label: 'Implemented', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  measured: { label: 'Measured', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: <TrendingUp className="h-3 w-3" /> },
  dismissed: { label: 'Dismissed', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
};

const priorityConfig = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const timelineSteps: RecommendationStatus[] = ['proposed', 'approved', 'in-progress', 'implemented', 'measured'];

export function RecommendationDetailPanel({
  recommendation,
  onClose,
  onUpdateStatus,
  onRecordImpact,
  onUpdateRecommendation,
}: RecommendationDetailPanelProps) {
  const [showImpactForm, setShowImpactForm] = useState(false);
  const [impactForm, setImpactForm] = useState({
    actualValue: '',
    notes: '',
    confidenceLevel: 'medium' as 'high' | 'medium' | 'low',
  });

  const currentStepIndex = timelineSteps.indexOf(recommendation.status);
  const isCompleted = recommendation.status === 'measured' || recommendation.status === 'dismissed';

  const handleStatusChange = (newStatus: RecommendationStatus) => {
    onUpdateStatus(recommendation.id, newStatus);
  };

  const handleRecordImpact = () => {
    onRecordImpact(recommendation.id, {
      measuredAt: new Date().toISOString(),
      measurementPeriod: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      actualValue: impactForm.actualValue,
      confidenceLevel: impactForm.confidenceLevel,
      notes: impactForm.notes,
    });
    setShowImpactForm(false);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={priorityConfig[recommendation.priority]}>
              {recommendation.priority}
            </Badge>
            <Badge variant="outline" className={statusConfig[recommendation.status].color}>
              {statusConfig[recommendation.status].icon}
              <span className="ml-1">{statusConfig[recommendation.status].label}</span>
            </Badge>
          </div>
          <h2 className="text-lg font-semibold text-foreground">{recommendation.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            From: {recommendation.agentName}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Timeline */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Progress Timeline</h3>
          <div className="flex items-center gap-1">
            {timelineSteps.map((step, index) => {
              const isActive = index <= currentStepIndex && recommendation.status !== 'dismissed';
              const isCurrent = step === recommendation.status;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      isActive ? "bg-primary" : "bg-muted"
                    )}
                  />
                  {index < timelineSteps.length - 1 && <div className="w-1" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {timelineSteps.map((step) => (
              <span key={step} className={cn(
                step === recommendation.status && "text-primary font-medium"
              )}>
                {statusConfig[step].label}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Description</h3>
          <p className="text-sm text-muted-foreground">{recommendation.description}</p>
        </div>

        {/* Predicted Impact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Predicted Impact</p>
            <p className="text-lg font-semibold text-foreground">{recommendation.potentialImpact || 'Not specified'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Estimated Effort</p>
            <p className="text-lg font-semibold text-foreground">{recommendation.estimatedEffort || 'Not specified'}</p>
          </div>
        </div>

        {/* Realized Impact (if measured) */}
        {recommendation.realizedImpact && (
          <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Realized Impact</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">Actual Value</p>
                <p className="text-xl font-bold text-emerald-800 dark:text-emerald-100">
                  {recommendation.realizedImpact.actualValue}
                </p>
              </div>
              {recommendation.roiPercentage !== undefined && (
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">ROI</p>
                  <p className={cn(
                    "text-xl font-bold",
                    recommendation.roiPercentage >= 100 ? "text-emerald-800 dark:text-emerald-100" : "text-amber-600"
                  )}>
                    {recommendation.roiPercentage}%
                  </p>
                </div>
              )}
            </div>
            {recommendation.realizedImpact.notes && (
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-3">
                {recommendation.realizedImpact.notes}
              </p>
            )}
          </div>
        )}

        {/* Record Impact Form */}
        {showImpactForm && (
          <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <h3 className="text-sm font-medium text-foreground">Record Realized Impact</h3>
            <div className="space-y-2">
              <Label htmlFor="actualValue">Actual Value Achieved</Label>
              <Input
                id="actualValue"
                placeholder="e.g., +$1.2M, 15% reduction"
                value={impactForm.actualValue}
                onChange={(e) => setImpactForm({ ...impactForm, actualValue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence Level</Label>
              <Select
                value={impactForm.confidenceLevel}
                onValueChange={(v) => setImpactForm({ ...impactForm, confidenceLevel: v as typeof impactForm.confidenceLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High - Direct measurement</SelectItem>
                  <SelectItem value="medium">Medium - Estimated</SelectItem>
                  <SelectItem value="low">Low - Approximate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How was this measured? Any caveats?"
                value={impactForm.notes}
                onChange={(e) => setImpactForm({ ...impactForm, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRecordImpact}>Save Impact</Button>
              <Button size="sm" variant="outline" onClick={() => setShowImpactForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* External Ticket Link */}
        {recommendation.externalTicketUrl && (
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <a
              href={recommendation.externalTicketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              View in external tracker
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2 text-sm">
          <h3 className="font-medium text-foreground">Details</h3>
          <div className="space-y-1.5 text-muted-foreground">
            {recommendation.approvedAt && (
              <p className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Approved: {format(new Date(recommendation.approvedAt), 'MMM d, yyyy')}
              </p>
            )}
            {recommendation.implementedAt && (
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Implemented: {format(new Date(recommendation.implementedAt), 'MMM d, yyyy')}
              </p>
            )}
            {recommendation.assignee && (
              <p className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Assignee: {recommendation.assignee}
              </p>
            )}
            {recommendation.relatedFindingTitle && (
              <p className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Related: {recommendation.relatedFindingTitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      {!isCompleted && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {recommendation.status === 'proposed' && (
              <>
                <Button size="sm" onClick={() => handleStatusChange('approved')}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('dismissed')}>
                  Dismiss
                </Button>
              </>
            )}
            {recommendation.status === 'approved' && (
              <Button size="sm" onClick={() => handleStatusChange('in-progress')}>
                Start Implementation
              </Button>
            )}
            {recommendation.status === 'in-progress' && (
              <Button size="sm" onClick={() => handleStatusChange('implemented')}>
                Mark Implemented
              </Button>
            )}
            {recommendation.status === 'implemented' && (
              <Button size="sm" onClick={() => setShowImpactForm(true)}>
                Record Impact
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
