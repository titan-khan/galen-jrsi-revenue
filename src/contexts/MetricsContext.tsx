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

  // Static AI summary for JRSI
  const [aiSummary] = useState<AISummaryData>({
    agentName: "JRSI Safety Agent",
    timestamp: new Date().toISOString(),
    paragraph: "Dalam periode Oktober 2025 – Januari 2026, tercatat 317 kejadian kecelakaan di Kalimantan Tengah dengan 100 korban meninggal dunia dan 399 korban luka-luka. Fatalitas rate mencapai 20% — 1 dari 5 korban meninggal. November menjadi bulan paling kritis dengan 108 kejadian dan 44 MD. Kota Palangka Raya menyumbang 29% dari total kejadian. Sepeda motor mendominasi 66.7% kendaraan terlibat, dengan Honda Beat sebagai merk terbanyak. Total santunan Jasa Raharja tersalurkan sebesar Rp 8.54 milyar.",
    boldParts: ["317 kejadian", "100 korban meninggal", "20%", "November", "108 kejadian", "Palangka Raya", "66.7%", "Rp 8.54 milyar"],
    positiveChanges: [
      "Data quality 100% — semua required fields populated",
      "GPS validity 100% — siap untuk risk mapping",
      "Zero duplicate records terdeteksi",
    ],
    negativeChanges: [
      "Fatalitas rate 20% — severity sangat tinggi",
      "November spike: 44 MD dalam 1 bulan",
      "Cause detection coverage hanya 23.3%",
      "Tabrak Lari rate 7.6% — potensi fraud signal",
    ],
    topRisers: [
      { metricId: "M-D1-02", name: "Total Korban MD", changePercent: 0 },
      { metricId: "M-FIN-03", name: "Total Santunan", changePercent: 0 },
      { metricId: "M-D5-03", name: "% Sepeda Motor", changePercent: 0 },
    ],
    needsAttention: [
      { metricId: "M-D1-04", name: "Fatalitas Rate", changePercent: 20 },
      { metricId: "M-D1-05", name: "Tabrak Lari Rate", changePercent: 7.6 },
      { metricId: "M-4M-02", name: "Cause Detection Coverage", changePercent: -76.7 },
    ],
  });
  const [aiSuggestions] = useState<AISuggestionItem[]>([
    {
      id: "sug-1",
      metricId: "M-D1-04",
      metricName: "Fatalitas Rate",
      domain: "Accident Overview",
      confidence: 92,
      value: "20.0%",
      changePercent: 0,
      why: "Fatalitas rate 20% jauh di atas rata-rata nasional. Tabrakan Depan-Depan paling fatal — fokus intervensi di ruas jalan dengan geometri lurus dan kecepatan tinggi.",
      relatedMetricPath: ["M-D1-02", "M-D1-09"],
      accentType: "warning",
    },
    {
      id: "sug-2",
      metricId: "M-D5-03",
      metricName: "% Sepeda Motor",
      domain: "Vehicle",
      confidence: 88,
      value: "66.7%",
      changePercent: 0,
      why: "2 dari 3 kendaraan terlibat adalah sepeda motor. Honda Beat dan Vario mendominasi — program safety riding perlu ditargetkan ke pengguna motor matic.",
      relatedMetricPath: ["M-D5-04", "M-D5-01"],
      accentType: "warning",
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
