/**
 * insightAiService.ts
 *
 * Frontend service for AI-powered insight classification and report
 * completeness analysis.
 *
 * Two exports:
 *  - `classifyInsight`            -- synchronous, local heuristic classification
 *  - `analyzeReportCompleteness`  -- async local analysis (structured for future
 *                                    Edge Function swap)
 *
 * Follows the same service-file conventions as followUpService.ts.
 */

import type { InsightItem, InsightType, ReportGap } from '@/types/insight';

// ── Exported types ──────────────────────────────────────────────────────────

export interface InsightClassification {
  type: InsightType;
  title: string;
  description: string;
}

export interface CompletenessAnalysis {
  /** Overall completeness confidence score (0-100). */
  score: number;
  /** Human-readable summary of the analysis. */
  summary: string;
  /** Identified gaps with suggested follow-up questions. */
  gaps: ReportGap[];
  /** Convenience flag: true when score >= 70. */
  isComplete: boolean;
}

// ── Internal helpers ────────────────────────────────────────────────────────

/** Auto-incrementing gap ID generator scoped to the module lifetime. */
let _id = 0;
const gapId = () => `gap_${Date.now()}_${++_id}`;

/** Keyword sets used for type classification heuristics. */
const CHART_KEYWORDS = ['chart', 'graph', 'visualization', 'plot', 'histogram', 'bar chart', 'line chart', 'pie chart'];
const ACTION_KEYWORDS = ['recommend', 'should', 'action', 'consider', 'suggest', 'implement', 'optimize'];

/** Matches fenced code blocks with a chart-related language tag. */
const CHART_BLOCK_RE = /```(?:chart|mermaid|vega|json\s*\n\s*\{[^}]*"mark")/i;

/**
 * Extract the first bold fragment from markdown text.
 * Supports both `**bold**` and `__bold__` syntax.
 */
function extractBoldTitle(content: string): string | null {
  const match = content.match(/\*\*(.+?)\*\*/) || content.match(/__(.+?)__/);
  return match ? match[1].trim() : null;
}

/**
 * Derive a title from the first meaningful sentence of the content,
 * truncated to a maximum of `maxLen` characters at a word boundary.
 */
function extractSentenceTitle(content: string, maxLen = 80): string {
  // Strip markdown formatting artifacts
  const cleaned = content
    .replace(/[#*_`>~\-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // inline links
    .trim();

  // Take the first sentence (or up to first newline)
  const firstSentence = cleaned.split(/[.\n]/)[0]?.trim() ?? cleaned;

  if (firstSentence.length <= maxLen) return firstSentence;

  // Truncate at the last word boundary within maxLen
  const truncated = firstSentence.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

/**
 * Produce a short plain-text description by stripping markdown and trimming
 * to `maxLen` characters.
 */
function extractDescription(content: string, maxLen = 150): string {
  const cleaned = content
    .replace(/```[\s\S]*?```/g, '')   // fenced code blocks
    .replace(/`[^`]+`/g, '')          // inline code
    .replace(/[#*_~>]/g, '')          // markdown syntax chars
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // inline links
    .replace(/\n+/g, ' ')            // collapse newlines
    .replace(/\s{2,}/g, ' ')         // collapse whitespace
    .trim();

  if (cleaned.length <= maxLen) return cleaned;

  const truncated = cleaned.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

/**
 * Lowercased content search helper.
 * Returns true if ANY keyword in `words` appears in `text`.
 */
function containsAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify a message response into an insight type using local keyword
 * heuristics. No network call is made.
 *
 * Classification priority:
 *  1. `chart`       -- content contains chart code blocks or chart-related keywords
 *  2. `action`      -- content contains actionable language
 *  3. `key-insight` -- default fallback
 *
 * @param content - The raw markdown content of the assistant message.
 * @returns An {@link InsightClassification} with the detected type, a
 *          derived title, and a short description.
 *
 * @example
 * ```ts
 * const cls = classifyInsight("**Revenue is up 12%** driven by Q4 campaigns.");
 * // { type: 'key-insight', title: 'Revenue is up 12%', description: '...' }
 * ```
 */
export function classifyInsight(content: string): InsightClassification {
  // 1. Determine type
  let type: InsightType = 'key-insight';

  if (CHART_BLOCK_RE.test(content) || containsAny(content, CHART_KEYWORDS)) {
    type = 'chart';
  } else if (containsAny(content, ACTION_KEYWORDS)) {
    type = 'action';
  }

  // 2. Extract title — prefer bold text, fall back to first sentence
  const title = extractBoldTitle(content) || extractSentenceTitle(content);

  // 3. Extract description
  const description = extractDescription(content);

  return { type, title, description };
}

/**
 * Analyze whether a collection of insights (and the underlying conversation)
 * constitutes a complete report, or whether there are gaps that should be
 * addressed with additional questions.
 *
 * Currently implemented as a **local heuristic** analysis with no network
 * call. The function signature is async so it can be transparently swapped
 * for an Edge Function call (e.g. `analyze-report-completeness`) in the
 * future without changing call-sites.
 *
 * Scoring rubric (max 100):
 * | Category                   | Points |
 * |----------------------------|--------|
 * | Has key-insight(s)         |     20 |
 * | Has action(s)              |     20 |
 * | Has chart(s)               |     15 |
 * | Conversation depth (>= 4)  |     15 |
 * | Topic breadth (3+ topics)  |     15 |
 * | No unexplored-area signals |     15 |
 *
 * @param insights             - The current set of collected insights.
 * @param conversationMessages - Full conversation history (role + content).
 * @returns A {@link CompletenessAnalysis} with score, gaps, and summary.
 *
 * @example
 * ```ts
 * const analysis = await analyzeReportCompleteness(insights, messages);
 * if (!analysis.isComplete) {
 *   console.log('Gaps:', analysis.gaps);
 * }
 * ```
 */
export async function analyzeReportCompleteness(
  insights: InsightItem[],
  conversationMessages: { role: string; content: string }[]
): Promise<CompletenessAnalysis> {
  const gaps: ReportGap[] = [];
  let score = 0;

  // ── 1. Insight type coverage (max 55 pts) ─────────────────────────────

  const hasKeyInsight = insights.some((i) => i.type === 'key-insight');
  const hasAction = insights.some((i) => i.type === 'action');
  const hasChart = insights.some((i) => i.type === 'chart');

  if (hasKeyInsight) {
    score += 20;
  } else {
    gaps.push({
      id: gapId(),
      description: 'No key insights have been identified yet.',
      suggestedQuestion:
        'What are the most important takeaways from this data?',
    });
  }

  if (hasAction) {
    score += 20;
  } else {
    gaps.push({
      id: gapId(),
      description: 'No actionable recommendations have been generated.',
      suggestedQuestion:
        'Based on these findings, what actions should we take?',
    });
  }

  if (hasChart) {
    score += 15;
  } else {
    gaps.push({
      id: gapId(),
      description: 'No visual charts or graphs have been included.',
      suggestedQuestion:
        'Can you visualize the key trends in a chart?',
    });
  }

  // ── 2. Conversation depth (max 15 pts) ────────────────────────────────

  const userMessages = conversationMessages.filter((m) => m.role === 'user');
  const assistantMessages = conversationMessages.filter(
    (m) => m.role === 'assistant'
  );
  const totalExchanges = Math.min(userMessages.length, assistantMessages.length);

  if (totalExchanges >= 4) {
    score += 15;
  } else if (totalExchanges >= 2) {
    score += 8;
    gaps.push({
      id: gapId(),
      description:
        'The conversation is relatively shallow with limited back-and-forth.',
      suggestedQuestion:
        'Are there any other aspects of this topic we should explore?',
    });
  } else {
    gaps.push({
      id: gapId(),
      description:
        'Very few exchanges have occurred; deeper exploration is needed.',
      suggestedQuestion:
        'Can you dig deeper into the underlying causes of these trends?',
    });
  }

  // ── 3. Topic breadth (max 15 pts) ─────────────────────────────────────

  /**
   * Rough topic-breadth estimation: count distinct "meaningful" user
   * questions by checking how many user messages start a new conceptual
   * direction (heuristic: more than 3 unique leading words across
   * user messages indicates breadth).
   */
  const uniqueTopicStarters = new Set(
    userMessages.map((m) => {
      const words = m.content.trim().toLowerCase().split(/\s+/);
      // Use up to the first 4 meaningful words as a fingerprint
      return words
        .filter((w) => w.length > 3)
        .slice(0, 4)
        .join(' ');
    })
  );

  if (uniqueTopicStarters.size >= 3) {
    score += 15;
  } else if (uniqueTopicStarters.size === 2) {
    score += 8;
    gaps.push({
      id: gapId(),
      description:
        'Only a couple of distinct topics have been explored.',
      suggestedQuestion:
        'What other factors or dimensions should we consider in this analysis?',
    });
  } else {
    gaps.push({
      id: gapId(),
      description:
        'The conversation has focused on a single topic area.',
      suggestedQuestion:
        'Are there related areas we should investigate to get a fuller picture?',
    });
  }

  // ── 4. Unexplored-area signals (max 15 pts) ──────────────────────────

  const UNEXPLORED_KEYWORDS = [
    'but',
    'however',
    'also',
    'another factor',
    'on the other hand',
    'additionally',
    'worth noting',
    'keep in mind',
    'haven\'t addressed',
    'not yet',
    'further analysis',
  ];

  const assistantText = assistantMessages.map((m) => m.content).join(' ');
  const unexploredHits = UNEXPLORED_KEYWORDS.filter((kw) =>
    assistantText.toLowerCase().includes(kw)
  );

  if (unexploredHits.length === 0) {
    score += 15;
  } else if (unexploredHits.length <= 2) {
    score += 8;
    gaps.push({
      id: gapId(),
      description:
        'The assistant hinted at areas that were not fully explored.',
      suggestedQuestion:
        'You mentioned additional factors earlier -- can you elaborate on those?',
    });
  } else {
    gaps.push({
      id: gapId(),
      description:
        'Multiple unexplored areas were mentioned but not followed up on.',
      suggestedQuestion:
        'There seem to be several unexplored angles. Can you walk through each of them?',
    });
  }

  // ── 5. Assemble result ────────────────────────────────────────────────

  // Clamp score to 0-100
  const clampedScore = Math.max(0, Math.min(100, score));
  const isComplete = clampedScore >= 70;

  const summary = isComplete
    ? `Report looks comprehensive (score: ${clampedScore}/100). ` +
      `It includes ${insights.length} insight(s) across ${totalExchanges} exchange(s).`
    : `Report is incomplete (score: ${clampedScore}/100) with ${gaps.length} gap(s) identified. ` +
      `Consider exploring the suggested questions to strengthen coverage.`;

  return {
    score: clampedScore,
    summary,
    gaps,
    isComplete,
  };
}
