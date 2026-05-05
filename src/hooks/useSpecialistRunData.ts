// =============================================================================
// useSpecialistRunData — Fetches all live analysis data for a specialist
// Replaces hardcoded data from transportXSpecialists.ts
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpecialistInsight, SpecialistRecommendation, CrossSpecialistSignal } from '@/types/specialist';
import type { AgentRun } from '@/types/agent';
import {
  getLatestFindings,
  getSpecialistInsights,
  getExecutiveSummary,
  getRootCauses,
  getCrossSpecialistSignals,
  getAISummary,
  getSpecialistRecommendations,
  getSpecialistRunHistory,
  runSpecialist,
  type RunFindings,
  type ExecutiveSummaryData,
  type RootCauseItem,
} from '@/services/specialistRunService';
import { supabase } from '@/integrations/supabase/client';

export interface UseSpecialistRunDataResult {
  // Raw findings
  findings: RunFindings | null;

  // Derived sections
  insights: SpecialistInsight[];
  executiveSummary: ExecutiveSummaryData | null;
  recommendations: SpecialistRecommendation[];
  rootCauses: RootCauseItem[];
  correlations: CrossSpecialistSignal[];
  aiSummary: string | null;
  runHistory: AgentRun[];

  // State
  isLoading: boolean;
  isRunning: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;
  triggerRun: (trigger?: 'manual' | 'scheduled') => Promise<void>;
}

export function useSpecialistRunData(
  specialistId: string | undefined,
  initialRunning = false,
): UseSpecialistRunDataResult {
  const [findings, setFindings] = useState<RunFindings | null>(null);
  const [insights, setInsights] = useState<SpecialistInsight[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummaryData | null>(null);
  const [recommendations, setRecommendations] = useState<SpecialistRecommendation[]>([]);
  const [rootCauses, setRootCauses] = useState<RootCauseItem[]>([]);
  const [correlations, setCorrelations] = useState<CrossSpecialistSignal[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<AgentRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(initialRunning);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasRunningRef = useRef(initialRunning);
  // Grace period: when navigated from creation with initialRunning=true,
  // don't let checkRunningStatus() override isRunning to false until
  // the edge function has had time to create the agent_runs row.
  const initialRunningGraceRef = useRef(initialRunning);

  const checkRunningStatus = useCallback(async () => {
    if (!specialistId) return false;

    try {
      const { data } = await supabase
        .from('agent_runs')
        .select('status')
        .eq('agent_id', specialistId)
        .in('status', ['running', 'pending'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data?.status === 'running' || data?.status === 'pending';
    } catch (err) {
      console.error('[useSpecialistRunData] Failed to check running status:', err);
      return false;
    }
  }, [specialistId]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!specialistId) return;

    try {
      // Only show loading skeleton on initial load, not on refetch/poll.
      // "silent" refetches update data in-place without flashing skeletons.
      if (!silent) setIsLoading(true);
      setError(null);

      // Check if there's an ongoing run
      const isCurrentlyRunning = await checkRunningStatus();
      if (isCurrentlyRunning) {
        // DB confirms a run is active — clear grace period, trust DB from now on
        initialRunningGraceRef.current = false;
        setIsRunning(true);
      } else if (initialRunningGraceRef.current) {
        // Grace period: we were told a run was just kicked off but the DB
        // hasn't seen the agent_runs row yet. Keep isRunning=true so the
        // loading banner stays visible until the row appears.
      } else {
        setIsRunning(false);
      }

      // Fetch all data in parallel
      const [
        findingsResult,
        insightsResult,
        summaryResult,
        recommendationsResult,
        rootCausesResult,
        correlationsResult,
        aiSummaryResult,
        historyResult,
      ] = await Promise.all([
        getLatestFindings(specialistId),
        getSpecialistInsights(specialistId),
        getExecutiveSummary(specialistId),
        getSpecialistRecommendations(specialistId),
        getRootCauses(specialistId),
        getCrossSpecialistSignals(specialistId),
        getAISummary(specialistId),
        getSpecialistRunHistory(specialistId, 20),
      ]);

      setFindings(findingsResult);
      setInsights(insightsResult);
      setExecutiveSummary(summaryResult);
      setRecommendations(recommendationsResult);
      setRootCauses(rootCausesResult);
      setCorrelations(correlationsResult);
      setAiSummary(aiSummaryResult);
      setRunHistory(historyResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load specialist data';
      setError(message);
      console.error('[useSpecialistRunData] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [specialistId, checkRunningStatus]);

  const triggerRun = useCallback(async (trigger: 'manual' | 'scheduled' = 'manual') => {
    if (!specialistId) return;

    try {
      setIsRunning(true);
      setError(null);

      const result = await runSpecialist(specialistId, trigger);

      // Update findings immediately with the result
      setFindings(result.findings);

      // Refetch all data to get the full picture (recommendations stored separately, etc.)
      // Silent=true: don't flash loading skeletons — data is already on screen
      await fetchAll(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run specialist';
      setError(message);
      console.error('[useSpecialistRunData] Run error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [specialistId, fetchAll]);

  // Load on mount and when specialistId changes
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Safety timeout: clear the initial-running grace period after 30s
  // so the loading banner doesn't stay forever if the edge function fails silently.
  useEffect(() => {
    if (!initialRunningGraceRef.current) return;
    const timer = setTimeout(() => {
      if (initialRunningGraceRef.current) {
        initialRunningGraceRef.current = false;
        // Re-check status one more time to update isRunning accurately
        checkRunningStatus().then((running) => {
          if (!running) setIsRunning(false);
        });
      }
    }, 30_000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll when running to check for completion
  useEffect(() => {
    // Start polling when isRunning becomes true
    if (isRunning && !pollIntervalRef.current) {
      wasRunningRef.current = true;
      pollIntervalRef.current = setInterval(() => {
        fetchAll(true); // silent — don't flash skeletons on each poll
      }, 3000); // Poll every 3 seconds
    }

    // Stop polling when isRunning becomes false
    if (!isRunning && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isRunning, fetchAll]);

  // Detect when run completes (for external notification)
  useEffect(() => {
    // If we were running and now have new data, the run completed
    if (wasRunningRef.current && !isRunning && (insights.length > 0 || executiveSummary)) {
      wasRunningRef.current = false;
      // Emit a custom event that the detail view can listen to
      window.dispatchEvent(new CustomEvent('specialist-run-complete', {
        detail: { specialistId, hasInsights: insights.length > 0 }
      }));
    }
  }, [isRunning, insights.length, executiveSummary, specialistId]);

  return {
    findings,
    insights,
    executiveSummary,
    recommendations,
    rootCauses,
    correlations,
    aiSummary,
    runHistory,
    isLoading,
    isRunning,
    error,
    refetch: fetchAll,
    triggerRun,
  };
}
