import { memo } from 'react';
import { Clock, DollarSign, Zap, Timer, Target, TrendingUp, Calculator, ListChecks, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SpecialistRecommendation, StructuredRecommendationContent } from '@/types/specialist';
import { cn } from '@/lib/utils';
import { formatIDR } from '@/utils/currency';

// ─── Shared Config (exported for RecommendationDetailPanel) ─────────

export const EFFORT_CONFIG = {
  low: { label: 'Low effort', className: 'text-emerald-600 bg-emerald-500/8 border-transparent', icon: Zap },
  medium: { label: 'Medium effort', className: 'text-amber-600 bg-amber-500/8 border-transparent', icon: Timer },
  high: { label: 'High effort', className: 'text-red-600 bg-red-500/8 border-transparent', icon: Clock },
};

export const STATUS_CONFIG = {
  proposed: { label: 'Tertunda', className: 'text-amber-600 bg-amber-500/8 border-transparent', dotColor: 'bg-amber-500' },
  approved: { label: 'Disetujui', className: 'text-emerald-600 bg-emerald-500/8 border-transparent', dotColor: 'bg-emerald-500' },
  rejected: { label: 'Ditolak', className: 'text-red-600 bg-red-500/8 border-transparent', dotColor: 'bg-red-500' },
  executed: { label: 'Dilaksanakan', className: 'text-blue-600 bg-blue-500/8 border-transparent', dotColor: 'bg-blue-500' },
  measured: { label: 'Terukur', className: 'text-purple-600 bg-purple-500/8 border-transparent', dotColor: 'bg-purple-500' },
};

export const IMPACT_TYPE_CONFIG = {
  revenue: { label: 'Pendapatan', icon: DollarSign, className: 'text-emerald-600' },
  cost: { label: 'Penghematan', icon: DollarSign, className: 'text-blue-600' },
  risk: { label: 'Mitigasi Risiko', icon: Zap, className: 'text-amber-600' },
  efficiency: { label: 'Efisiensi', icon: Zap, className: 'text-purple-600' },
};

export const SCOPE_CONFIG = {
  strategic: { label: 'Strategis', className: 'text-blue-600 bg-blue-500/8 border-transparent' },
  tactical: { label: 'Taktis', className: 'text-emerald-600 bg-emerald-500/8 border-transparent' },
};

// ─── Shared Utilities ────────────────────────────────────────────────

export function formatImpactValue(impact: { value: number; currency?: string }): string {
  const { value, currency } = impact;
  if (currency === 'IDR') return formatIDR(value);
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

// ─── Structured Content Section (exported for detail panel) ─────────

export function StructuredContentSection({ content }: { content: StructuredRecommendationContent }) {
  return (
    <div className="space-y-3">
      {/* Current State → Target State */}
      <div className="grid grid-cols-1 gap-2">
        <div className="rounded-md border border-red-200/50 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/30 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="h-3.5 w-3.5 text-red-500/70" />
            <span className="text-[11px] font-semibold text-red-600/80 dark:text-red-400/80 uppercase tracking-wider">Current State</span>
          </div>
          <p className="text-[13px] text-foreground/80 leading-relaxed">{content.currentState}</p>
        </div>
        <div className="rounded-md border border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/30 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500/70" />
            <span className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">Target State</span>
          </div>
          <p className="text-[13px] text-foreground/80 leading-relaxed">{content.targetState}</p>
        </div>
      </div>

      {/* Calculation */}
      {content.calculation && content.calculation.lineItems.length > 0 && (
        <div className="rounded-md border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calculator className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Calculation</span>
          </div>
          <ul className="space-y-1">
            {content.calculation.lineItems.map((item, i) => (
              <li key={i} className="text-[13px] text-foreground/75 leading-relaxed flex items-start gap-1.5">
                <span className="text-muted-foreground/40 mt-px select-none">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {content.calculation.assumptions && content.calculation.assumptions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-[13px] text-muted-foreground/50 italic mb-0.5">Assumptions:</p>
              {content.calculation.assumptions.map((a, i) => (
                <p key={i} className="text-[13px] text-muted-foreground/60 italic leading-relaxed ml-3">• {a}</p>
              ))}
            </div>
          )}
          {content.calculation.result && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-[13px] font-semibold text-foreground/90">{content.calculation.result}</p>
            </div>
          )}
        </div>
      )}

      {/* Quarterly Impact */}
      {content.quarterlyImpact && (
        <div className="flex items-center gap-2.5 rounded-md bg-blue-50/40 dark:bg-blue-950/15 border border-blue-200/40 dark:border-blue-900/30 px-3 py-2.5">
          <DollarSign className="h-4 w-4 text-blue-500/70 shrink-0" />
          <div>
            <span className="text-[11px] font-semibold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">Quarterly Impact</span>
            <p className="text-[13px] font-semibold text-blue-700 dark:text-blue-300">{content.quarterlyImpact}</p>
          </div>
        </div>
      )}

      {/* Implementation Tactics */}
      {content.tactics && content.tactics.length > 0 && (
        <div className="rounded-md border border-border/50 bg-muted/15 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Implementation Tactics</span>
          </div>
          <ul className="space-y-1">
            {content.tactics.map((tactic, i) => (
              <li key={i} className="text-[13px] text-foreground/75 leading-relaxed flex items-start gap-1.5">
                <span className="text-muted-foreground/40 mt-px select-none">•</span>
                <span>{tactic}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────

interface RecommendationCardProps {
  recommendation: SpecialistRecommendation;
  /** Override action scope badge — 'strategic' (blue) or 'tactical' (green) */
  actionScope?: 'strategic' | 'tactical';
  /** Whether this card is currently selected (highlighted) */
  isSelected?: boolean;
  /** Called when user clicks the card to open detail panel */
  onSelect?: (rec: SpecialistRecommendation) => void;
}

// ─── Compact Card ────────────────────────────────────────────────────

export const RecommendationCard = memo(function RecommendationCard({
  recommendation,
  actionScope,
  isSelected,
  onSelect,
}: RecommendationCardProps) {
  const effortConfig = EFFORT_CONFIG[recommendation.effort];
  const statusConfig = STATUS_CONFIG[recommendation.status];
  const scope = actionScope || recommendation.actionScope;
  const EffortIcon = effortConfig.icon;
  const sc = recommendation.structuredContent;

  // One-line summary: use currentState from structured content, or description truncated
  const summary = sc?.currentState
    ? sc.currentState.length > 90 ? sc.currentState.slice(0, 87).trim() + '\u2026' : sc.currentState
    : recommendation.description
      ? recommendation.description.length > 90 ? recommendation.description.slice(0, 87).trim() + '\u2026' : recommendation.description
      : '';

  return (
    <button
      onClick={() => onSelect?.(recommendation)}
      className={cn(
        'w-full text-left rounded-lg border bg-card px-3.5 py-3',
        'transition-all duration-150 group',
        isSelected
          ? 'border-primary/30 bg-primary/[0.03] shadow-sm ring-1 ring-primary/15'
          : 'border-border/60 hover:border-border hover:shadow-sm hover:bg-accent/30',
      )}
    >
      {/* Row 1: title + right-side meta */}
      <div className="flex items-start gap-2.5 min-w-0">
        {/* Left: status dot + content */}
        <div className={cn('h-2 w-2 rounded-full shrink-0 mt-1', statusConfig.dotColor)} />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 min-w-0">
            {scope && (
              <Badge variant="outline" className={cn('text-xs font-medium h-4 px-1 shrink-0', SCOPE_CONFIG[scope].className)}>
                {SCOPE_CONFIG[scope].label}
              </Badge>
            )}
            <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
              {recommendation.title}
            </span>
          </div>

          {/* Summary row */}
          {summary && (
            <p className="text-sm text-muted-foreground/55 leading-relaxed mt-0.5 truncate">
              {summary}
            </p>
          )}
        </div>

        {/* Right: impact + effort + chevron */}
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {formatImpactValue(recommendation.impact)}
          </span>
          <Badge variant="outline" className={cn('text-xs font-medium h-4 px-1', effortConfig.className)}>
            <EffortIcon className="h-2.5 w-2.5 mr-0.5" />
            {recommendation.effort}
          </Badge>
          <ChevronRight className={cn(
            'h-3.5 w-3.5 transition-colors',
            isSelected ? 'text-primary' : 'text-muted-foreground/25 group-hover:text-muted-foreground/50',
          )} />
        </div>
      </div>
    </button>
  );
});
