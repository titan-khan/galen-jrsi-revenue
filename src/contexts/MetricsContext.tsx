import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { metricsData as fallbackMetrics } from "@/data/metricsData";
import { pkbDisplayData } from "@/data/pkbDisplayData";
import type { PeriodFilter } from "@/services/logistiqMetricService";
import type { MetricDefinition, MetricDomain, AISummaryData, AISuggestionItem, MetricCertification, MetricType, ValueSentiment } from "@/types/metric";
import { cacheKeys } from "@/lib/cacheKeys";
import { ContextErrorBoundary } from "@/components/ErrorBoundaries";
import { fetchMetricCertifications } from "@/services/metricCertificationService";

// Map cert business_domain (snake_case) → app MetricDomain (PascalCase / spaced)
const DOMAIN_MAP: Record<string, MetricDomain> = {
  compliance: "Compliance",
  revenue: "Revenue",
  swdkllj: "SWDKLLJ",
  treatment: "Treatment",
  demographic: "Demographic",
  operational: "Operational",
  safety: "Safety",
  claims: "Claims",
  vehicle: "Vehicle",
  risk: "Risk",
  cause: "Cause",
  data_quality: "Data Quality",
  temporal: "Temporal",
  governance: "Governance",
};

const FALLBACK_BY_ID: Record<string, MetricDefinition> = Object.fromEntries(
  fallbackMetrics.map((m) => [m.id, m])
);

/** Build a MetricDefinition from a cert row + lookup display data. */
function buildMetricFromCert(cert: MetricCertification): MetricDefinition {
  const pkb = pkbDisplayData[cert.metricId];
  const fallback = FALLBACK_BY_ID[cert.metricId];

  const displayData = pkb?.displayData ?? fallback?.displayData ?? {
    filterContext: "",
    comparisonLabel: "—",
    currentValue: "—",
    changePercent: 0,
    changeAbsolute: "0",
    status: "healthy" as const,
    sparklineData: [],
    insight: { text: "", boldParts: [] },
  };

  return {
    // Catalog: cert is source of truth
    id: cert.metricId,
    name: cert.metricName,
    description: pkb?.description ?? fallback?.description ?? cert.notes ?? "",
    domain: DOMAIN_MAP[cert.businessDomain] ?? (fallback?.domain as MetricDomain) ?? "Operational",

    // Behavior / UI hints — from displayData lookup
    metricType: (pkb?.metricType ?? fallback?.metricType ?? "observational") as MetricType,
    valueSentiment: (pkb?.valueSentiment ?? fallback?.valueSentiment ?? "up-good") as ValueSentiment,
    direction: pkb?.direction ?? fallback?.direction ?? "neutral",
    isFollowing: pkb?.isFollowing ?? fallback?.isFollowing ?? false,

    // Configuration with sensible defaults — these aren't surfaced in MetricCard
    dataSource: fallback?.dataSource ?? "supabase://meta.metric_certification",
    measure: fallback?.measure ?? cert.metricSlug,
    aggregation: fallback?.aggregation ?? "count",
    sparklineType: fallback?.sparklineType ?? "non-cumulative",
    dateField: fallback?.dateField ?? "created_at",
    timeGranularity: fallback?.timeGranularity ?? "month",
    filters: fallback?.filters ?? [],
    adjustableFilters: fallback?.adjustableFilters ?? [],
    insightTypes: fallback?.insightTypes ?? { trend: false, comparison: false, anomaly: false },
    target: fallback?.target,

    category: fallback?.category ?? cert.businessDomain,
    owner: cert.ownerTeam ?? fallback?.owner ?? "pilot_data_team",
    createdAt: cert.certifiedAt ?? new Date().toISOString(),
    updatedAt: cert.lastValidatedAt ?? new Date().toISOString(),
    parentMetricId: fallback?.parentMetricId ?? null,

    displayData,
  };
}

interface MetricsContextType {
  metrics: MetricDefinition[];
  toggleFollow: (id: string) => void;
  getFollowingMetrics: () => MetricDefinition[];
  updateMetric: (id: string, updates: Partial<MetricDefinition>) => void;
  addMetric: (metric: MetricDefinition) => void;
  addBulkMetrics: (metrics: MetricDefinition[]) => void;
  setFollowingBulk: (ids: string[]) => void;
  getMetricById: (id: string) => MetricDefinition | undefined;
  getMetricsByDomain: (domain: MetricDomain) => MetricDefinition[];
  getDomainCategories: () => MetricDomain[];
  searchMetrics: (query: string) => MetricDefinition[];
  dismissedSuggestions: Set<string>;
  dismissSuggestion: (id: string) => void;
  isLoading: boolean;
  isValidating: boolean;
  refreshData: () => Promise<void>;
  // Period filters — driven by PeriodSelectorRow
  periodFilters: PeriodFilter;
  setPeriodFilters: (filters: PeriodFilter) => void;
  // AI state
  aiSummary: AISummaryData | null;
  aiSuggestions: AISuggestionItem[];
  isAiLoading: boolean;
  // Smart polling state
  pollingInterval: number;
  pollingUnchangedCount: number;
  // Metric certifications (from meta.metric_certification via v_metric_certifications view)
  certifications: Map<string, MetricCertification>;
  getCertForMetric: (metricId: string) => MetricCertification | undefined;
  isCertLoading: boolean;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const MetricsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  // Metrics list is sourced from meta.metric_certification (cert table = source of truth).
  // Until the cert fetch resolves, fall back to the hardcoded JRSI catalog so the UI
  // doesn't flash empty during initial load.
  const [metrics, setMetrics] = useState<MetricDefinition[]>(
    fallbackMetrics.map((m) => ({ ...m, displayData: { ...m.displayData } }))
  );
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Period filters (kept for interface compat, not actively used for JRSI yet)
  const [periodFilters, setPeriodFilters] = useState<PeriodFilter>({
    period: 'jan-2026',
    segment: 'all',
    comparison: 'previous',
  });

  // Static AI summary — PKB Palangka Raya pilot (snapshot 2026-05-05)
  const [aiSummary] = useState<AISummaryData>({
    agentName: "Galen PKB Pilot Agent",
    timestamp: new Date().toISOString(),
    paragraph: "Snapshot 2026-05-05 mencatat 427,977 kendaraan terdaftar di Palangka Raya. Tingkat tunggakan 74.77% — di atas ekspektasi framework v1.4 (60-65%), didorong segmen M2 (Tidak Patuh Kronis) 32.05% atau 137,186 kendaraan. Hanya 25.23% berstatus Patuh Aktif (H1), di bawah ekspektasi 40%. Total potensi PKB Rp 164.24 triliun; estimasi konservatif kampanye Rp 23.54 miliar (14% potensi). 66,696 kendaraan quick-win (K1+O1 + HP) siap untuk gelombang pertama via WhatsApp. 73.46% kendaraan reachable via kanal digital.",
    boldParts: ["427,977 kendaraan", "74.77%", "60-65%", "M2", "32.05%", "137,186 kendaraan", "25.23%", "40%", "Rp 164.24 triliun", "Rp 23.54 miliar", "66,696", "73.46%"],
    positiveChanges: [
      "Classifier coverage 100% — 0 kendaraan unclassified",
      "Total potensi pendapatan kampanye konservatif Rp 23.54 miliar (1 gelombang)",
      "66,696 quick-win targets siap dengan kanal digital",
    ],
    negativeChanges: [
      "Tingkat tunggakan 74.77% — di atas target framework (60-65%)",
      "Segmen M2 + S2 dominan 50.35% (215,510 kendaraan) — beban historis besar",
      "Kepatuhan H1 hanya 25.23% — di bawah ekspektasi framework 40%",
      "26.54% kendaraan tanpa HP — butuh kanal offline (surat / RT-RW)",
    ],
    topRisers: [
      { metricId: "M-REV-001", name: "Total Potensi PKB", changePercent: 0 },
      { metricId: "M-TREAT-003", name: "Jumlah Target Quick Win", changePercent: 0 },
      { metricId: "M-COMPL-001", name: "Distribusi Kendaraan per Segmen Kepatuhan", changePercent: 0 },
    ],
    needsAttention: [
      { metricId: "M-COMPL-002", name: "Persentase Kendaraan Menunggak (>0 hari)", changePercent: 74.77 },
      { metricId: "M-COMPL-005", name: "Persentase Status Patuh Aktif (Snapshot)", changePercent: -36.93 },
      { metricId: "M-COMPL-004", name: "Median Lama Tunggakan (hari)", changePercent: 0 },
    ],
  });
  const [aiSuggestions] = useState<AISuggestionItem[]>([
    {
      id: "sug-1",
      metricId: "M-COMPL-002",
      metricName: "Persentase Kendaraan Menunggak (>0 hari)",
      domain: "Compliance",
      confidence: 95,
      value: "74.77%",
      changePercent: 0,
      why: "Tingkat tunggakan 74.77% melewati ekspektasi framework v1.4 (60-65%). Segmen M2 (32.05%) menyumbang beban terbesar — denda historis 2-4× pokok pajak. Pertimbangkan regulasi amnesti penuh denda 90 hari diikuti razia pasca-amnesti.",
      relatedMetricPath: ["M-COMPL-001", "M-COMPL-004"],
      accentType: "warning",
    },
    {
      id: "sug-2",
      metricId: "M-TREAT-003",
      metricName: "Jumlah Target Quick Win (K1+O1 + HP)",
      domain: "Treatment",
      confidence: 90,
      value: "66,696",
      changePercent: 0,
      why: "66,696 kendaraan di K1+O1 dengan HP valid + estimasi PKB > median = ROI tertinggi gelombang pertama. Denda masih kecil, kanal digital (WhatsApp 73.46% reachable) tersedia. Eksekusi 3-pesan campaign dalam 6 minggu.",
      relatedMetricPath: ["M-TREAT-001", "M-COMPL-001"],
      accentType: "info",
    },
  ]);
  const isAiLoading = false;

  // Static data — no loading, no polling needed
  const isLoading = false;
  const isValidating = false;

  // Local-only mutations (not persisted to DB)
  // These update the local metrics state and work with React Query cache
  const toggleFollow = useCallback((id: string) => {
    setMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFollowing: !m.isFollowing } : m))
    );
  }, []);

  const getFollowingMetrics = useCallback(() => metrics.filter((m) => m.isFollowing), [metrics]);

  const getMetricById = useCallback((id: string) => metrics.find((m) => m.id === id), [metrics]);

  const updateMetric = useCallback((id: string, updates: Partial<MetricDefinition>) => {
    setMetrics((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      )
    );
    
    // Invalidate metrics caches when a metric is updated
    // This ensures any cached metric data is refreshed
    queryClient.invalidateQueries({ queryKey: cacheKeys.metrics.all });
    
    // Also invalidate home data cache as it may depend on metrics
    queryClient.invalidateQueries({ queryKey: cacheKeys.home.all });
  }, [queryClient]);

  const addMetric = useCallback((metric: MetricDefinition) => {
    setMetrics((prev) => {
      if (prev.some((m) => m.id === metric.id)) return prev;
      return [...prev, metric];
    });
    
    // Invalidate metrics caches when a metric is added
    queryClient.invalidateQueries({ queryKey: cacheKeys.metrics.all });
    queryClient.invalidateQueries({ queryKey: cacheKeys.home.all });
  }, [queryClient]);

  const addBulkMetrics = useCallback((newMetrics: MetricDefinition[]) => {
    setMetrics((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const unique = newMetrics.filter((m) => !existingIds.has(m.id));
      return [...prev, ...unique];
    });
  }, []);

  const setFollowingBulk = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setMetrics((prev) =>
      prev.map((m) => (idSet.has(m.id) ? { ...m, isFollowing: true } : m))
    );
  }, []);

  const getMetricsByDomain = useCallback(
    (domain: MetricDomain) => metrics.filter((m) => m.domain === domain),
    [metrics]
  );

  const getDomainCategories = useCallback((): MetricDomain[] => {
    const domains = new Set<MetricDomain>();
    for (const m of metrics) {
      if (m.domain) domains.add(m.domain);
    }
    return Array.from(domains);
  }, [metrics]);

  const searchMetrics = useCallback(
    (query: string) => {
      const q = query.toLowerCase();
      return metrics.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          (m.domain && m.domain.toLowerCase().includes(q))
      );
    },
    [metrics]
  );

  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestions((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const refreshData = useCallback(async () => {
    // Static JRSI data — no cache to invalidate yet
  }, []);

  // Metric certifications loaded once from Supabase v_metric_certifications view
  const [certifications, setCertifications] = useState<Map<string, MetricCertification>>(new Map());
  const [isCertLoading, setIsCertLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    fetchMetricCertifications()
      .then((rows) => {
        if (cancelled) return;
        // Build cert lookup
        const certMap = new Map<string, MetricCertification>();
        for (const row of rows) {
          certMap.set(row.metricId, row);
        }
        setCertifications(certMap);

        // Rebuild the metrics list from cert rows — cert table is now the
        // source of truth for which metrics exist + their catalog metadata.
        // Display data is merged from pkbDisplayData / fallback JRSI map.
        const built = rows.map(buildMetricFromCert);
        if (built.length > 0) setMetrics(built);
      })
      .catch((err) => {
        console.error("[MetricsContext] Failed to load certifications:", err);
        // Keep the fallback hardcoded list rendered.
      })
      .finally(() => {
        if (!cancelled) setIsCertLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getCertForMetric = useCallback(
    (metricId: string) => certifications.get(metricId),
    [certifications]
  );

  return (
    <ContextErrorBoundary
      contextName="Metrics"
      onReset={refreshData}
      fallbackRoute="/"
    >
      <MetricsContext.Provider
        value={{
          metrics,
          toggleFollow,
          getFollowingMetrics,
          updateMetric,
          addMetric,
          addBulkMetrics,
          setFollowingBulk,
          getMetricById,
          getMetricsByDomain,
          getDomainCategories,
          searchMetrics,
          dismissedSuggestions,
          dismissSuggestion,
          isLoading,
          isValidating,
          refreshData,
          periodFilters,
          setPeriodFilters,
          aiSummary,
          aiSuggestions,
          isAiLoading,
          pollingInterval: 0,
          pollingUnchangedCount: 0,
          certifications,
          getCertForMetric,
          isCertLoading,
        }}
      >
        {children}
      </MetricsContext.Provider>
    </ContextErrorBoundary>
  );
};

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error("useMetrics must be used within a MetricsProvider");
  }
  return context;
};
