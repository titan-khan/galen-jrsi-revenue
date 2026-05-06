import type { MetricDefinition } from "@/types/metric";

// =============================================================================
// Active dataset: PKB pilot (Jasa Raharja Kalteng — Supabase project
// babpwnkoapgzvnuftyid).
//
// JRSI legacy metrics (kecelakaan/santunan/TRL/etc.) are HIDDEN by default
// for the PKB pilot. Set VITE_ENABLE_JRSI_LEGACY=true in .env.local to
// re-include them (e.g. for the JRSI use case or for migrating an old
// specialist). The flag stays read at module-load time — change requires
// dev-server restart.
// =============================================================================

import { jrsiMetricsData } from './jrsiMetricsData';
import { pkbMetricsData } from './pkbMetricsData';

const ENABLE_JRSI_LEGACY =
  String(import.meta.env.VITE_ENABLE_JRSI_LEGACY || '').toLowerCase() === 'true';

export const metricsData: MetricDefinition[] = ENABLE_JRSI_LEGACY
  ? [...pkbMetricsData, ...jrsiMetricsData]
  : pkbMetricsData;

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
