/**
 * followUpGenerator.ts
 *
 * Generates 2-3 contextual follow-up question suggestions after an assistant response.
 * All questions are grounded in real metric data — no hallucination.
 * Pure function, no side effects, no API calls.
 */

import type { MetricDefinition } from '@/types/metric';
import type { ParsedSummary } from '@/utils/streamingParser';

// ── Types ───────────────────────────────────────────────────────────────────

export interface FollowUpQuestion {
  id: string;
  text: string;
  category: 'next-step' | 'action' | 'correlation' | 'drill-down' | 'trend';
}

interface ScoredCandidate extends FollowUpQuestion {
  priority: number;
  metricId?: string; // for deduplication
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find metrics whose names appear in the response text.
 * Uses word-boundary matching to avoid partial matches
 * (e.g. "Revenue" shouldn't match inside "Ticket Revenue").
 * Sorts by name length descending to prefer longer (more specific) matches first.
 */
export function extractMentionedMetrics(
  responseText: string,
  metrics: MetricDefinition[]
): MetricDefinition[] {
  const text = responseText.toLowerCase();
  const matched: MetricDefinition[] = [];

  // Sort by name length descending so "Ticket Revenue" matches before "Revenue"
  const sorted = [...metrics].sort((a, b) => b.name.length - a.name.length);

  for (const metric of sorted) {
    const pattern = new RegExp('\\b' + escapeRegex(metric.name.toLowerCase()) + '\\b');
    if (pattern.test(text)) {
      matched.push(metric);
    }
  }

  return matched;
}

// ── Main Generator ──────────────────────────────────────────────────────────

export function generateFollowUpQuestions(
  responseText: string,
  summary: ParsedSummary | null,
  metrics: MetricDefinition[]
): FollowUpQuestion[] {
  if (!responseText || metrics.length === 0) return [];

  const mentioned = extractMentionedMetrics(responseText, metrics);
  const mentionedIds = new Set(mentioned.map((m) => m.id));
  const candidates: ScoredCandidate[] = [];

  // ── 1. Deep-dive into the most critical mentioned metric (highest priority)
  // We avoid echoing summary.nextSteps because that content may reference
  // AI-recommended actions that weren't actually in the visible response.
  const mostCritical = mentioned.find(
    (m) =>
      m.displayData.status === 'critical' &&
      m.displayData.currentValue !== '---'
  );
  if (mostCritical) {
    const absChange = Math.abs(mostCritical.displayData.changePercent);
    const dir = mostCritical.displayData.changePercent < 0 ? 'dropped' : 'risen';
    candidates.push({
      id: `deep-dive-${mostCritical.id}`,
      text: `Why has ${mostCritical.name} ${dir} ${absChange}% and what's driving this?`,
      category: 'next-step',
      priority: 10,
      metricId: mostCritical.id,
    });
  } else if (mentioned.length > 0) {
    // Fallback: ask about the first mentioned metric's key drivers
    const anchor = mentioned[0];
    candidates.push({
      id: `deep-dive-${anchor.id}`,
      text: `What are the key drivers behind ${anchor.name} this period?`,
      category: 'next-step',
      priority: 10,
      metricId: anchor.id,
    });
  }

  // ── 2. Action questions for critical/warning mentioned metrics ─────────
  for (const metric of mentioned) {
    if (
      (metric.displayData.status === 'critical' || metric.displayData.status === 'warning') &&
      metric.displayData.currentValue !== '---'
    ) {
      const absChange = Math.abs(metric.displayData.changePercent);
      const changeDesc = metric.displayData.changePercent < 0
        ? `down ${absChange}%`
        : `up ${absChange}%`;
      candidates.push({
        id: `action-${metric.id}`,
        text: `What actions can improve ${metric.name}? Currently at ${metric.displayData.currentValue}, ${changeDesc}`,
        category: 'action',
        priority: 8,
        metricId: metric.id,
      });
    }
  }

  // ── 3. Correlation questions (cross-domain) ───────────────────────────
  const mentionedDomains = new Map<string, MetricDefinition>();
  for (const m of mentioned) {
    if (m.domain && !mentionedDomains.has(m.domain)) {
      mentionedDomains.set(m.domain, m);
    }
  }

  if (mentionedDomains.size >= 2) {
    const entries = Array.from(mentionedDomains.values());
    const a = entries[0];
    const b = entries[1];
    const changeDir = a.displayData.changePercent < 0 ? 'decline' : 'increase';
    const absA = Math.abs(a.displayData.changePercent);
    candidates.push({
      id: `corr-${a.id}-${b.id}`,
      text: `Is the ${absA}% ${changeDir} in ${a.name} related to ${b.name} being ${b.displayData.status}?`,
      category: 'correlation',
      priority: 7,
      metricId: a.id,
    });
  } else if (mentioned.length > 0) {
    // Find a critical/warning metric NOT mentioned, from a different domain
    const anchor = mentioned[0];
    const troubleMetric = metrics.find(
      (m) =>
        !mentionedIds.has(m.id) &&
        m.displayData.status !== 'healthy' &&
        m.domain !== anchor.domain &&
        m.displayData.currentValue !== '---'
    );
    if (troubleMetric) {
      const changeDir = anchor.displayData.changePercent < 0 ? 'decline' : 'trend';
      const absTrouble = Math.abs(troubleMetric.displayData.changePercent);
      const troubleDir = troubleMetric.displayData.changePercent < 0 ? 'down' : 'up';
      candidates.push({
        id: `corr-${anchor.id}-${troubleMetric.id}`,
        text: `Could the ${changeDir} in ${anchor.name} be impacted by ${troubleMetric.name}? It's ${troubleMetric.displayData.status}, ${troubleDir} ${absTrouble}%`,
        category: 'correlation',
        priority: 6,
        metricId: troubleMetric.id,
      });
    }
  }

  // ── 4. Drill-down by route ─────────────────────────────────────────────
  for (const metric of mentioned.slice(0, 2)) {
    if (metric.displayData.currentValue !== '---') {
      candidates.push({
        id: `drill-${metric.id}`,
        text: `How does ${metric.name} break down by route this period?`,
        category: 'drill-down',
        priority: 5,
        metricId: metric.id,
      });
    }
  }

  // ── 5. Trend questions (filler) ────────────────────────────────────────
  for (const metric of mentioned.slice(0, 2)) {
    if (metric.displayData.currentValue !== '---') {
      candidates.push({
        id: `trend-${metric.id}`,
        text: `Show me the ${metric.name} trend over the last 6 months`,
        category: 'trend',
        priority: 3,
        metricId: metric.id,
      });
    }
  }

  // ── 6. Sort, deduplicate, select top 3 ────────────────────────────────
  candidates.sort((a, b) => b.priority - a.priority);

  const seenMetricIds = new Set<string>();
  const selected: FollowUpQuestion[] = [];

  for (const candidate of candidates) {
    if (candidate.metricId && seenMetricIds.has(candidate.metricId)) continue;
    if (candidate.metricId) seenMetricIds.add(candidate.metricId);

    selected.push({
      id: candidate.id,
      text: candidate.text,
      category: candidate.category,
    });

    if (selected.length >= 3) break;
  }

  // ── 7. Fallback: if < 2, add unmentioned critical metrics ─────────────
  if (selected.length < 2) {
    const critical = metrics.filter(
      (m) =>
        m.displayData.status === 'critical' &&
        !seenMetricIds.has(m.id) &&
        m.displayData.currentValue !== '---'
    );
    for (const cm of critical) {
      selected.push({
        id: `attention-${cm.id}`,
        text: `${cm.name} is ${cm.displayData.status} at ${cm.displayData.currentValue} — what should we do?`,
        category: 'action',
      });
      seenMetricIds.add(cm.id);
      if (selected.length >= 2) break;
    }
  }

  return selected.slice(0, 3);
}
