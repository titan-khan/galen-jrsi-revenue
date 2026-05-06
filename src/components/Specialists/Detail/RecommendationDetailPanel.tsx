import { useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calendar,
  UserCog,
  Activity,
  Search,
  ArrowUpRight,
  Plus,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type {
  SpecialistRecommendation,
  SpecialistInsight,
  RecommendationActivityAction,
  RecommendationAssignee,
} from '@/types/specialist';
import {
  StructuredContentSection,
  EFFORT_CONFIG,
  STATUS_CONFIG,
  IMPACT_TYPE_CONFIG,
  SCOPE_CONFIG,
  formatImpactValue,
} from '@/components/Specialists/RecommendationCard';
import { ApproveDialog, RejectDialog, ReassignDialog } from './ApprovalDialogs';

// ─── Types ───────────────────────────────────────────────────────────

interface RecommendationDetailPanelProps {
  recommendation: SpecialistRecommendation;
  /** Parent root cause info for context display */
  rootCause?: { rank: number; cause: string; contributionPct: number };
  /** All insights for this specialist — used to resolve linked findings */
  insights?: SpecialistInsight[];
  onClose: () => void;
  /** Approve with capture of actor + assignee + note */
  onApprove: (
    id: string,
    payload: { actor: string; note?: string; assignee?: RecommendationAssignee },
  ) => void | Promise<void>;
  /** Reject with capture of actor + reason */
  onReject: (id: string, payload: { actor: string; note: string }) => void | Promise<void>;
  /** Reassign PIC */
  onReassign?: (
    id: string,
    payload: { actor: string; assignee: RecommendationAssignee },
  ) => void | Promise<void>;
  /** Click-through on a linked finding */
  onDeepDive?: (insight: { id: string; headline: string }) => void;
}

// ─── Rank Badge Colors ───────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  2: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
};
const DEFAULT_RANK_COLOR = 'bg-muted text-muted-foreground';

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-muted-foreground/40',
};

const ACTIVITY_ICON: Record<RecommendationActivityAction, { icon: typeof Plus; className: string }> = {
  created: { icon: Sparkles, className: 'text-muted-foreground/60' },
  approved: { icon: CheckCircle2, className: 'text-emerald-500' },
  rejected: { icon: XCircle, className: 'text-red-500' },
  executed: { icon: RotateCw, className: 'text-blue-500' },
  measured: { icon: Activity, className: 'text-purple-500' },
  reassigned: { icon: UserCog, className: 'text-amber-500' },
};

const ACTIVITY_LABEL: Record<RecommendationActivityAction, string> = {
  created: 'Dibuat dari run AI',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  executed: 'Mulai dieksekusi',
  measured: 'Dampak terukur',
  reassigned: 'PIC diubah',
};

// ─── Helper: build initials from a name ──────────────────────────────

function getInitials(name: string): string {
  const parts = name
    .replace(/\b(Drs|Drg|Ir|H|Hj|S\.?H|S\.?T|S\.?Sos|M\.?Si|M\.?M|Bapak|Ibu|Pak|Bu)\.?\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────

export function RecommendationDetailPanel({
  recommendation,
  rootCause,
  insights,
  onClose,
  onApprove,
  onReject,
  onReassign,
  onDeepDive,
}: RecommendationDetailPanelProps) {
  const effortConfig = EFFORT_CONFIG[recommendation.effort];
  const statusConfig = STATUS_CONFIG[recommendation.status];
  const impactConfig = IMPACT_TYPE_CONFIG[recommendation.impact.type];
  const scope = recommendation.actionScope;
  const sc = recommendation.structuredContent;
  const EffortIcon = effortConfig.icon;
  const ImpactIcon = impactConfig.icon;

  // Dialog state
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  // Resolve linked findings from relatedInsightIds
  const linkedFindings = useMemo(() => {
    if (!insights || !recommendation.relatedInsightIds?.length) return [];
    const idSet = new Set(recommendation.relatedInsightIds);
    return insights.filter((ins) => idSet.has(ins.id));
  }, [insights, recommendation.relatedInsightIds]);

  // Activity log — fall back to a synthetic "created" entry when log empty
  const activity = useMemo(() => {
    const log = recommendation.activityLog ?? [];
    if (log.length > 0) {
      return [...log].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return [
      {
        id: `${recommendation.id}-created`,
        action: 'created' as const,
        createdAt: recommendation.createdAt,
      },
    ];
  }, [recommendation.activityLog, recommendation.createdAt, recommendation.id]);

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

          {/* Structured Content (McKinsey breakdown):
              Current State → Target State → Calculation+Assumptions → Quarterly Impact → Implementation Tactics */}
          {sc && <StructuredContentSection content={sc} />}

          {/* PIC / Penanggung Jawab (after Implementation Tactics) */}
          <PICSection
            assignee={recommendation.assignee}
            canEdit={!!onReassign}
            onEdit={() => setReassignOpen(true)}
          />

          {/* Linked Findings */}
          {linkedFindings.length > 0 && (
            <LinkedFindingsSection findings={linkedFindings} onDeepDive={onDeepDive} />
          )}

          {/* Activity log */}
          <ActivityLogSection entries={activity} />

          {/* Approval / rejection note shown for non-proposed states */}
          {recommendation.approvalNote && recommendation.status === 'approved' && (
            <NotePill
              variant="approved"
              actor={recommendation.approvedBy}
              note={recommendation.approvalNote}
            />
          )}
          {recommendation.rejectedNote && recommendation.status === 'rejected' && (
            <NotePill
              variant="rejected"
              actor={recommendation.rejectedBy}
              note={recommendation.rejectedNote}
            />
          )}

          {/* Metadata footer */}
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
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-sm px-4 flex-1"
              onClick={() => setApproveOpen(true)}
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

      {/* ── Dialogs ── */}
      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        recommendationTitle={recommendation.title}
        defaultAssignee={recommendation.assignee}
        onConfirm={async (payload) => onApprove(recommendation.id, payload)}
      />
      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        recommendationTitle={recommendation.title}
        onConfirm={async (payload) => onReject(recommendation.id, payload)}
      />
      {onReassign && (
        <ReassignDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          currentAssignee={recommendation.assignee}
          onConfirm={async (payload) => onReassign(recommendation.id, payload)}
        />
      )}
    </div>
  );
}

// ─── Sub-section: PIC ───────────────────────────────────────────────

function PICSection({
  assignee,
  canEdit,
  onEdit,
}: {
  assignee?: RecommendationAssignee;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
          Penanggung Jawab
        </p>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-xs text-muted-foreground/70 hover:text-foreground px-1.5"
            onClick={onEdit}
          >
            <UserCog className="h-3 w-3" />
            {assignee ? 'Ubah' : 'Tugaskan'}
          </Button>
        )}
      </div>
      {assignee ? (
        <div className="flex items-center gap-2.5 rounded-md border border-border/50 bg-muted/15 px-3 py-2.5">
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-bold">
            {getInitials(assignee.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground truncate">{assignee.name}</p>
            <p className="text-xs text-muted-foreground/70 truncate">
              {assignee.role}
              {assignee.unit ? ` · ${assignee.unit}` : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground/60 italic">
          Belum ditugaskan ke PIC
        </div>
      )}
    </div>
  );
}

// ─── Sub-section: Linked Findings ────────────────────────────────────

function LinkedFindingsSection({
  findings,
  onDeepDive,
}: {
  findings: SpecialistInsight[];
  onDeepDive?: (insight: { id: string; headline: string }) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Search className="h-3 w-3 text-muted-foreground/50" />
        <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
          Temuan Terkait
        </p>
      </div>
      <div className="rounded-md border border-border/50 bg-muted/10 divide-y divide-border/30">
        {findings.map((ins) => (
          <button
            key={ins.id}
            onClick={() => onDeepDive?.({ id: ins.id, headline: ins.headline })}
            className={cn(
              'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors',
              onDeepDive ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default',
            )}
            disabled={!onDeepDive}
          >
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0 mt-1.5',
                SEVERITY_DOT[ins.severity] || SEVERITY_DOT.medium,
              )}
            />
            <span className="flex-1 min-w-0 text-[13px] text-foreground/85 leading-snug">
              {ins.headline}
            </span>
            {onDeepDive && (
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-section: Activity Log ───────────────────────────────────────

function ActivityLogSection({
  entries,
}: {
  entries: Array<{
    id: string;
    action: RecommendationActivityAction;
    actor?: string;
    note?: string;
    createdAt: string;
  }>;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Activity className="h-3 w-3 text-muted-foreground/50" />
        <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
          Aktivitas
        </p>
      </div>
      <ol className="space-y-2.5 relative ml-1.5 pl-3 border-l border-border/40">
        {entries.map((entry) => {
          const cfg = ACTIVITY_ICON[entry.action] ?? ACTIVITY_ICON.created;
          const Icon = cfg.icon;
          const label = ACTIVITY_LABEL[entry.action] ?? entry.action;
          return (
            <li key={entry.id} className="relative">
              <span
                className={cn(
                  'absolute -left-[19px] top-0 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-background ring-2 ring-background',
                  cfg.className,
                )}
              >
                <Icon className="h-2.5 w-2.5" />
              </span>
              <div className="text-[13px] text-foreground/85 leading-snug">
                <span className="font-medium">{label}</span>
                {entry.actor && (
                  <span className="text-muted-foreground/70"> oleh {entry.actor}</span>
                )}
                <span className="text-muted-foreground/45 text-xs ml-1.5">
                  · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </div>
              {entry.note && (
                <p className="mt-0.5 text-xs text-muted-foreground/70 italic leading-relaxed">
                  &ldquo;{entry.note}&rdquo;
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── Sub-section: Note pill (post-decision) ──────────────────────────

function NotePill({
  variant,
  actor,
  note,
}: {
  variant: 'approved' | 'rejected';
  actor?: string;
  note: string;
}) {
  const isApproved = variant === 'approved';
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        isApproved
          ? 'border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/30'
          : 'border-red-200/50 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/30',
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isApproved ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-red-500/80" />
        )}
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wider',
            isApproved ? 'text-emerald-600/80' : 'text-red-600/80',
          )}
        >
          {isApproved ? 'Catatan Persetujuan' : 'Alasan Penolakan'}
          {actor ? ` · ${actor}` : ''}
        </span>
      </div>
      <p className="text-[13px] text-foreground/80 leading-relaxed">{note}</p>
    </div>
  );
}
