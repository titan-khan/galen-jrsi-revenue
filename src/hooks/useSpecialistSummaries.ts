// =============================================================================
// useSpecialistSummaries — Batch-fetches lightweight summary data for the list
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  getBatchSpecialistSummaries,
  type SpecialistSummary,
} from '@/services/specialistRunService';

export function useSpecialistSummaries(specialistIds: string[]) {
  const [summaries, setSummaries] = useState<Record<string, SpecialistSummary>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (specialistIds.length === 0) return;

    try {
      setIsLoading(true);
      const data = await getBatchSpecialistSummaries(specialistIds);
      setSummaries(data);
    } catch (err) {
      console.error('[useSpecialistSummaries] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [specialistIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { summaries, isLoading, refetch: fetch };
}
