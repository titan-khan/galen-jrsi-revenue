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

/** Format absolute delta dengan unit hint dari currentValue ("Rp …", "%", count).
 *  Konsisten pakai "Rp X,XX miliar" format. Singkatan "pp" diganti "% poin". */
function formatChangeAbsolute(delta: number, currentValue: string): string {
  const sign = delta >= 0 ? "+" : "";
  if (currentValue.startsWith("Rp")) {
    if (Math.abs(delta) >= 1e12) return `${sign}Rp ${(delta / 1e12).toFixed(2).replace(".", ",")} triliun`;
    if (Math.abs(delta) >= 1e9) return `${sign}Rp ${(delta / 1e9).toFixed(2).replace(".", ",")} miliar`;
    if (Math.abs(delta) >= 1e6) return `${sign}Rp ${(delta / 1e6).toFixed(1).replace(".", ",")} juta`;
    return `${sign}Rp ${Math.round(delta).toLocaleString("id-ID")}`;
  }
  if (currentValue.includes("%")) {
    return `${sign}${delta.toFixed(2).replace(".", ",")}% poin`;
  }
  if (Math.abs(delta) >= 1000) return `${sign}${Math.round(delta).toLocaleString("id-ID")}`;
  return `${sign}${delta.toFixed(1).replace(".", ",")}`;
}

/** Reference label untuk rate% — eksekutif harus tahu compare-nya vs apa.
 *  Sparkline 30 hari → rate% = nilai sekarang vs nilai 30 hari lalu. */
const RATE_REFERENCE_LABEL = "vs 1 bulan lalu";

/**
 * Apply derived change rate to a metric. ALL metric cards yang punya sparkline
 * 30-titik akan dapat rate% dihitung otomatis + acuan compare di comparisonLabel.
 *
 * Aturan acuan compare di comparisonLabel:
 * - Jika belum ada (kosong / "—"): set ke RATE_REFERENCE_LABEL
 * - Jika sudah punya frasa pembanding ("vs ...", "Target ...", "Batas ..."):
 *   tambahkan rate reference dengan separator " · " agar audiens tetap tahu
 *   bahwa rate% di card itu compare-nya 1 bulan lalu (bukan target).
 */
function applyDerivedChangeRate(m: MetricDefinition): MetricDefinition {
  const spark = m.displayData?.sparklineData;
  if (!spark || spark.length < 2) return m;
  const computed = deriveChangeFromSpark(spark, m.direction, m.displayData.currentValue);
  if (!computed) return m;

  const existingLabel = (m.displayData.comparisonLabel || "").trim();
  // Already includes the rate reference? Skip to avoid duplication.
  const alreadyHasRateRef = existingLabel.includes(RATE_REFERENCE_LABEL);
  let enrichedLabel: string;
  if (alreadyHasRateRef || existingLabel === "" || existingLabel === "—") {
    enrichedLabel = existingLabel || RATE_REFERENCE_LABEL;
    if (!alreadyHasRateRef && existingLabel === "") enrichedLabel = RATE_REFERENCE_LABEL;
  } else {
    // Selalu append rate reference dengan " · " agar tiap card punya 2 acuan:
    // (1) target/batas yang sudah ada, (2) rate% acuan periode 1 bulan
    enrichedLabel = `${existingLabel} · rate ${RATE_REFERENCE_LABEL}`;
  }

  return {
    ...m,
    displayData: {
      ...m.displayData,
      changePercent: computed.changePercent,
      changeAbsolute: computed.changeAbsolute,
      comparisonLabel: enrichedLabel,
      status: severityRank(computed.status) > severityRank(m.displayData.status) ? computed.status : m.displayData.status,
    },
  };
}

function severityRank(s: "healthy" | "warning" | "critical"): number {
  return s === "critical" ? 2 : s === "warning" ? 1 : 0;
}

// Override metric names from cert table for clarity. Cert table di Supabase
// tidak diubah; ini purely UI-layer rename agar audiens C-level paham.
// Tujuan: hilangkan kode internal, jargon "snapshot/v1.4", dan formula dari title.
const METRIC_NAME_OVERRIDES: Record<string, string> = {
  "M-COMPL-001": "Total Kendaraan",
  "M-COMPL-005": "Persentase Pembayar Tepat Waktu",
  "M-REV-003": "Target Pendapatan Skenario Realistis",
  "M-REV-004": "Target Pendapatan Skenario Optimis",
  "M-TREAT-001": "Persentase Kendaraan dengan Nomor Handphone Valid",
  "M-TREAT-003": "Target Kampanye Gelombang Pertama",
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
    paragraph: "Per 2026-05-05, ada 427.977 kendaraan terdaftar di Palangka Raya. 74,77% di antaranya menunggak — lebih tinggi dari target framework Piramida Kepatuhan Pajak (60-65%). Pendorong utama: kelompok Tidak Patuh Kronis sebesar 32,05% (137.186 kendaraan), sementara Patuh Aktif hanya 25,23% (target 40%). Total potensi PKB Rp 164,24 miliar; perkiraan realistis kampanye gelombang pertama Rp 23,54 miliar (14% dari potensi). 66.696 kendaraan siap dikampanyekan via WhatsApp — kelompok Baru Lewat Tempo & Mulai Mengabaikan yang punya nomor handphone, peluang sukses tertinggi. Secara umum, 73,46% kendaraan bisa dijangkau lewat saluran digital.",
    boldParts: ["427.977 kendaraan", "74,77%", "60-65%", "Tidak Patuh Kronis", "32,05%", "137.186 kendaraan", "Patuh Aktif", "25,23%", "40%", "Rp 164,24 miliar", "Rp 23,54 miliar", "66.696", "73,46%"],
    positiveChanges: [
      "Klasifikasi data 100% lengkap — semua kendaraan sudah terkategori",
      "Perkiraan pendapatan kampanye gelombang pertama Rp 23,54 miliar",
      "66.696 kendaraan siap dikampanyekan lewat WhatsApp",
    ],
    negativeChanges: [
      "Tingkat tunggakan 74,77% — di atas target framework Piramida Kepatuhan Pajak (60-65%)",
      "Tidak Patuh Kronis + Kendaraan Hantu menguasai 50,35% (215.510 kendaraan) — beban historis besar",
      "Patuh Aktif hanya 25,23% — di bawah target framework 40%",
      "26,54% kendaraan tanpa nomor handphone — butuh surat atau kunjungan tim SAMSAT/RT-RW",
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
      why: "Tingkat tunggakan 74,77% melewati target framework Piramida Kepatuhan Pajak (60-65%). Kelompok Tidak Patuh Kronis (32,05%) jadi beban terbesar — denda akumulasi sudah 2-4 kali pokok pajak. Pertimbangkan amnesti penuh denda 90 hari diikuti razia pasca-amnesti, tapi pantau kelompok Patuh Aktif agar tidak ikut menunda.",
      relatedMetricPath: ["M-COMPL-001", "M-COMPL-004"],
      accentType: "warning",
    },
    {
      id: "sug-2",
      metricId: "M-TREAT-003",
      metricName: "Jumlah Target Quick Win (Baru Lewat Tempo + Mulai Mengabaikan, nomor handphone valid)",
      domain: "Treatment",
      confidence: 90,
      value: "66,696",
      changePercent: 0,
      why: "66.696 kendaraan di kelompok Baru Lewat Tempo + Mulai Mengabaikan, punya nomor handphone, dan estimasi PKB di atas rata-rata — paling cepat memberi hasil. Denda masih kecil, bisa dijangkau lewat WhatsApp (73,46% kendaraan terjangkau digital). Rekomendasi: kampanye 3 pesan WhatsApp dalam 6 minggu, batas waktu 90 hari.",
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
