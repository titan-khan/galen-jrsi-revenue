/**
 * webSearchService.ts
 *
 * Frontend service for the `web-search` Edge Function (OpenAI gpt-4o-mini-search-preview
 * via OpenRouter). Returns structured citations for the Riset live evidence panel.
 *
 * Mirrors the metricsAiService pattern: stale-while-revalidate cache in localStorage,
 * request deduplication, and supabase session-token auth.
 */

import { supabase } from "@/integrations/supabase/client";
import { requestDeduplicator } from "@/lib/requestDeduplicator";
import { cacheKeys, serializeKey } from "@/lib/cacheKeys";
import type {
  WebSearchFocus,
  WebSearchOptions,
  WebSearchResult,
} from "@/types/webSearch";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — web results stale faster than analytical summaries
const CACHE_PREFIX = "web-search-v1-";

interface CachedEntry {
  data: WebSearchResult;
  timestamp: number;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildCacheKey(query: string, focus: WebSearchFocus, periodDays: number): string {
  return `${CACHE_PREFIX}${focus}-${periodDays}d-${normalizeQuery(query)}`;
}

export function getFromCache(
  query: string,
  focus: WebSearchFocus,
  periodDays: number,
): { data: WebSearchResult; isStale: boolean } | null {
  try {
    const raw = localStorage.getItem(buildCacheKey(query, focus, periodDays));
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as CachedEntry;
    return { data, isStale: Date.now() - timestamp > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

function setCache(
  query: string,
  focus: WebSearchFocus,
  periodDays: number,
  data: WebSearchResult,
): void {
  try {
    localStorage.setItem(
      buildCacheKey(query, focus, periodDays),
      JSON.stringify({ data, timestamp: Date.now() } as CachedEntry),
    );
  } catch {
    // localStorage full / disabled — silent
  }
}

export function clearWebSearchCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Fetch web search results. Stale-while-revalidate:
 * - Fresh cache → return immediately, no network.
 * - Stale cache → return stale data, refresh in background (onFresh fires when ready).
 * - No cache → await the network call.
 */
export async function fetchWebSearch(
  query: string,
  opts: WebSearchOptions = {},
  onFresh?: (result: WebSearchResult) => void,
): Promise<WebSearchResult | null> {
  if (!query || query.trim().length === 0) return null;
  const focus = opts.focus ?? "all";
  const periodDays = opts.periodDays ?? 30;

  const cached = getFromCache(query, focus, periodDays);
  if (cached && !cached.isStale) {
    return cached.data;
  }
  if (cached && cached.isStale) {
    // background refresh
    fetchFromAPI(query, opts).then((fresh) => {
      if (fresh) {
        setCache(query, focus, periodDays, fresh);
        onFresh?.(fresh);
      }
    });
    return cached.data;
  }

  const result = await fetchFromAPI(query, opts);
  if (result) setCache(query, focus, periodDays, result);
  return result;
}

async function fetchFromAPI(
  query: string,
  opts: WebSearchOptions,
): Promise<WebSearchResult | null> {
  const focus: WebSearchFocus = opts.focus ?? "all";
  const periodDays = opts.periodDays ?? 30;
  const dedupeKey = serializeKey(
    cacheKeys.webSearch.query(normalizeQuery(query), `${focus}-${periodDays}d`),
  );

  return requestDeduplicator.dedupe(dedupeKey, async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const supabaseUrl =
        import.meta.env.VITE_SUPABASE_URL || "https://babpwnkoapgzvnuftyid.supabase.co";

      const response = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData?.session?.access_token || anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          query: query.trim(),
          focus,
          maxResults: opts.maxResults,
          locale: opts.locale,
          periodDays,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("[webSearch] Edge function error", response.status, errBody);
        // Return a minimal "error" result so the UI can render a non-crashing state.
        let parsedErr: string | undefined;
        try {
          parsedErr = JSON.parse(errBody)?.error;
        } catch {
          parsedErr = errBody;
        }
        throw new Error(parsedErr || `HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        summary: string;
        citations: WebSearchResult["citations"];
        themes?: WebSearchResult["themes"];
        sentiment?: WebSearchResult["sentiment"];
        regions?: WebSearchResult["regions"];
        topics?: WebSearchResult["topics"];
        pola?: WebSearchResult["pola"];
        periodDays?: number;
        model: string;
        latencyMs?: number;
        usage?: WebSearchResult["usage"];
      };

      const result: WebSearchResult = {
        query: query.trim(),
        focus,
        periodDays: payload.periodDays ?? periodDays,
        summary: payload.summary ?? "",
        citations: payload.citations ?? [],
        themes: payload.themes ?? [],
        sentiment: payload.sentiment ?? null,
        regions: payload.regions ?? [],
        topics: payload.topics ?? [],
        // Ensure each Pola has `recommendations: []` even if the payload is from an
        // older deployment that didn't populate it — keeps the FE renderer safe.
        pola: (payload.pola ?? []).map((p) => ({
          ...p,
          recommendations: p.recommendations ?? [],
        })),
        model: payload.model ?? "unknown",
        fetchedAt: new Date().toISOString(),
        latencyMs: payload.latencyMs,
        usage: payload.usage,
      };

      console.log(
        `[webSearch] ok · ${result.citations.length} citations · ` +
          `${result.latencyMs ?? "?"}ms · model=${result.model}`,
      );
      return result;
    } catch (error) {
      console.error("[webSearch] Failed:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  });
}
