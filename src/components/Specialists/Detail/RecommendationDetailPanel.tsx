import { X, CheckCircle2, XCircle, DollarSign, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { SpecialistRecommendation } from '@/types/specialist';
import {
  StructuredContentSection,
  EFFORT_CONFIG,
  STATUS_CONFIG,
  IMPACT_TYPE_CONFIG,
  SCOPE_CONFIG,
  formatImpactValue,
} from '@/components/Specialists/RecommendationCard';


// ─── Types ───────────────────────────────────────────────────────────

interface RecommendationDetailPanelProps {
  recommendation: SpecialistRecommendation;
  /** Parent root cause info for context display */
  rootCause?: { rank: number; cause: string; contributionPct: number };
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

// ─── Rank Badge Colors ───────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  2: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
};
const DEFAULT_RANK_COLOR = 'bg-muted text-muted-foreground';

// ─── Component ───────────────────────────────────────────────────────

export function RecommendationDetailPanel({
  recommendation,
  rootCause,
  onClose,
  onApprove,
  onReject,
}: RecommendationDetailPanelProps) {
  const effortConfig = EFFORT_CONFIG[recommendation.effort];
  const statusConfig = STATUS_CONFIG[recommendation.status];
  const impactConfig = IMPACT_TYPE_CONFIG[recommendation.impact.type];
  const scope = recommendation.actionScope;
  const sc = recommendation.structuredContent;
  const EffortIcon = effortConfig.icon;
  const ImpactIcon = impactConfig.icon;
  return (
    <div className="h-full flex flex-col bg-background">
      {/* ── Header (sticky) ── */}
      <div className="shrink-0 border-b border-border px-5 pt-4 pb-4">
        {/* Close row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground/40 uppercase tracking-widest">
            Action Detail
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-foreground leading-snug mb-3">
          {recommendation.title}
        </h3>

        {/* Impact + badges row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImpactIcon className={cn('h-5 w-5', impactConfig.className)} />
            <span className="text-lg font-bold text-foreground tabular-nums">
              {formatImpactValue(recommendation.impact)}
            </span>
            <span className="text-xs text-muted-foreground/50 uppercase tracking-wider">
              {impactConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {scope && (
              <Badge variant="outline" className={cn('text-sm font-medium h-6 px-2', SCOPE_CONFIG[scope].className)}>
                {SCOPE_CONFIG[scope].label}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-sm font-medium h-6 px-2', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className={cn('text-sm font-medium h-6 px-2', effortConfig.className)}>
              <EffortIcon className="h-3.5 w-3.5 mr-0.5" />
              {effortConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Body (scrollable) ── */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-5">
          {/* Root Cause context */}
          {rootCause && (
            <div className="rounded-lg border border-border/40 bg-muted/10 p-3.5">
              <p className="text-sm font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">
                Root Cause
              </p>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold',
                    RANK_COLORS[rootCause.rank] || DEFAULT_RANK_COLOR,
                  )}
                >
                  {rootCause.rank}
                </span>
                <span className="text-[13px] font-medium text-foreground flex-1 min-w-0 leading-snug">
                  {rootCause.cause}
                </span>
                <span className="text-sm text-muted-foreground/40 shrink-0 tabular-nums">
                  {rootCause.contributionPct}%
                </span>
              </div>
            </div>
          )}

          {/* Rationale — why this action matters */}
          {recommendation.description && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1">
                Rationale
              </p>
              <p className="text-[13px] text-foreground/80 leading-relaxed">
                {recommendation.description}
              </p>
            </div>
          )}

          {/* Structured Content (McKinsey breakdown) */}
          {sc && <StructuredContentSection content={sc} />}

          {/* Metadata */}
          <div className="border-t border-border/30 pt-3 flex items-center gap-4 text-xs text-muted-foreground/45">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span>Confidence {recommendation.impact.confidence}%</span>
            </div>
            {recommendation.deadline && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{recommendation.deadline}</span>
              </div>
            )}
            <span className="text-muted-foreground/30">·</span>
            <span>{formatDistanceToNow(new Date(recommendation.createdAt), { addSuffix: true })}</span>
          </div>

        </div>
      </ScrollArea>

      {/* ── Footer (sticky) ── */}
      {recommendation.status === 'proposed' && (
        <div className="shrink-0 border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-sm text-muted-foreground hover:text-red-600 hover:border-red-200 px-3 flex-1"
              onClick={() => onReject(recommendation.id)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-sm px-4 flex-1"
              onClick={() => onApprove(recommendation.id)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      )}

      {recommendation.status !== 'proposed' && (
        <div className="shrink-0 border-t border-border px-5 py-3">
          <div className="flex items-center justify-center">
            <Badge variant="outline" className={cn('text-sm font-medium h-6 px-2', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      )}

    </div>
  );
}
