import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  InsightItem,
  Report,
  ReportFormat,
  ReportGap,
  ReportContent,
  ReportGenerationStatus,
} from '@/types/insight';
import {
  loadAllInsights,
  saveInsight,
  deleteInsight,
  deleteInsightsByConversation,
  loadAllReports,
  saveReport,
  updateReportInDb,
  deleteReportFromDb,
} from '@/services/insightDbService';

// ─── Panel view states ───────────────────────────────────────────
export type PanelView = 'collapsed' | 'insights' | 'report-builder';

interface InsightPanelState {
  /** Current panel view */
  view: PanelView;
  /** Active conversation ID for scoping insights */
  activeConversationId: string | null;
  /** Insights for the ACTIVE conversation (derived) */
  insights: InsightItem[];
  /** Whether the "show all" is expanded (vs top-3) */
  isExpanded: boolean;
  /** All saved reports (across all conversations) */
  reports: Report[];
  /** Report builder: selected insight IDs */
  selectedInsightIds: Set<string>;
  /** Report builder: chosen format */
  reportFormat: ReportFormat;
  /** Report builder: detected gaps */
  reportGaps: ReportGap[];
  /** Whether data is still loading from the database */
  isLoading: boolean;
}

interface InsightPanelActions {
  // Panel navigation
  setView: (view: PanelView) => void;
  togglePanel: () => void;

  // Conversation scoping
  setActiveConversationId: (id: string | null) => void;

  // Insight management (operates on active conversation)
  addInsight: (insight: Omit<InsightItem, 'id' | 'createdAt'>) => void;
  removeInsight: (id: string) => void;
  updateInsight: (id: string, updates: Partial<Pick<InsightItem, 'title' | 'description'>>) => void;
  clearInsights: () => void;
  setExpanded: (expanded: boolean) => void;

  // Report builder
  toggleInsightSelection: (id: string) => void;
  selectAllInsights: () => void;
  deselectAllInsights: () => void;
  setReportFormat: (format: ReportFormat) => void;
  setReportGaps: (gaps: ReportGap[]) => void;
  /** Creates the report shell immediately. Returns the report (with generationStatus: 'generating'). */
  generateReport: (conversationId: string, title: string) => Report;
  /** Updates a report with AI-generated content or error. */
  updateReportGeneration: (
    reportId: string,
    status: ReportGenerationStatus,
    content?: ReportContent,
    error?: string
  ) => void;
  dismissGap: (gapId: string) => void;

  // Reports
  deleteReport: (id: string) => void;
  updateReportTitle: (reportId: string, newTitle: string) => void;
  getReportByConversationId: (conversationId: string) => Report | undefined;
  updateReportMetadata: (reportId: string, updates: Partial<Report>) => void;
}

type InsightPanelContextValue = InsightPanelState & InsightPanelActions;

const InsightPanelContext = createContext<InsightPanelContextValue | null>(null);

// ─── Helper: generate a simple unique ID ─────────────────────────
let idCounter = 0;
function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

// ─── Provider ────────────────────────────────────────────────────
export function InsightPanelProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<PanelView>('collapsed');
  const [activeConversationId, setActiveConversationIdRaw] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Conversation-keyed insight storage ──
  const [insightsByConversation, setInsightsByConversation] = useState<
    Record<string, InsightItem[]>
  >({});

  const [isExpanded, setExpanded] = useState(false);

  // ── Reports ──
  const [reports, setReports] = useState<Report[]>([]);

  const [selectedInsightIds, setSelectedInsightIds] = useState<Set<string>>(new Set());
  const [reportFormat, setReportFormat] = useState<ReportFormat>('full-report');
  const [reportGaps, setReportGaps] = useState<ReportGap[]>([]);

  // ── Load from database on mount ─────────────────────────────────
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function hydrateFromDb() {
      try {
        const [dbInsights, dbReports] = await Promise.all([
          loadAllInsights(),
          loadAllReports(),
        ]);

        setInsightsByConversation(dbInsights);

        // Mark reports stuck in 'generating' as 'error' (generation was lost)
        const cleanedReports = dbReports.map((r) => {
          if (r.generationStatus === 'generating') {
            const cleaned = {
              ...r,
              generationStatus: 'error' as ReportGenerationStatus,
              generationError: 'Generation was interrupted. Please retry.',
            };
            // Also update DB
            updateReportInDb(cleaned.id, {
              generationStatus: 'error',
              generationError: 'Generation was interrupted. Please retry.',
            });
            return cleaned;
          }
          return r;
        });

        setReports(cleanedReports);
      } catch (err) {
        console.error('[InsightPanelContext] Failed to load from DB:', err);
      } finally {
        setIsLoading(false);
      }
    }

    hydrateFromDb();
  }, []);

  // ── Derived: current conversation's insights ───────────────────
  const insights = useMemo(
    () => (activeConversationId ? insightsByConversation[activeConversationId] ?? [] : []),
    [activeConversationId, insightsByConversation]
  );

  // ── Set active conversation (reset report-builder state) ───────
  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdRaw((prev) => {
      if (prev === id) return prev;
      setExpanded(false);
      setSelectedInsightIds(new Set());
      setReportGaps([]);

      // Read the current insightsByConversation to decide panel visibility.
      // We use the setter's callback form to peek at current state without
      // actually mutating it (return the same object).
      setInsightsByConversation((convMap) => {
        const targetInsights = id ? convMap[id] ?? [] : [];
        if (targetInsights.length > 0) {
          // Switching to a conversation WITH insights → auto-open panel
          setView('insights');
        } else {
          // Switching to a conversation WITHOUT insights → collapse
          setView('collapsed');
        }
        return convMap; // no mutation — just peeking
      });

      return id;
    });
  }, []);

  const togglePanel = useCallback(() => {
    setView((v) => (v === 'collapsed' ? 'insights' : 'collapsed'));
  }, []);

  // ── Insight CRUD (scoped to active conversation) ───────────────
  const addInsight = useCallback(
    (partial: Omit<InsightItem, 'id' | 'createdAt'>) => {
      if (!activeConversationId) return;

      const item: InsightItem = {
        ...partial,
        id: generateId('ins'),
        createdAt: new Date().toISOString(),
      };

      setInsightsByConversation((prev) => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] ?? []), item],
      }));

      setSelectedInsightIds((prev) => new Set([...prev, item.id]));

      // Persist to DB (fire-and-forget)
      saveInsight(activeConversationId, item);
    },
    [activeConversationId]
  );

  const removeInsight = useCallback(
    (id: string) => {
      if (!activeConversationId) return;

      setInsightsByConversation((prev) => ({
        ...prev,
        [activeConversationId]: (prev[activeConversationId] ?? []).filter(
          (i) => i.id !== id
        ),
      }));

      setSelectedInsightIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      // Persist to DB (fire-and-forget)
      deleteInsight(id);
    },
    [activeConversationId]
  );

  const updateInsight = useCallback(
    (id: string, updates: Partial<Pick<InsightItem, 'title' | 'description'>>) => {
      if (!activeConversationId) return;

      // Find the current insight and merge updates BEFORE state update
      const currentInsight = insightsByConversation[activeConversationId]?.find(i => i.id === id);
      if (!currentInsight) return;

      const mergedInsight: InsightItem = { ...currentInsight, ...updates };

      // Update state
      setInsightsByConversation((prev) => ({
        ...prev,
        [activeConversationId]: (prev[activeConversationId] ?? []).map((i) =>
          i.id === id ? mergedInsight : i
        ),
      }));

      // Persist to DB with the same merged data (fire-and-forget)
      saveInsight(activeConversationId, mergedInsight);
    },
    [activeConversationId, insightsByConversation]
  );

  const clearInsights = useCallback(() => {
    if (!activeConversationId) return;

    setInsightsByConversation((prev) => {
      const next = { ...prev };
      delete next[activeConversationId];
      return next;
    });
    setSelectedInsightIds(new Set());
    setReportGaps([]);
    setExpanded(false);

    // Persist to DB (fire-and-forget)
    deleteInsightsByConversation(activeConversationId);
  }, [activeConversationId]);

  // ── Report builder ─────────────────────────────────────────────
  const toggleInsightSelection = useCallback((id: string) => {
    setSelectedInsightIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllInsights = useCallback(() => {
    setSelectedInsightIds(new Set(insights.map((i) => i.id)));
  }, [insights]);

  const deselectAllInsights = useCallback(() => {
    setSelectedInsightIds(new Set());
  }, []);

  const generateReport = useCallback(
    (conversationId: string, title: string): Report => {
      const included = insights.filter((i) => selectedInsightIds.has(i.id));

      const report: Report = {
        id: generateId('rpt'),
        title,
        conversationId,
        includedInsightIds: [...selectedInsightIds],
        insights: included,
        format: reportFormat,
        status: 'draft',
        gaps: reportGaps,
        createdAt: new Date().toISOString(),
        // AI generation starts in 'generating' state
        generationStatus: 'generating',
      };

      setReports((prev) => [...prev, report]);

      // Persist to DB (fire-and-forget)
      saveReport(report);

      return report;
    },
    [insights, selectedInsightIds, reportFormat, reportGaps]
  );

  /** Update a report with AI-generated content or error status */
  const updateReportGeneration = useCallback(
    (
      reportId: string,
      status: ReportGenerationStatus,
      content?: ReportContent,
      error?: string
    ) => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                generationStatus: status,
                content: content ?? r.content,
                generationError: error,
                status: status === 'complete' ? 'complete' : r.status,
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      );

      // Persist to DB (fire-and-forget)
      updateReportInDb(reportId, {
        generationStatus: status,
        content,
        generationError: error,
        status: status === 'complete' ? 'complete' : undefined,
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  const dismissGap = useCallback((gapId: string) => {
    setReportGaps((prev) => prev.filter((g) => g.id !== gapId));
  }, []);

  const deleteReportAction = useCallback((id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));

    // Persist to DB (fire-and-forget)
    deleteReportFromDb(id);
  }, []);

  const updateReportTitle = useCallback((reportId: string, newTitle: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              title: newTitle,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );

    // Persist to DB (fire-and-forget)
    updateReportInDb(reportId, {
      title: newTitle,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const getReportByConversationId = useCallback(
    (conversationId: string): Report | undefined => {
      return reports.find((r) => r.conversationId === conversationId);
    },
    [reports]
  );

  const updateReportMetadata = useCallback((reportId: string, updates: Partial<Report>) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );

    // Persist to DB (fire-and-forget)
    updateReportInDb(reportId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as any);
  }, []);

  // ── Context value ──────────────────────────────────────────────
  const value = useMemo<InsightPanelContextValue>(
    () => ({
      view,
      activeConversationId,
      insights,
      isExpanded,
      reports,
      selectedInsightIds,
      reportFormat,
      reportGaps,
      isLoading,
      setView,
      togglePanel,
      setActiveConversationId,
      addInsight,
      removeInsight,
      updateInsight,
      clearInsights,
      setExpanded,
      toggleInsightSelection,
      selectAllInsights,
      deselectAllInsights,
      setReportFormat,
      setReportGaps,
      generateReport,
      updateReportGeneration,
      dismissGap,
      deleteReport: deleteReportAction,
      updateReportTitle,
      getReportByConversationId,
      updateReportMetadata,
    }),
    [
      view,
      activeConversationId,
      insights,
      isExpanded,
      reports,
      selectedInsightIds,
      reportFormat,
      reportGaps,
      isLoading,
      togglePanel,
      setActiveConversationId,
      addInsight,
      removeInsight,
      updateInsight,
      clearInsights,
      toggleInsightSelection,
      selectAllInsights,
      deselectAllInsights,
      generateReport,
      updateReportGeneration,
      dismissGap,
      deleteReportAction,
      updateReportTitle,
      getReportByConversationId,
      updateReportMetadata,
    ]
  );

  return (
    <InsightPanelContext.Provider value={value}>
      {children}
    </InsightPanelContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────
export function useInsightPanel() {
  const ctx = useContext(InsightPanelContext);
  if (!ctx) {
    throw new Error('useInsightPanel must be used within InsightPanelProvider');
  }
  return ctx;
}
