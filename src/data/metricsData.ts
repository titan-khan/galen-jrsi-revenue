import type { MetricDefinition } from "@/types/metric";

// =============================================================================
// JRSI Metrics Data — 31 metrics across 7 domains
// Active dataset: JRSI Road Safety (Supabase project: bpctzhvgmeypnpwftltz)
// =============================================================================

import { jrsiMetricsData } from './jrsiMetricsData';

export const metricsData: MetricDefinition[] = jrsiMetricsData;

// ─── HELPERS ─────────────────────────────────────────────────────────

export const getFollowingMetrics = () => metricsData.filter((m) => m.isFollowing);

export const getAllMetrics = () => metricsData;

export const getMetricById = (id: string) => metricsData.find((m) => m.id === id);

export const getMetricsByDomain = (domain: string) =>
  metricsData.filter((m) => m.domain === domain);

export const getDomainCategories = () =>
  Array.from(new Set(metricsData.map((m) => m.domain).filter(Boolean))) as string[];

export const searchMetrics = (query: string) => {
  const q = query.toLowerCase();
  return metricsData.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      (m.domain && m.domain.toLowerCase().includes(q))
  );
};
