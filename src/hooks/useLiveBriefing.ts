/**
 * useLiveBriefing.ts
 *
 * Shared hook that runs a single web search per query and exposes the result to
 * any number of components in the BriefingDetail page. Result is reused across
 * the Summary, Themes, SourceMix, and Timeline cards.
 *
 * The underlying webSearchService already does request deduplication +
 * localStorage caching, so this hook is just a thin React-state wrapper.
 */

import { useEffect, useState } from "react";
import { fetchWebSearch } from "@/services/webSearchService";
import type { WebSearchResult } from "@/types/webSearch";

export interface UseLiveBriefingState {
  loading: boolean;
  result: WebSearchResult | null;
  error: string | null;
  reload: () => void;
}

export function useLiveBriefing(
  query: string,
  enabled: boolean,
  periodDays: number = 30,
): UseLiveBriefingState {
  const [result, setResult] = useState<WebSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled || !query.trim()) {
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWebSearch(query, { focus: "all", periodDays }, (fresh) => {
      if (cancelled) return;
      setResult(fresh);
    })
      .then((res) => {
        if (cancelled) return;
        if (res) setResult(res);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Pencarian live gagal.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, enabled, periodDays, reloadKey]);

  return {
    loading,
    result,
    error,
    reload: () => setReloadKey((k) => k + 1),
  };
}
