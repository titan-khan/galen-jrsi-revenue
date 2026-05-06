import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { metricsData as initialMetrics } from "@/data/metricsData";
import type { PeriodFilter } from "@/services/logistiqMetricService";
import type { MetricDefinition, MetricDomain, AISummaryData, AISuggestionItem, MetricCertification } from "@/types/metric";
import { cacheKeys } from "@/lib/cacheKeys";
import { ContextErrorBoundary } from "@/components/ErrorBoundaries";
import { fetchMetricCertifications } from "@/services/metricCertificationService";

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

  // Local state for metrics — JRSI metrics come pre-populated with displayData
  const [metrics, setMetrics] = useState<MetricDefinition[]>(
    initialMetrics.map(m => ({ ...m, displayData: { ...m.displayData } }))
  );
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Period filters (kept for interface compat, not actively used for JRSI yet)
  const [periodFilters, setPeriodFilters] = useState<PeriodFilter>({
    period: 'jan-2026',
    segment: 'all',
    comparison: 'previous',
  });

  // Static AI summary — PKB pilot snapshot. Replaced via metrics-ai edge
  // function on production; this is the fallback if the live call fails.
  const [aiSummary] = useState<AISummaryData>({
    agentName: "Galen PKB Pilot Agent",
    timestamp: new Date().toISOString(),
    paragraph: "Status kepatuhan PKB Kalimantan Tengah Mei 2026: 32,1% kendaraan (~137.186) masuk segmen Tidak Patuh Kronis dengan rata-rata tunggakan 1.517 hari (~4,2 tahun) — jauh di atas target framework Piramida Kepatuhan Pajak. Estimasi PKB tertunggak segmen kronis Rp 36,70 miliar. Realisasi PKB bulan Mei Rp 8,95 miliar, turun 3,8% vs April dan di bawah skenario Konservatif. Cakupan nomor handphone segmen kronis 71% — 29% kendaraan butuh saluran offline. Dari 9 program SADAR, baru 5 yang aktif berjalan.",
    boldParts: ["32,1%", "137.186", "1.517 hari", "Rp 36,70 miliar", "Rp 8,95 miliar", "3,8%", "skenario Konservatif", "71%", "5 program"],
    positiveChanges: [
      "5 dari 9 program SADAR sudah aktif berjalan vs awal pilot",
      "Cakupan nomor handphone segmen Patuh Aktif & Baru Lewat Jatuh Tempo 100%",
      "Sertifikasi metrik Gold naik ke 46% (27 dari 58 metrik)",
    ],
    negativeChanges: [
      "Tidak Patuh Kronis 32,1% — 82% di atas threshold kritis 20%",
      "Realisasi PKB Mei turun 3,8% vs 1 bulan lalu — di bawah skenario Konservatif",
      "Cakupan handphone segmen kronis hanya 71% — 29% butuh saluran offline",
      "4 program SADAR (termasuk Amnesti Kronis & Pembersihan Hantu) masih draft",
    ],
    topRisers: [
      { metricId: "M-PKB-K01", name: "Jumlah kendaraan Tidak Patuh Kronis", changePercent: 0.5 },
      { metricId: "M-PKB-R02", name: "Total tunggakan pokok PKB", changePercent: 0.9 },
      { metricId: "M-PKB-K02", name: "Durasi tunggakan rata-rata", changePercent: 1.1 },
    ],
    needsAttention: [
      { metricId: "M-PKB-K01", name: "Jumlah kendaraan Tidak Patuh Kronis", changePercent: 0.5 },
      { metricId: "M-PKB-R01", name: "Realisasi PKB bulanan", changePercent: -3.8 },
      { metricId: "M-PKB-T01", name: "Cakupan nomor handphone segmen kronis", changePercent: -2.7 },
    ],
  });
  const [aiSuggestions] = useState<AISuggestionItem[]>([
    {
      id: "sug-pkb-1",
      metricId: "M-PKB-K01",
      metricName: "Jumlah kendaraan Tidak Patuh Kronis",
      domain: "Compliance",
      confidence: 92,
      value: "137.186",
      changePercent: 0.5,
      why: "32,1% populasi Tidak Patuh Kronis jauh di atas target framework Piramida Kepatuhan Pajak. Beban historis Rp 36,70 miliar butuh program amnesti penuh denda 90 hari + enforcement gelombang pertama untuk memutus pertumbuhan.",
      relatedMetricPath: ["M-PKB-K02", "M-PKB-R02"],
      accentType: "warning",
    },
    {
      id: "sug-pkb-2",
      metricId: "M-PKB-R01",
      metricName: "Realisasi PKB bulanan",
      domain: "Revenue",
      confidence: 88,
      value: "Rp 8,95 miliar",
      changePercent: -3.8,
      why: "Realisasi Mei turun 3,8% vs April — di bawah skenario Konservatif. Gap fokus di Kotawaringin Timur (-7%) dan Kapuas (-5%) — perlu intervensi treatment terstruktur per kabupaten.",
      relatedMetricPath: ["M-PKB-R02", "M-PKB-T01"],
      accentType: "warning",
    },
    {
      id: "sug-pkb-3",
      metricId: "M-PKB-T01",
      metricName: "Cakupan nomor handphone segmen kronis",
      domain: "Treatment",
      confidence: 85,
      value: "71%",
      changePercent: -2.7,
      why: "29% kendaraan kronis (~40k) tidak terjangkau via WhatsApp. Koordinasi Kelurahan/RT-RW + SAMSAT Keliling jadi kunci, terutama di Hinterland.",
      relatedMetricPath: ["M-PKB-T02"],
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
        const map = new Map<string, MetricCertification>();
        for (const row of rows) {
          map.set(row.metricId, row);
        }
        setCertifications(map);
      })
      .catch((err) => {
        console.error("[MetricsContext] Failed to load certifications:", err);
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
