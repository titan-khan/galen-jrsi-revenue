import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { metricsData as fallbackMetrics } from "@/data/metricsData";
import { pkbDisplayData } from "@/data/pkbDisplayData";
import type { PeriodFilter } from "@/services/logistiqMetricService";
import type { MetricDefinition, MetricDomain, AISummaryData, AISuggestionItem, MetricCertification, MetricType, ValueSentiment } from "@/types/metric";
import { cacheKeys } from "@/lib/cacheKeys";
import { ContextErrorBoundary } from "@/components/ErrorBoundaries";
import { fetchMetricCertifications } from "@/services/metricCertificationService";
import { fetchMetricsAI, getFromCache as getMetricsAiFromCache } from "@/services/metricsAiService";
import { derivedPkbMetrics, derivedPkbCertifications } from "@/data/derivedPkbMetrics";

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

/**
 * Compute period-over-period change rate from the metric's own sparkline series.
 * Card displays "+X% vs Y" — angka ini diambil dari first vs last value sparkline
 * (52 minggu = 1 tahun). Direction-aware status: down_is_good metrics have inverted
 * status logic (penurunan = healthy).
 */
function deriveChangeFromSpark(
  spark: Array<{ month: string; value: number }> | undefined,
  direction: "up_is_good" | "down_is_good" | "neutral" | undefined,
  fallbackValue: string
): { changePercent: number; changeAbsolute: string; status: "healthy" | "warning" | "critical" } | null {
  if (!spark || spark.length < 2) return null;
  const first = spark[0]?.value ?? 0;
  const last = spark[spark.length - 1]?.value ?? 0;
  if (first === 0) return null;
  const delta = last - first;
  const pct = (delta / first) * 100;
  // Format absolute change: preserve unit hint by using fallbackValue's prefix where possible
  const absStr = formatChangeAbsolute(delta, fallbackValue);
  const isFavorable =
    direction === "down_is_good" ? pct < 0 : direction === "up_is_good" ? pct > 0 : Math.abs(pct) < 2;
  const absPct = Math.abs(pct);
  let status: "healthy" | "warning" | "critical" = "healthy";
  if (!isFavorable) {
    if (absPct > 10) status = "critical";
    else if (absPct > 2) status = "warning";
  }
  return { changePercent: Number(pct.toFixed(2)), changeAbsolute: absStr, status };
}

/** Format absolute delta dengan unit hint dari currentValue ("Rp …", "%", count). */
function formatChangeAbsolute(delta: number, currentValue: string): string {
  const sign = delta >= 0 ? "+" : "";
  if (currentValue.startsWith("Rp")) {
    if (Math.abs(delta) >= 1e9) return `${sign}Rp ${(delta / 1e9).toFixed(2).replace(".", ",")} miliar`;
    if (Math.abs(delta) >= 1e6) return `${sign}Rp ${(delta / 1e6).toFixed(1).replace(".", ",")} juta`;
    return `${sign}Rp ${Math.round(delta).toLocaleString("id-ID")}`;
  }
  if (currentValue.includes("%")) {
    return `${sign}${delta.toFixed(2)}pp`;
  }
  if (Math.abs(delta) >= 1000) return `${sign}${Math.round(delta).toLocaleString("id-ID")}`;
  return `${sign}${delta.toFixed(1)}`;
}

/**
 * Apply derived change rate to a metric in-place if the spark has 2+ points.
 * Preserves explicit non-zero changePercent (some metrics intentionally show 0).
 */
function applyDerivedChangeRate(m: MetricDefinition): MetricDefinition {
  const spark = m.displayData?.sparklineData;
  if (!spark || spark.length < 2) return m;
  const computed = deriveChangeFromSpark(spark, m.direction, m.displayData.currentValue);
  if (!computed) return m;
  return {
    ...m,
    displayData: {
      ...m.displayData,
      changePercent: computed.changePercent,
      changeAbsolute: computed.changeAbsolute,
      // Keep critical status from data (e.g. tunggakan 74.77%) but upgrade if rate-derived is worse
      status: severityRank(computed.status) > severityRank(m.displayData.status) ? computed.status : m.displayData.status,
    },
  };
}

function severityRank(s: "healthy" | "warning" | "critical"): number {
  return s === "critical" ? 2 : s === "warning" ? 1 : 0;
}

// Override metric names from cert table when they leak internal segment codes
// (H1/K1/M2/etc). Eksekutif tidak mengerti kode — rename ke natural language.
// Cert table di Supabase tidak diubah; ini purely UI-layer rename.
const METRIC_NAME_OVERRIDES: Record<string, string> = {
  "M-TREAT-003": "Jumlah Target Quick Win (Baru Lewat Tempo + Mulai Mengabaikan, dengan HP valid)",
  "M-COMPL-005": "Persentase Status Patuh Aktif (Snapshot)",
};

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
    // Catalog: cert is source of truth (with UI-layer name override for clarity)
    id: cert.metricId,
    name: METRIC_NAME_OVERRIDES[cert.metricId] ?? cert.metricName,
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
  // While the cert fetch is in flight we render an empty list (skeleton handles UX); the
  // JRSI legacy fallback is only used when VITE_ENABLE_JRSI_LEGACY=true so the PKB pilot
  // catalog isn't polluted by 31 road-safety metrics.
  const enableJrsiLegacy = import.meta.env.VITE_ENABLE_JRSI_LEGACY === "true";
  const [metrics, setMetrics] = useState<MetricDefinition[]>(
    enableJrsiLegacy
      ? fallbackMetrics.map((m) => ({ ...m, displayData: { ...m.displayData } }))
      : []
  );
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Period filters — used only when JRSI legacy is enabled. PKB pilot uses a static
  // snapshot (PeriodSelectorRow renders a snapshot badge in that mode).
  const [periodFilters, setPeriodFilters] = useState<PeriodFilter>({
    period: 'jan-2026',
    segment: 'all',
    comparison: 'previous',
  });

  // PKB Palangka Raya pilot — snapshot 2026-05-05.
  // Used as the initial render + safe fallback when the live LLM call is disabled
  // or the edge function fails. When VITE_ENABLE_AI_SUMMARY_LIVE=true, an effect
  // below replaces this with the metrics-ai edge function output.
  const STATIC_PKB_SUMMARY: AISummaryData = {
    agentName: "Galen PKB Pilot Agent",
    timestamp: new Date().toISOString(),
    paragraph: "Snapshot 2026-05-05 mencatat 427,977 kendaraan terdaftar di Palangka Raya. Tingkat tunggakan 74.77% — di atas ekspektasi framework Piramida Kepatuhan Pajak (60-65%), didorong segmen Tidak Patuh Kronis 32.05% atau 137,186 kendaraan. Hanya 25.23% berstatus Patuh Aktif, di bawah ekspektasi 40%. Total potensi PKB Rp 164.24 triliun; estimasi konservatif kampanye Rp 23.54 miliar (14% potensi). 66,696 kendaraan quick-win (Baru Lewat Tempo + Mulai Mengabaikan, dengan HP valid) siap untuk gelombang pertama via WhatsApp. 73.46% kendaraan reachable via kanal digital.",
    boldParts: ["427,977 kendaraan", "74.77%", "60-65%", "Tidak Patuh Kronis", "32.05%", "137,186 kendaraan", "Patuh Aktif", "25.23%", "40%", "Rp 164.24 triliun", "Rp 23.54 miliar", "66,696", "73.46%"],
    positiveChanges: [
      "Classifier coverage 100% — 0 kendaraan unclassified",
      "Total potensi pendapatan kampanye konservatif Rp 23.54 miliar (1 gelombang)",
      "66,696 quick-win targets siap dengan kanal digital",
    ],
    negativeChanges: [
      "Tingkat tunggakan 74.77% — di atas target framework (60-65%)",
      "Tidak Patuh Kronis + Kendaraan Hantu dominan 50.35% (215,510 kendaraan) — beban historis besar",
      "Kepatuhan Patuh Aktif hanya 25.23% — di bawah ekspektasi framework 40%",
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
  };
  const [aiSummary, setAiSummary] = useState<AISummaryData>(STATIC_PKB_SUMMARY);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSuggestionsState, setAiSuggestionsState] = useState<AISuggestionItem[] | null>(null);
  const [aiSuggestionsFallback] = useState<AISuggestionItem[]>([
    {
      id: "sug-1",
      metricId: "M-COMPL-002",
      metricName: "Persentase Kendaraan Menunggak (>0 hari)",
      domain: "Compliance",
      confidence: 95,
      value: "74.77%",
      changePercent: 0,
      why: "Tingkat tunggakan 74.77% melewati ekspektasi framework Piramida Kepatuhan Pajak (60-65%). Segmen Tidak Patuh Kronis (32.05%) menyumbang beban terbesar — denda historis 2-4× pokok pajak. Pertimbangkan regulasi amnesti penuh denda 90 hari diikuti razia pasca-amnesti.",
      relatedMetricPath: ["M-COMPL-001", "M-COMPL-004"],
      accentType: "warning",
    },
    {
      id: "sug-2",
      metricId: "M-TREAT-003",
      metricName: "Jumlah Target Quick Win (Baru Lewat Tempo + Mulai Mengabaikan, HP valid)",
      domain: "Treatment",
      confidence: 90,
      value: "66,696",
      changePercent: 0,
      why: "66,696 kendaraan di Baru Lewat Tempo + Mulai Mengabaikan dengan HP valid + estimasi PKB > median = ROI tertinggi gelombang pertama. Denda masih kecil, kanal digital (WhatsApp 73.46% reachable) tersedia. Eksekusi 3-pesan campaign dalam 6 minggu.",
      relatedMetricPath: ["M-TREAT-001", "M-COMPL-001"],
      accentType: "info",
    },
  ]);
  const aiSuggestions = aiSuggestionsState ?? aiSuggestionsFallback;

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
        // Build cert lookup — cert table rows + derived metric synthetic certs.
        const certMap = new Map<string, MetricCertification>();
        for (const row of rows) {
          certMap.set(row.metricId, row);
        }
        for (const dCert of derivedPkbCertifications) {
          certMap.set(dCert.metricId, dCert);
        }
        setCertifications(certMap);

        // Rebuild the metrics list: cert-driven catalog (PKB pilot v1) +
        // derived BCG-lens metrics (P1/P2 audit additions). Apply spark-derived
        // change rate so the "+X%" badge on each card matches sparkline trend.
        const built = rows.map(buildMetricFromCert);
        const all = [...built, ...derivedPkbMetrics].map(applyDerivedChangeRate);
        if (all.length > 0) setMetrics(all);
      })
      .catch((err) => {
        console.error("[MetricsContext] Failed to load certifications:", err);
        // Cert fetch failed — still surface derived metrics so the BCG lens works.
        setMetrics(derivedPkbMetrics.map(applyDerivedChangeRate));
        const certMap = new Map<string, MetricCertification>();
        for (const dCert of derivedPkbCertifications) certMap.set(dCert.metricId, dCert);
        setCertifications(certMap);
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

  // Live AI summary via metrics-ai edge function (gated by VITE_ENABLE_AI_SUMMARY_LIVE).
  // Static PKB summary stays as instant-render + fallback. Edge function output replaces it
  // when fetched. Cache (stale-while-revalidate) lives in metricsAiService.
  const aiLiveEnabled = import.meta.env.VITE_ENABLE_AI_SUMMARY_LIVE === "true";
  const hasFetchedAiRef = useRef(false);

  useEffect(() => {
    if (!aiLiveEnabled) return;
    if (isCertLoading) return; // wait for real cert-driven metrics catalog
    if (metrics.length === 0) return;
    if (hasFetchedAiRef.current) return;
    hasFetchedAiRef.current = true;

    let cancelled = false;
    const period = periodFilters.period;
    const segment = periodFilters.segment;

    // Show stale cached result instantly if available
    const cached = getMetricsAiFromCache(period, segment);
    if (cached) {
      setAiSummary(cached.data.summary);
      setAiSuggestionsState(cached.data.suggestions);
    }

    setIsAiLoading(true);
    fetchMetricsAI(period, segment, metrics, (fresh) => {
      if (cancelled) return;
      setAiSummary(fresh.summary);
      setAiSuggestionsState(fresh.suggestions);
    })
      .then((result) => {
        if (cancelled || !result) return;
        setAiSummary(result.summary);
        setAiSuggestionsState(result.suggestions);
      })
      .catch((err) => {
        console.error("[MetricsContext] metrics-ai fetch failed; keeping static fallback", err);
      })
      .finally(() => {
        if (!cancelled) setIsAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [aiLiveEnabled, isCertLoading, metrics, periodFilters.period, periodFilters.segment]);

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
