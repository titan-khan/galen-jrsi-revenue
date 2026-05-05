/**
 * followUpService.ts
 *
 * Frontend service for AI-powered follow-up question generation.
 * Calls the follow-up-questions Edge Function and returns structured
 * FollowUpQuestion[] compatible with the existing FollowUpChips component.
 *
 * Uses the same auth pattern as metricsAiService.ts.
 * Returns null on any error/timeout — caller should fall back to
 * the deterministic generator.
 */

import { supabase } from '@/integrations/supabase/client';
import type { MetricDefinition } from '@/types/metric';
import type { ParsedSummary } from '@/utils/streamingParser';
import type { FollowUpQuestion } from '@/utils/followUpGenerator';

// ── Types ───────────────────────────────────────────────────────────────────

interface FollowUpRequestBody {
  userQuestion: string;
  assistantResponse: string;
  summary: {
    keyTakeaway: string;
    confidence: string;
    nextSteps?: string;
  } | null;
  mentionedMetrics: {
    id: string;
    name: string;
    domain: string;
    currentValue: string;
    changePercent: number;
    status: string;
  }[];
  allMetricNames: string[];
  dataDomains: string[];
}

interface FollowUpServiceParams {
  userQuestion: string;
  assistantResponse: string;
  summary: ParsedSummary | null;
  mentionedMetrics: MetricDefinition[];
  allMetrics: MetricDefinition[];
}

interface FollowUpServiceOptions {
  timeoutMs?: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

export async function fetchAIFollowUpQuestions(
  params: FollowUpServiceParams,
  options?: FollowUpServiceOptions
): Promise<FollowUpQuestion[] | null> {
  const timeoutMs = options?.timeoutMs ?? 3000;

  try {
    // Context engineering: extract only the fields we need
    const mentionedMetrics = params.mentionedMetrics.map((m) => ({
      id: m.id,
      name: m.name,
      domain: m.domain || '',
      currentValue: m.displayData.currentValue,
      changePercent: m.displayData.changePercent,
      status: m.displayData.status,
    }));

    const allMetricNames = params.allMetrics.map((m) => m.name);
    const dataDomains = [
      ...new Set(params.allMetrics.map((m) => m.domain).filter(Boolean)),
    ];

    const requestBody: FollowUpRequestBody = {
      userQuestion: params.userQuestion,
      assistantResponse: params.assistantResponse,
      summary: params.summary
        ? {
            keyTakeaway: params.summary.keyTakeaway,
            confidence: params.summary.confidence,
            nextSteps: params.summary.nextSteps,
          }
        : null,
      mentionedMetrics,
      allMetricNames,
      dataDomains,
    };

    // Auth: same pattern as metricsAiService.ts
    const { data: sessionData } = await supabase.auth.getSession();
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL ||
      'https://fkxbcqwwvnowojykatac.supabase.co';

    // Race between fetch and timeout
    const fetchPromise = fetch(
      `${supabaseUrl}/functions/v1/follow-up-questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData?.session?.access_token || anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Follow-up AI timeout')), timeoutMs)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        '[followUpAI] Edge Function error:',
        response.status,
        errorBody
      );
      return null;
    }

    const result = await response.json();

    if (
      !result.questions ||
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      console.warn('[followUpAI] Invalid response structure:', result);
      return null;
    }

    // Normalize to FollowUpQuestion type
    const questions: FollowUpQuestion[] = result.questions.map(
      (q: { id?: string; text: string; category?: string }, i: number) => ({
        id: q.id || `ai-followup-${i + 1}`,
        text: q.text,
        category: (q.category as FollowUpQuestion['category']) || 'next-step',
      })
    );

    console.log(
      '[followUpAI] AI follow-up questions received:',
      questions.length
    );
    return questions;
  } catch (error) {
    if (error instanceof Error && error.message === 'Follow-up AI timeout') {
      console.warn('[followUpAI] Request timed out after', timeoutMs, 'ms');
    } else {
      console.error('[followUpAI] Failed to fetch AI follow-up questions:', error);
    }
    return null;
  }
}
