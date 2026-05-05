import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertCircle, ListChecks, Loader2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Specialist, SpecialistStatus } from '@/types/specialist';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { SpecialistSummary } from '@/services/specialistRunService';
import { usePrefetch } from '@/hooks/usePrefetch';
import { cacheKeys } from '@/lib/cacheKeys';
import { 
  getLatestFindings,
  getSpecialistInsights,
  getExecutiveSummary,
  getSpecialistRecommendations,
  getRootCauses,
  getCrossSpecialistSignals,
  getAISummary,
  getSpecialistRunHistory,
} from '@/services/specialistRunService';

const STATUS_STYLES: Record<SpecialistStatus, { label: string; dotColor: string }> = {
  active: { label: 'Aktif', dotColor: 'bg-emerald-500' },
  paused: { label: 'Dijeda', dotColor: 'bg-muted-foreground/40' },
};

const RUN_STATUS_LABEL: Record<string, { text: string; className: string; pulse?: boolean }> = {
  completed: { text: 'Selesai', className: 'text-emerald-600' },
  running: { text: 'Berjalan...', className: 'text-blue-600', pulse: true },
  pending: { text: 'Antri', className: 'text-blue-600', pulse: true },
  failed: { text: 'Gagal', className: 'text-red-500' },
};

interface SpecialistCardNewProps {
  specialist: Specialist;
  summary?: SpecialistSummary;
}

export const SpecialistCardNew = memo(function SpecialistCardNew({
  specialist,
  summary,
}: SpecialistCardNewProps) {
  const navigate = useNavigate();
  const { onHoverStart, onHoverEnd } = usePrefetch();
  const status = STATUS_STYLES[specialist.status];

  const hasCritical = (summary?.criticalInsights || 0) > 0;
  const hasHigh = (summary?.highInsights || 0) > 0;
  const hasPending = (summary?.pendingActions || 0) > 0;
  const hasSignals = hasCritical || hasHigh || hasPending;

  const allMetrics = specialist.metrics || [];

  const runStatus = summary?.lastRunStatus
    ? RUN_STATUS_LABEL[summary.lastRunStatus]
    : null;

  // Prefetch specialist run data on hover
  const handleMouseEnter = () => {
    onHoverStart(
      cacheKeys.specialists.runs(specialist.id),
      async () => {
        // Prefetch all specialist run data in parallel
        const [
          findings,
          insights,
          summaryData,
          recommendations,
          rootCauses,
          correlations,
          aiSummary,
          history,
        ] = await Promise.all([
          getLatestFindings(specialist.id),
          getSpecialistInsights(specialist.id),
          getExecutiveSummary(specialist.id),
          getSpecialistRecommendations(specialist.id),
          getRootCauses(specialist.id),
          getCrossSpecialistSignals(specialist.id),
          getAISummary(specialist.id),
          getSpecialistRunHistory(specialist.id, 20),
        ]);
        
        return {
          findings,
          insights,
          summary: summaryData,
          recommendations,
          rootCauses,
          correlations,
          aiSummary,
          history,
        };
      }
    );
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border bg-card p-5 flex flex-col',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-sm hover:bg-accent/30',
        hasCritical && 'border-red-200/60 dark:border-red-900/30',
      )}
      onClick={() => navigate(`/specialists/${specialist.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
    >
      {/* Top row: status + arrow */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', status.dotColor)} />
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
            {status.label}
          </span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
      </div>

      {/* Name — fixed single line */}
      <h3 className="text-[13px] font-semibold text-foreground mb-1 truncate leading-tight">
        {specialist.name}
      </h3>

      {/* Description — fixed 2-line height so content below stays aligned */}
      <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed min-h-[2.5rem] mb-3">
        {specialist.description}
      </p>

      {/* Metric chips — fixed single-row slot */}
      <div className="h-5 mb-3">
        {allMetrics.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 overflow-hidden h-5">
                {allMetrics.slice(0, 3).map((m) => (
                  <span
                    key={m.id}
                    className="min-w-0 px-2 py-0.5 rounded-full bg-muted/50 text-[10px] font-medium text-muted-foreground/70 truncate"
                  >
                    {m.name}
                  </span>
                ))}
                {allMetrics.length > 3 && (
                  <span className="shrink-0 text-[10px] text-muted-foreground/40">
                    +{allMetrics.length - 3}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="max-w-[220px]">
              <p className="text-[11px] font-medium mb-1">Monitored Metrics</p>
              <ul className="space-y-0.5">
                {allMetrics.map((m) => (
                  <li key={m.id} className="text-[11px] text-popover-foreground/80">
                    {m.name}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* Signal row — fixed slot */}
      <div className="h-4 mb-3">
        {hasSignals && (
          <div className="flex items-center gap-3">
            {hasCritical && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                {summary!.criticalInsights} kritis
              </span>
            )}
            {hasHigh && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                {summary!.highInsights} tinggi
              </span>
            )}
            {hasPending && (
              <>
                {(hasCritical || hasHigh) && (
                  <span className="text-muted-foreground/20">·</span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <ListChecks className="h-3 w-3" />
                  {summary!.pendingActions} tertunda
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer: last run info — pushed to bottom */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 mt-auto">
        {runStatus?.pulse && (
          <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
        )}
        {specialist.lastActiveAt ? (
          <span>
            {formatDistanceToNow(new Date(specialist.lastActiveAt), { addSuffix: true, locale: idLocale })}
            {runStatus && !runStatus.pulse && (
              <span className={cn('ml-1', runStatus.className)}>
                · {runStatus.text}
              </span>
            )}
            {runStatus?.pulse && (
              <span className={cn('ml-1', runStatus.className)}>
                {runStatus.text}
              </span>
            )}
          </span>
        ) : (
          <span>Belum pernah dijalankan</span>
        )}
      </div>
    </div>
  );
});
