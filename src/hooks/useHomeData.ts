// =============================================================================
// useHomeData — Fetches aggregated data across all specialists for the Home page
// Replaces hardcoded TRANSPORTX_INSIGHTS, TRANSPORTX_RECOMMENDATIONS, etc.
// Now uses SWR pattern for instant page loads with cached data
// =============================================================================

import { useMemo } from 'react';
import type { SpecialistInsight, SpecialistRecommendation, Specialist, SpecialistDomain } from '@/types/specialist';
import {
  getSpecialistInsights,
  getExecutiveSummary,
  getSpecialistRecommendations,
} from '@/services/specialistRunService';
import { useSWR } from './useSWR';
import { cacheKeys } from '@/lib/cacheKeys';
import { startNetworkRequest } from '@/lib/performanceMonitor';

export interface HomeInsight extends SpecialistInsight {
  specialistName: string;
  specialistHandle: string;
  specialistDomain: SpecialistDomain;
}

export interface HomeRecommendation extends SpecialistRecommendation {
  specialistName: string;
  specialistHandle?: string;
  specialistDomain?: SpecialistDomain;
}

export interface HomeData {
  allInsights: HomeInsight[];
  pendingRecommendations: HomeRecommendation[];
  valueAtStake: number;
  criticalCount: number;
}

export interface UseHomeDataResult extends HomeData {
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches and aggregates home page data from all specialists
 * Uses SWR pattern for instant page loads with cached data
 * 
 * **Requirements Validated:**
 * - Requirement 2.1: Display cached data within 100ms
 * - Requirement 2.2: Background refresh without loading spinners
 * - Requirement 2.3: Smooth data updates without disrupting interaction
 * - Requirement 2.4: Measure and log page load times
 * - Requirement 15.3: Track average network request latency
 */
async function fetchHomeData(specialists: Specialist[]): Promise<HomeData> {
  const endNetworkRequest = startNetworkRequest();

  if (specialists.length === 0) {
    endNetworkRequest();
    return {
      allInsights: [],
      pendingRecommendations: [],
      valueAtStake: 0,
      criticalCount: 0,
    };
  }

  // Fetch insights, executive summaries, and recommendations for all specialists in parallel
  const results = await Promise.all(
    specialists.map(async (specialist) => {
      try {
        const [insights, summary, recommendations] = await Promise.all([
          getSpecialistInsights(specialist.id),
          getExecutiveSummary(specialist.id),
          getSpecialistRecommendations(specialist.id),
        ]);

        return {
          specialist,
          insights,
          summary,
          recommendations,
        };
      } catch {
        // If one specialist fails, don't break the whole page
        return {
          specialist,
          insights: [],
          summary: null,
          recommendations: [],
        };
      }
    })
  );

  // Aggregate insights — take top insight per specialist, sorted by severity
  const insights: HomeInsight[] = [];
  let totalValueAtStake = 0;
  let criticals = 0;

  for (const result of results) {
    // Add top insights (max 2 per specialist)
    for (const insight of result.insights.slice(0, 2)) {
      insights.push({
        ...insight,
        specialistName: result.specialist.name,
        specialistHandle: result.specialist.handle,
        specialistDomain: result.specialist.domain,
      });
    }

    // Aggregate executive summary data
    if (result.summary) {
      totalValueAtStake += result.summary.valueAtStake;
      if (result.summary.severity === 'critical') {
        criticals++;
      }
    }
  }

  // Sort insights by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  // Aggregate pending recommendations
  const pending: HomeRecommendation[] = [];
  for (const result of results) {
    for (const rec of result.recommendations.filter((r) => r.status === 'proposed')) {
      pending.push({
        ...rec,
        specialistName: result.specialist.name,
        specialistHandle: result.specialist.handle,
        specialistDomain: result.specialist.domain,
      });
    }
  }

  // Sort pending by created date (newest first)
  pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Record network request completion (Requirement 15.3)
  endNetworkRequest();

  return {
    allInsights: insights.slice(0, 8),
    pendingRecommendations: pending.slice(0, 6),
    valueAtStake: totalValueAtStake,
    criticalCount: criticals,
  };
}

export function useHomeData(specialists: Specialist[]): UseHomeDataResult {
  // Create a stable query key that includes specialist IDs
  const queryKey = useMemo(() => {
    const specialistIds = specialists.map(s => s.id).sort().join(',');
    return [...cacheKeys.home.data(), specialistIds];
  }, [specialists]);

  // Use SWR pattern for instant page loads with cached data
  const { data, isLoading, isValidating, error, mutate } = useSWR<HomeData>({
    queryKey,
    queryFn: () => fetchHomeData(specialists),
    staleTime: 2 * 60 * 1000, // 2 minutes (home data changes frequently)
    enabled: specialists.length > 0,
  });

  // Return default values when no data is available
  const defaultData: HomeData = {
    allInsights: [],
    pendingRecommendations: [],
    valueAtStake: 0,
    criticalCount: 0,
  };

  return {
    ...(data || defaultData),
    isLoading,
    isValidating,
    error: error?.message || null,
    refetch: mutate,
  };
}
