// =============================================================================
// REPORT GENERATION SERVICE — Calls the generate-report edge function
// =============================================================================

import type { InsightItem, ReportFormat, ReportContent } from '@/types/insight';

interface ReportGenerationParams {
  insights: InsightItem[];
  conversationMessages: { role: string; content: string }[];
  context?: Record<string, unknown>;
  format: ReportFormat;
  title: string;
}

/**
 * Calls the generate-report Supabase edge function to produce
 * an AI-generated structured report from insights, conversation,
 * and database data.
 *
 * Returns the ReportContent JSON (sections, bottom line, next steps, etc.)
 */
interface GenerationProgress {
  onProgress?: (message: string, percent: number) => void;
  onCancel?: () => void;
}

/**
 * Calculate dynamic timeout based on number of insights
 * More insights = longer timeout needed
 */
function calculateTimeout(insightCount: number): number {
  // Base timeout: 60s
  // Add 10s per insight (max 180s total)
  const baseTimeout = 60_000;
  const perInsightTimeout = 10_000;
  const maxTimeout = 180_000; // 3 minutes max
  
  return Math.min(baseTimeout + (insightCount * perInsightTimeout), maxTimeout);
}

export async function generateRichReport(
  params: ReportGenerationParams,
  progress?: GenerationProgress
): Promise<ReportContent> {
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    'https://your-project.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const controller = new AbortController();
  const timeout = calculateTimeout(params.insights.length);
  
  // Progress tracking
  let progressInterval: NodeJS.Timeout | null = null;
  let elapsedTime = 0;
  
  if (progress?.onProgress) {
    progress.onProgress('Initializing report generation...', 0);
    
    progressInterval = setInterval(() => {
      elapsedTime += 1000;
      const percent = Math.min((elapsedTime / timeout) * 90, 85); // Cap at 85% until complete
      
      if (elapsedTime < 10000) {
        progress.onProgress?.('Analyzing insights...', percent);
      } else if (elapsedTime < 20000) {
        progress.onProgress?.('Querying database context...', percent);
      } else if (elapsedTime < 40000) {
        progress.onProgress?.('Generating report sections...', percent);
      } else {
        progress.onProgress?.('Finalizing report...', percent);
      }
    }, 1000);
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
    if (progressInterval) clearInterval(progressInterval);
  }, timeout);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          insights: params.insights.map((i) => ({
            id: i.id,
            type: i.type,
            title: i.title,
            description: i.description,
            sourceMessageId: i.sourceMessageId,
          })),
          conversationMessages: params.conversationMessages,
          context: params.context,
          format: params.format,
          title: params.title,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string }).error ||
          `Report generation failed (${response.status})`
      );
    }

    const content: ReportContent = await response.json();

    // Validate minimum structure
    if (!content.sections || !Array.isArray(content.sections)) {
      throw new Error('Invalid report content: missing sections array');
    }

    if (progress?.onProgress) {
      progress.onProgress('Report generated successfully!', 100);
    }

    return content;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        `Report generation timed out after ${Math.round(timeout / 1000)}s. Try reducing the number of insights (currently ${params.insights.length}) or simplify the report format.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (progressInterval) clearInterval(progressInterval);
  }
}

/**
 * Retry report generation with exponential backoff
 */
export async function generateRichReportWithRetry(
  params: ReportGenerationParams,
  progress?: GenerationProgress,
  maxRetries = 2
): Promise<ReportContent> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && progress?.onProgress) {
        progress.onProgress(`Retrying... (Attempt ${attempt + 1}/${maxRetries + 1})`, 0);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      
      return await generateRichReport(params, progress);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's not a timeout error
      if (!(error instanceof Error && error.message.includes('timed out'))) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Report generation failed after retries');
}
