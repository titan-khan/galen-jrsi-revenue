import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  Target,
  RotateCw,
  Loader2,
  ChevronDown,
  BarChart3,
  Link2,
  ArrowUpRight,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecommendationCard } from '@/components/Specialists/RecommendationCard';
import { RecommendationDetailPanel } from './RecommendationDetailPanel';
import { cn } from '@/lib/utils';
import {
  groupByRootCause,
  hasCrossReferences,
  type RootCauseGroup,
  type GroupedInsightData,
} from '@/utils/insightGrouping';
import { SectionOutline } from './SectionOutline';
import type {
  Specialist,
  SpecialistInsight,
  SpecialistRecommendation,
  CrossSpecialistSignal,
  RecommendationAssignee,
} from '@/types/specialist';
import type { ExecutiveSummaryData, RootCauseItem } from '@/services/specialistRunService';

// ─── Props ───────────────────────────────────────────────────────────

interface InsightRecommendationTabProps {
  specialist: Specialist;
  insights: SpecialistInsight[];
  executiveSummary: ExecutiveSummaryData | null;
  recommendations: SpecialistRecommendation[];
  rootCauses: RootCauseItem[];
  correlations: CrossSpecialistSignal[];
  /** Pre-computed MECE grouped data (null when no cross-references) */
  grouped: GroupedInsightData | null;
  isLoading: boolean;
  onApprove: (
    recId: string,
    payload: { actor: string; note?: string; assignee?: RecommendationAssignee },
  ) => void | Promise<void>;
  onReject: (
    recId: string,
    payload: { actor: string; note: string },
  ) => void | Promise<void>;
  onReassign?: (
    recId: string,
    payload: { actor: string; assignee: RecommendationAssignee },
  ) => void | Promise<void>;
  onExecute?: (recId: string) => void;
  onMeasure?: (recId: string) => void;
  onDeepDive?: (insight: { id?: string; headline: string }) => void;
  onRunNow?: () => void;
  isRunning?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────

const EFFORT_PRIORITY: Record<string, number> = { low: 0, medium: 1, high: 2 };

type ActionSortKey = 'impact' | 'effort' | 'confidence';

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-muted-foreground/40',
};

const SEVERITY_BANNER: Record<string, { border: string; bg: string; icon: string }> = {
  critical: { border: 'border-red-200 dark:border-red-900/50', bg: 'bg-red-50/50 dark:bg-red-950/20', icon: 'text-red-500' },
  high: { border: 'border-amber-200 dark:border-amber-900/50', bg: 'bg-amber-50/50 dark:bg-amber-950/20', icon: 'text-amber-500' },
  medium: { border: 'border-blue-200 dark:border-blue-900/50', bg: 'bg-blue-50/50 dark:bg-blue-950/20', icon: 'text-blue-500' },
  low: { border: 'border-border', bg: 'bg-muted/20', icon: 'text-muted-foreground' },
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Parse **bold** markers in text into <strong> elements */
function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * Extract first N sentences. Splits on ". " boundaries but ignores periods that
 * are part of common Indonesian/English abbreviations (Kab., Kota., No., etc.) —
 * otherwise the splitter would cut a sentence mid-phrase at "Kab." and similar.
 */
function extractSentences(text: string, max = 2): string {
  const ID_ABBREV = /\b(Kab|Kota|Kec|Prov|Kel|Jl|No|Drs|Drg|Ir|Yth|St|Tn|Ny|Sdr|Dll|Dsb|Tsb|a\.l|a\.n|d\.a|u\.b|u\.p)$/i;

  const rawChunks = text.trim().split(/\.\s+/);
  const sentences: string[] = [];
  let buffer = '';

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const isLast = i === rawChunks.length - 1;
    // buffer already ends in "." (abbreviation period), so join with a single space
    const piece = (buffer ? buffer + ' ' : '') + chunk + (isLast ? '' : '.');

    if (!isLast && ID_ABBREV.test(chunk)) {
      buffer = piece;
      continue;
    }

    sentences.push(piece);
    buffer = '';
    if (sentences.length >= max) break;
  }

  return sentences.join(' ').trim();
}

/**
 * Build MECE evidence list for a root cause group.
 * Merges root cause evidence + insight headlines into ONE deduplicated list.
 * Each item appears once — no overlap between evidence bullets and finding headlines.
 */
function buildEvidenceList(
  rc: RootCauseItem,
  insights: SpecialistInsight[],
): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  // 1. Root cause evidence (primary — these are the "why" data points)
  for (const ev of rc.evidence) {
    const normalized = ev.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      items.push(ev);
    }
  }

  // 2. Insight descriptions (first sentence only) — adds "what" context
  //    Skip if the insight's key content already covered by evidence
  for (const ins of insights) {
    if (!ins.description) continue;
    const sentence = extractSentences(ins.description, 1);
    const normalized = sentence.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      items.push(sentence);
    }
  }

  return items;
}

// ─── Component ───────────────────────────────────────────────────────

export function InsightRecommendationTab({
  specialist,
  insights,
  executiveSummary,
  recommendations,
  rootCauses,
  correlations,
  grouped,
  isLoading,
  onApprove,
  onReject,
  onReassign,
  onExecute,
  onMeasure,
  onDeepDive,
  onRunNow,
  isRunning,
}: InsightRecommendationTabProps) {
  const [correlationsOpen, setCorrelationsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  // Track which root-cause cards are forced open (by rank number)
  const [openCardRanks, setOpenCardRanks] = useState<Set<number>>(new Set());
  // Detail panel state
  const [selectedRec, setSelectedRec] = useState<SpecialistRecommendation | null>(null);
  const [selectedRecContext, setSelectedRecContext] = useState<{
    rootCause?: { rank: number; cause: string; contributionPct: number };
  } | null>(null);

  const pendingRecs = useMemo(
    () => recommendations.filter((r) => r.status === 'proposed'),
    [recommendations],
  );

  const sortedPendingRecs = useMemo(
    () =>
      [...pendingRecs].sort((a, b) => {
        const aEffort = EFFORT_PRIORITY[a.effort || 'medium'] ?? 1;
        const bEffort = EFFORT_PRIORITY[b.effort || 'medium'] ?? 1;
        if (aEffort !== bEffort) return aEffort - bEffort;
        return (b.impact?.confidence ?? 0) - (a.impact?.confidence ?? 0);
      }),
    [pendingRecs],
  );

  // Severity counts for stats bar
  const severityCounts = useMemo(() => ({
    critical: insights.filter((i) => i.severity === 'critical').length,
    high: insights.filter((i) => i.severity === 'high').length,
    medium: insights.filter((i) => i.severity === 'medium').length,
    low: insights.filter((i) => i.severity === 'low').length,
  }), [insights]);

  const hasRefs = useMemo(
    () => hasCrossReferences(insights, recommendations),
    [insights, recommendations],
  );

  // Local grouping fallback when parent doesn't provide grouped data
  const localGrouped: GroupedInsightData = useMemo(
    () => grouped ?? groupByRootCause(rootCauses, insights, recommendations),
    [grouped, rootCauses, insights, recommendations],
  );

  // ─── Detail panel selection handler ─────────────────────────────────
  const handleSelectRec = useCallback((rec: SpecialistRecommendation) => {
    // Toggle off if clicking same card
    if (selectedRec?.id === rec.id) {
      setSelectedRec(null);
      setSelectedRecContext(null);
      return;
    }

    setSelectedRec(rec);

    // Find the root cause group this recommendation belongs to
    const parentGroup = localGrouped.groups.find((g) =>
      [...g.strategicActions, ...g.tacticalActions].some((a) => a.id === rec.id),
    );

    if (parentGroup) {
      const rc = parentGroup.rootCause;
      setSelectedRecContext({
        rootCause: { rank: rc.rank, cause: rc.cause, contributionPct: rc.contributionPct },
      });
    } else {
      setSelectedRecContext(null);
    }
  }, [selectedRec?.id, localGrouped.groups]);

  // ─── Scroll-based active section tracking ─────────────────────────
  // Uses IntersectionObserver for visibility + MutationObserver to
  // pick up new data-section-id elements as collapsible cards expand.
  // Now tracks against viewport since scroll is at parent level.

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const visibleSections = new Map<string, number>();
    const observed = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-section-id');
          if (!id) continue;
          if (entry.isIntersecting) {
            visibleSections.set(id, entry.intersectionRatio);
          } else {
            visibleSections.delete(id);
          }
        }

        // Pick topmost visible section
        if (visibleSections.size > 0) {
          let topId: string | null = null;
          let topY = Infinity;
          for (const [id] of visibleSections) {
            const el = container.querySelector(`[data-section-id="${id}"]`);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top < topY && rect.top >= 0) {
                topY = rect.top;
                topId = id;
              }
            }
          }
          if (topId) setActiveSectionId(topId);
        }
      },
      {
        root: null, // Use viewport as root
        threshold: [0, 0.1, 0.3],
        rootMargin: '-100px 0px -40% 0px',
      },
    );

    // Helper: observe all section markers currently in the DOM
    const observeAll = () => {
      container.querySelectorAll('[data-section-id]').forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    };

    observeAll();

    // Watch for new / removed data-section-id elements (card expand/collapse)
    const mo = new MutationObserver(() => observeAll());
    mo.observe(container, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [insights, recommendations, rootCauses, executiveSummary, correlations]);

  const handleOutlineNavigate = useCallback((sectionId: string) => {
    const container = scrollRef.current;
    if (!container) return;

    // If targeting a sub-section (rc-X-evidence / rc-X-actions), ensure the
    // parent card is expanded first so the target element exists in the DOM.
    const subMatch = sectionId.match(/^rc-(\d+)-(evidence|actions)$/);
    if (subMatch) {
      const rank = Number(subMatch[1]);
      setOpenCardRanks((prev) => {
        if (prev.has(rank)) return prev;
        const next = new Set(prev);
        next.add(rank);
        return next;
      });
      // Wait for React to render the expanded card, then scroll
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = container.querySelector(`[data-section-id="${sectionId}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      });
      return;
    }

    // Also auto-expand when clicking the parent root-cause section
    const parentMatch = sectionId.match(/^rc-(\d+)$/);
    if (parentMatch) {
      const rank = Number(parentMatch[1]);
      setOpenCardRanks((prev) => {
        if (prev.has(rank)) return prev;
        const next = new Set(prev);
        next.add(rank);
        return next;
      });
    }

    const el = container.querySelector(`[data-section-id="${sectionId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // ─── Loading ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
          <div className="h-5 bg-muted rounded w-1/4 mb-3" />
          <div className="h-4 bg-muted rounded w-2/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-3" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────

  if (!executiveSummary && insights.length === 0 && recommendations.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground/60 mb-4">
          Belum ada analisis. Jalankan spesialis untuk memulai insight.
        </p>
        {onRunNow && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onRunNow} disabled={isRunning}>
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
            {isRunning ? 'Berjalan\u2026' : 'Jalankan'}
          </Button>
        )}
      </div>
    );
  }

  // ─── Render: Outline (left) + Content (right) ─────────────────────

  return (
    <div className="flex min-h-[calc(100vh-280px)]">
      {/* Left: Outline panel */}
      <SectionOutline
        activeTab="insights"
        grouped={localGrouped}
        correlations={correlations}
        hasExecutiveSummary={!!executiveSummary}
        hasUngroupedInsights={localGrouped.ungroupedInsights.length > 0}
        hasUngroupedRecs={localGrouped.ungroupedRecommendations.length > 0}
        activeSectionId={activeSectionId}
        onNavigate={handleOutlineNavigate}
        forceCollapsed={!!selectedRec}
      />

      {/* Center: Main content */}
      <div ref={scrollRef} className="flex-1 min-w-0 px-6 pt-1">
        <div className="space-y-4 pb-8">
          {/* Stats bar */}
          <div data-section-id="insights-stats">
            <StatsBar severityCounts={severityCounts} pendingCount={pendingRecs.length} resolvedCount={recommendations.length - pendingRecs.length} />
          </div>

          {/* Problem statement */}
          {executiveSummary && (
            <div data-section-id="insights-problem">
              <ProblemStatement executiveSummary={executiveSummary} />
            </div>
          )}

          {/* Root cause breakdown */}
          {hasRefs ? (
            <MECELayout
              grouped={localGrouped}
              openCardRanks={openCardRanks}
              onToggleCard={(rank) => {
                // Remove from forced-open set when user manually toggles
                // This allows the card's internal state to take over
                setOpenCardRanks((prev) => {
                  const next = new Set(prev);
                  next.delete(rank);
                  return next;
                });
              }}
              onDeepDive={onDeepDive}
              onSelectRec={handleSelectRec}
              selectedRecId={selectedRec?.id ?? null}
            />
          ) : (
            <LegacyLayout
              insights={insights}
              rootCauses={rootCauses}
              sortedPendingRecs={sortedPendingRecs}
              onDeepDive={onDeepDive}
              onSelectRec={handleSelectRec}
              selectedRecId={selectedRec?.id ?? null}
            />
          )}

          {/* Cross-specialist signals */}
          {correlations.length > 0 && (
            <div data-section-id="insights-signals">
              <Collapsible open={correlationsOpen} onOpenChange={setCorrelationsOpen}>
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <h3 className="text-sm font-medium text-foreground">Cross-Specialist Signals</h3>
                        <Badge variant="outline" className="text-xs font-medium h-5 px-1.5 text-muted-foreground bg-muted/50 border-transparent">
                          {correlations.length}
                        </Badge>
                      </div>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground/50 transition-transform duration-200', correlationsOpen && 'rotate-180')} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 space-y-2">
                      {correlations.map((signal, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{signal.targetSpecialistName || signal.targetSpecialistId}</span>
                            <Badge variant="outline" className="text-xs font-medium h-5 px-1.5 text-muted-foreground border-transparent bg-muted/50">
                              {Math.round(signal.correlationStrength * 100)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground/70 leading-relaxed">
                            {extractSentences(signal.causalLink, 2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          )}
        </div>
      </div>

      {/* Right: Recommendation detail panel */}
      <div
        className={cn(
          'shrink-0 border-l border-border overflow-hidden transition-all duration-200 ease-in-out self-start sticky top-0 max-h-screen overflow-y-auto',
          selectedRec ? 'w-[480px] opacity-100' : 'w-0 opacity-0 border-l-0',
        )}
      >
        {selectedRec && (
          <RecommendationDetailPanel
            recommendation={selectedRec}
            rootCause={selectedRecContext?.rootCause}
            insights={insights}
            onClose={() => { setSelectedRec(null); setSelectedRecContext(null); }}
            onApprove={onApprove}
            onReject={onReject}
            onReassign={onReassign}
            onDeepDive={onDeepDive}
          />
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Sub-components
// =====================================================================

// ─── Stats Bar ───────────────────────────────────────────────────────

function StatsBar({
  severityCounts,
  pendingCount,
  resolvedCount,
}: {
  severityCounts: { critical: number; high: number; medium: number; low: number };
  pendingCount: number;
  resolvedCount: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card">
      <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wide mr-1">Temuan</span>
      {severityCounts.critical > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-600">{severityCounts.critical} kritis</span>
        </div>
      )}
      {severityCounts.high > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-sm font-medium text-amber-600">{severityCounts.high} tinggi</span>
        </div>
      )}
      {severityCounts.medium > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-blue-600">{severityCounts.medium} sedang</span>
        </div>
      )}
      {severityCounts.low > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          <span className="text-sm font-medium text-muted-foreground">{severityCounts.low} rendah</span>
        </div>
      )}
      <div className="h-3.5 w-px bg-border mx-1" />
      <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wide mr-1">Aksi</span>
      <span className="text-sm font-medium text-foreground/80">{pendingCount} tertunda</span>
      {resolvedCount > 0 && (
        <span className="text-sm text-muted-foreground/50">· {resolvedCount} selesai</span>
      )}
    </div>
  );
}

// ─── Problem Statement ──────────────────────────────────────────────

function ProblemStatement({ executiveSummary }: { executiveSummary: ExecutiveSummaryData }) {
  const style = SEVERITY_BANNER[executiveSummary.severity] || SEVERITY_BANNER.medium;

  return (
    <div className={cn('rounded-lg border p-4', style.border, style.bg)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', style.icon)} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Inti Permasalahan</p>
          <p className="text-sm font-medium text-foreground leading-snug">
            {renderBoldText(executiveSummary.headline)}
          </p>
          {executiveSummary.keyFinding && (
            <p className="text-sm text-muted-foreground/70 leading-relaxed mt-1.5">
              {renderBoldText(extractSentences(executiveSummary.keyFinding, 2))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MECE Layout (root cause buckets — no overlapping info) ──────────

function MECELayout({
  grouped,
  openCardRanks,
  onToggleCard,
  onDeepDive,
  onSelectRec,
  selectedRecId,
}: {
  grouped: GroupedInsightData;
  openCardRanks: Set<number>;
  onToggleCard: (rank: number) => void;
  onDeepDive?: (insight: { headline: string }) => void;
  onSelectRec: (rec: SpecialistRecommendation) => void;
  selectedRecId: string | null;
}) {
  return (
    <div className="space-y-3">
      {grouped.groups.map((g, idx) => (
        <div key={g.rootCause.rank} data-section-id={`rc-${g.rootCause.rank}`}>
          <RootCauseCard
            group={g}
            isFirst={idx === 0}
            forceOpen={openCardRanks.has(g.rootCause.rank)}
            onToggle={() => onToggleCard(g.rootCause.rank)}
            onDeepDive={onDeepDive}
            onSelectRec={onSelectRec}
            selectedRecId={selectedRecId}
          />
        </div>
      ))}

      {/* Ungrouped: anything that didn't map (CE — collectively exhaustive) */}
      {grouped.ungroupedInsights.length > 0 && (
        <div data-section-id="insights-other-observations" className="rounded-lg border border-dashed border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50" />
            <h3 className="text-sm font-medium text-foreground">Other Observations</h3>
            <Badge variant="outline" className="text-xs font-medium h-5 px-1.5 text-muted-foreground bg-muted/50 border-transparent">
              {grouped.ungroupedInsights.length}
            </Badge>
          </div>
          <ul className="space-y-1.5">
            {grouped.ungroupedInsights.map((ins) => (
              <li key={ins.id} className="flex items-start gap-2 text-sm text-muted-foreground/80">
                <div className={cn('h-1.5 w-1.5 rounded-full shrink-0 mt-1.5', SEVERITY_DOT[ins.severity] || SEVERITY_DOT.medium)} />
                <span>{ins.headline}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {grouped.ungroupedRecommendations.length > 0 && (
        <div data-section-id="insights-other-actions" className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            <h3 className="text-sm font-medium text-foreground">Aksi Lain</h3>
          </div>
          {grouped.ungroupedRecommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onSelect={onSelectRec}
              isSelected={selectedRecId === rec.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root Cause Card (single MECE bucket) ────────────────────────────
//
// Structure:
//   Header: rank badge + cause name + contribution% + finding count + action count
//   Body:
//     EVIDENCE — merged list (root cause evidence + insight first sentences, deduplicated)
//     ACTIONS  — recommendation cards
//
// No separate FindingsTable. No hypothesis diagram.
// Each piece of information appears exactly ONCE.

function RootCauseCard({
  group,
  isFirst,
  forceOpen,
  onToggle,
  onDeepDive,
  onSelectRec,
  selectedRecId,
}: {
  group: RootCauseGroup;
  isFirst: boolean;
  /** When true the card body is shown (driven by outline navigation) */
  forceOpen?: boolean;
  /** Notify parent when user manually toggles the card */
  onToggle?: () => void;
  onDeepDive?: (insight: { headline: string }) => void;
  onSelectRec: (rec: SpecialistRecommendation) => void;
  selectedRecId: string | null;
}) {
  const rc = group.rootCause;
  const [localOpen, setLocalOpen] = useState(false);
  const [actionSort, setActionSort] = useState<ActionSortKey>('impact');
  const isOpen = forceOpen || localOpen;
  const totalActions = group.strategicActions.length + group.tacticalActions.length;
  const evidenceList = useMemo(() => buildEvidenceList(rc, group.insights), [rc, group.insights]);

  const sortedActions = useMemo(() => {
    const all = [...group.strategicActions, ...group.tacticalActions];
    return all.sort((a, b) => {
      switch (actionSort) {
        case 'impact':
          return (b.impact?.value ?? 0) - (a.impact?.value ?? 0);
        case 'effort':
          return (EFFORT_PRIORITY[a.effort || 'medium'] ?? 1) - (EFFORT_PRIORITY[b.effort || 'medium'] ?? 1);
        case 'confidence':
          return (b.impact?.confidence ?? 0) - (a.impact?.confidence ?? 0);
        default:
          return 0;
      }
    });
  }, [group.strategicActions, group.tacticalActions, actionSort]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* ── Header ── */}
      <button
        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => { 
          setLocalOpen((p) => !p); 
          onToggle?.(); 
        }}
      >
        {/* Rank badge */}
        <span
          className={cn(
            'shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold',
            rc.rank === 1
              ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
              : rc.rank === 2
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {rc.rank}
        </span>

        {/* Cause + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{rc.cause}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/50">
            <span className="font-semibold text-foreground/60">{rc.contributionPct}%</span>
            <span>impact</span>
            <span className="text-muted-foreground/30">·</span>
            <span>{evidenceList.length} evidence</span>
            <span className="text-muted-foreground/30">·</span>
            <span>{totalActions} action{totalActions !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground/40 transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* ── Body (expanded) ── */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30">

          {/* ── EVIDENCE — single merged list ── */}
          {evidenceList.length > 0 && (
            <div className="pt-3" data-section-id={`rc-${rc.rank}-evidence`}>
              <SectionLabel icon={<Target className="h-3 w-3" />} label="Bukti" className="mb-2" />
              <div className="rounded-md bg-muted/15 border border-border/30 px-3 py-2.5">
                <ul className="space-y-1.5">
                  {evidenceList.map((ev, i) => (
                    <li key={i} className="text-sm text-muted-foreground/80 leading-relaxed flex items-start gap-2">
                      <span className="text-muted-foreground/30 shrink-0 mt-0.5 font-mono text-xs">{i + 1}.</span>
                      <span>{renderBoldText(ev)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── ACTIONS — what to do ── */}
          {totalActions > 0 && (
            <div data-section-id={`rc-${rc.rank}-actions`}>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel icon={<CheckCircle2 className="h-3 w-3" />} label="Aksi" />
                {totalActions > 1 && (
                  <Select value={actionSort} onValueChange={(v) => setActionSort(v as ActionSortKey)}>
                    <SelectTrigger className="h-5 w-auto text-xs text-muted-foreground/60 border-0 bg-transparent shadow-none px-1.5 py-0 gap-1 hover:text-muted-foreground focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end" className="min-w-[120px]">
                      <SelectItem value="impact" className="text-sm">Impact ↓</SelectItem>
                      <SelectItem value="effort" className="text-sm">Effort ↑</SelectItem>
                      <SelectItem value="confidence" className="text-sm">Confidence ↓</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                {sortedActions.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    actionScope={rec.actionScope === 'strategic' ? 'strategic' : 'tactical'}
                    onSelect={onSelectRec}
                    isSelected={selectedRecId === rec.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Deep Dive CTA ── */}
          <div className="pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-sm text-muted-foreground hover:text-foreground px-2"
              onClick={() => onDeepDive?.({ headline: rc.cause })}
            >
              Telusuri
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Label ───────────────────────────────────────────────────

function SectionLabel({ icon, label, className }: { icon: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-muted-foreground/40">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">{label}</span>
    </div>
  );
}

// ─── Legacy Layout (no cross-refs — flat MECE structure) ─────────────

function LegacyLayout({
  insights,
  rootCauses,
  sortedPendingRecs,
  onDeepDive,
  onSelectRec,
  selectedRecId,
}: {
  insights: SpecialistInsight[];
  rootCauses: RootCauseItem[];
  sortedPendingRecs: SpecialistRecommendation[];
  onDeepDive?: (insight: { headline: string }) => void;
  onSelectRec: (rec: SpecialistRecommendation) => void;
  selectedRecId: string | null;
}) {
  return (
    <>
      {/* Root Causes with evidence */}
      {rootCauses.length > 0 && (
        <div className="space-y-3">
          <SectionLabel icon={<Target className="h-3 w-3" />} label="Akar Masalah" className="mb-2" />
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border/30">
            {rootCauses.map((rc) => (
              <div key={rc.rank} className="px-4 py-3 flex items-start gap-3">
                <span
                  className={cn(
                    'shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mt-0.5',
                    rc.rank === 1
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                      : rc.rank === 2
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {rc.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{rc.cause}</span>
                    <span className="text-xs text-muted-foreground/50">
                      {rc.contributionPct}% · {rc.confidence}% conf.
                    </span>
                  </div>
                  {rc.evidence.length > 0 && (
                    <p className="text-sm text-muted-foreground/70 leading-relaxed mt-1">
                      {rc.evidence[0]}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-6 gap-1 text-sm text-muted-foreground hover:text-foreground px-2 mt-0.5"
                  onClick={() => onDeepDive?.({ headline: rc.cause })}
                >
                  Telusuri
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings — shown separately only when no root cause grouping */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <SectionLabel icon={<BarChart3 className="h-3 w-3" />} label="Temuan Utama" className="mb-2" />
          <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border/30">
            {insights.map((ins) => (
              <div key={ins.id} className="px-4 py-2.5 flex items-start gap-2">
                <div className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', SEVERITY_DOT[ins.severity] || SEVERITY_DOT.medium)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{ins.headline}</span>
                </div>
                <Badge variant="outline" className="text-xs h-4 px-1.5 text-muted-foreground border-border/50 shrink-0">
                  {ins.confidence}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {sortedPendingRecs.length > 0 && (
        <div className="space-y-3">
          <SectionLabel icon={<CheckCircle2 className="h-3 w-3" />} label="Rekomendasi Aksi" className="mb-2" />
          <div className="space-y-2.5">
            {sortedPendingRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onSelect={onSelectRec}
                isSelected={selectedRecId === rec.id}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
