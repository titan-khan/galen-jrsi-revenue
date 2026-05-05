/**
 * metricsAiService.ts
 *
 * Frontend service for the metrics-ai Edge Function.
 * Fetches AI-generated summary, suggestions, and per-metric insights.
 * Uses localStorage with stale-while-revalidate caching:
 *   - Shows cached data immediately on load (even if stale)
 *   - Refreshes in background when cache is older than TTL
 *   - Persists across browser sessions (survives tab close / 1h+ breaks)
 */

import { supabase } from "@/integrations/supabase/client";
import type { AISummaryData, AISuggestionItem, MetricDefinition } from "@/types/metric";
import { requestDeduplicator } from "@/lib/requestDeduplicator";
import { cacheKeys, serializeKey } from "@/lib/cacheKeys";

// ── Types ───────────────────────────────────────────────────────────────────

interface MetricSnapshot {
  id: string;
  name: string;
  domain: string;
  metricType?: string;
  direction?: string;
  currentValue: string;
  changePercent: number;
  changeAbsolute: string;
  status: string;
  isFollowing: boolean;
  parentMetricId?: string | null;
}

export interface MetricsAIResult {
  summary: AISummaryData;
  suggestions: AISuggestionItem[];
  insights: Record<string, { text: string; boldParts: string[] }>;
}

// ── Cache (localStorage — persists across sessions) ──────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — fresh threshold
const CACHE_PREFIX = 'metrics-ai-v2-';

function getCacheKey(period: string, segment: string): string {
  return `${CACHE_PREFIX}${period}-${segment}`;
}

interface CachedEntry {
  data: MetricsAIResult;
  timestamp: number;
}

/**
 * Get cached AI result from localStorage.
 * Returns { data, isStale } where isStale means cache is older than TTL.
 */
export function getFromCache(period: string, segment: string): { data: MetricsAIResult; isStale: boolean } | null {
  try {
    const key = getCacheKey(period, segment);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached) as CachedEntry;
    const isStale = Date.now() - timestamp > CACHE_TTL_MS;

    return { data, isStale };
  } catch {
    return null;
  }
}

function setCache(period: string, segment: string, data: MetricsAIResult): void {
  try {
    const key = getCacheKey(period, segment);
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() } as CachedEntry));
  } catch {
    // localStorage might be full; silently ignore
  }
}

// ── Snapshot Builder ────────────────────────────────────────────────────────

function buildSnapshot(metrics: MetricDefinition[]): MetricSnapshot[] {
  return metrics.map((m) => ({
    id: m.id,
    name: m.name,
    domain: m.domain || 'Operational',
    metricType: m.metricType,
    direction: m.direction,
    currentValue: m.displayData.currentValue,
    changePercent: m.displayData.changePercent,
    changeAbsolute: m.displayData.changeAbsolute,
    status: m.displayData.status,
    isFollowing: m.isFollowing,
    parentMetricId: m.parentMetricId,
  }));
}

// ── Main Service ────────────────────────────────────────────────────────────

/**
 * Fetch AI analysis. Uses stale-while-revalidate:
 * - If fresh cache exists (< 1h), return it immediately and skip API call.
 * - If stale cache exists (> 1h), return it immediately AND fetch fresh data
 *   in background (caller gets stale data first, then onFresh callback fires).
 * - If no cache, fetch from API.
 */
export async function fetchMetricsAI(
  period: string,
  segment: string,
  metrics: MetricDefinition[],
  onFresh?: (result: MetricsAIResult) => void
): Promise<MetricsAIResult | null> {
  // Check cache first
  const cached = getFromCache(period, segment);

  if (cached && !cached.isStale) {
    // Fresh cache — return immediately, no API call
    console.log("[metricsAI] Returning fresh cached result");
    return cached.data;
  }

  if (cached && cached.isStale) {
    // Stale cache — return stale data immediately, then refresh in background
    console.log("[metricsAI] Returning stale cache, refreshing in background");

    // Fire background refresh (don't await)
    fetchFromAPI(period, segment, metrics).then((freshResult) => {
      if (freshResult) {
        setCache(period, segment, freshResult);
        onFresh?.(freshResult);
      }
    });

    return cached.data;
  }

  // No cache at all — fetch from API
  const result = await fetchFromAPI(period, segment, metrics);
  if (result) {
    setCache(period, segment, result);
  }
  return result;
}

/**
 * Direct API call to the metrics-ai Edge Function (no caching).
 */
async function fetchFromAPI(
  period: string,
  segment: string,
  metrics: MetricDefinition[]
): Promise<MetricsAIResult | null> {
  const key = serializeKey(cacheKeys.metrics.display(period, segment));
  
  return requestDeduplicator.dedupe(key, async () => {
    const followedMetricIds = metrics
      .filter((m) => m.isFollowing)
      .map((m) => m.id);

    const metricsSnapshot = buildSnapshot(metrics);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ||
        "https://oxotsdusfrtzjsugkszu.supabase.co";

      const response = await fetch(`${supabaseUrl}/functions/v1/metrics-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData?.session?.access_token || anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          period,
          segment,
          followedMetricIds,
          metricsSnapshot,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[metricsAI] Edge Function error:", response.status, errorBody);
        return null;
      }

      const result: MetricsAIResult = await response.json();
      // LLM-supplied timestamps are unreliable (often hallucinated). Stamp the
      // response at receive time so the staleness indicator stays honest.
      if (result.summary) {
        result.summary.timestamp = new Date().toISOString();
      }
      console.log("[metricsAI] AI analysis received successfully");
      return result;
    } catch (error) {
      console.error("[metricsAI] Failed to fetch AI analysis:", error);
      return null;
    }
  });
}
