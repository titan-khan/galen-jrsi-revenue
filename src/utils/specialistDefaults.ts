// =============================================================================
// SPECIALIST DEFAULTS — Shared utilities for specialist creation
// Used by both CreateSpecialistDialog (quick-create) and HireSpecialist (wizard)
// =============================================================================

import type { BusinessView, MetricConfig, MonitoringRule } from '@/types/specialist';
import type { MetricDefinition } from '@/types/metric';

// ─── Business View → Domain Mapping ──────────────────────────────────────

export const BUSINESS_VIEW_TO_DOMAIN: Record<BusinessView, string> = {
  revenue: 'commercial',
  operations: 'supply-chain',
  'customer-experience': 'customer',
  'cost-optimization': 'finance',
  'risk-compliance': 'supply-chain',
  'fleet-assets': 'supply-chain',
};

// ─── Metric Matching ─────────────────────────────────────────────────────

/**
 * Match suggested metric names (from AI / galenAction) against the system
 * metric catalog. Three-tier matching: exact name → word-overlap → custom.
 * Deduplicates results so no metric appears twice.
 */
export function matchSuggestedMetrics(
  suggestedNames: string[],
  allSystemMetrics: MetricDefinition[],
): MetricConfig[] {
  const seen = new Set<string>();          // track IDs already matched
  const results: MetricConfig[] = [];

  for (const sugName of suggestedNames) {
    const sugLower = sugName.toLowerCase();

    // Skip exact duplicate suggestions
    if (seen.has(sugLower)) continue;

    // Tier 1: Exact name match (case-insensitive)
    const exact = allSystemMetrics.find(
      (m) => m.name.toLowerCase() === sugLower,
    );
    if (exact && !seen.has(exact.id)) {
      seen.add(exact.id);
      seen.add(sugLower);
      results.push({ id: exact.id, name: exact.name });
      continue;
    }

    // Tier 2: Word-overlap scoring (at least 2 shared keywords)
    const sugWords = sugLower.split(/\s+/).filter((w) => w.length > 2);
    let bestMatch: MetricDefinition | null = null;
    let bestOverlap = 0;
    for (const m of allSystemMetrics) {
      if (seen.has(m.id)) continue;
      const mWords = m.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const overlap = sugWords.filter((w) => mWords.some((mw) => mw.includes(w) || w.includes(mw))).length;
      if (overlap >= 2 && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = m;
      }
    }
    if (bestMatch) {
      seen.add(bestMatch.id);
      seen.add(sugLower);
      results.push({ id: bestMatch.id, name: bestMatch.name });
      continue;
    }

    // Tier 3: Custom metric fallback
    seen.add(sugLower);
    results.push({
      id: `custom-${sugLower.replace(/\s+/g, '-')}-${Date.now()}`,
      name: sugName,
      isCustom: true,
    });
  }

  return results;
}

// ─── Auto-Generate Monitoring Rules ──────────────────────────────────────

/**
 * Auto-generate monitoring rules for a set of metrics based on their current
 * status and trend data. Used when creating a specialist without going through
 * the full Rules wizard step.
 */
export function autoGenerateRulesFromMetrics(
  metrics: MetricConfig[],
  allSystemMetrics: MetricDefinition[],
): MonitoringRule[] {
  return metrics
    .map((mc, index) => {
      const sys = allSystemMetrics.find((sm) => sm.id === mc.id);
      if (!sys) return null;

      // Generate a sensible rule based on the metric
      const isPercent =
        sys.displayData.currentValue.includes('%') ||
        sys.name.toLowerCase().includes('rate');
      const unit = isPercent ? '%' : 'units';

      const status = sys.displayData.status;
      const changePercent = sys.displayData.changePercent;

      // Generate AI reason based on metric state
      let reason = '';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';
      let condition = 'changes by';
      let threshold = isPercent ? 5 : 10;

      if (status === 'critical') {
        severity = 'critical';
        condition = changePercent < 0 ? 'drops below' : 'exceeds';
        threshold = isPercent ? 10 : 20;
        reason = `${mc.name} is currently critical. Early detection of further degradation is essential to prevent operational impact.`;
      } else if (status === 'warning') {
        severity = 'high';
        condition = changePercent < 0 ? 'drops below' : 'exceeds';
        threshold = isPercent ? 8 : 15;
        reason = `${mc.name} shows warning signs. Monitoring threshold changes helps catch issues before they become critical.`;
      } else if (changePercent < -5) {
        severity = 'high';
        condition = 'decreases by';
        threshold = isPercent ? 5 : 10;
        reason = `${mc.name} has declined recently (${changePercent}%). Alert on continued decline to enable quick intervention.`;
      } else if (changePercent > 5) {
        severity = 'medium';
        condition = 'increases by';
        threshold = isPercent ? 10 : 15;
        reason = `${mc.name} is trending upward. Monitor for unusual spikes that may indicate anomalies or opportunities.`;
      } else {
        severity = index === 0 ? 'high' : 'medium';
        threshold = isPercent ? 5 : 10;
        reason = `${mc.name} is a key metric. Setting a baseline alert ensures you're notified of significant changes that require attention.`;
      }

      return {
        id: `auto-${mc.id}-${Date.now()}`,
        name: `${mc.name} Alert`,
        whenCondition: condition,
        whenValue: threshold,
        whenUnit: unit,
        forScope: 'All segments',
        severity,
        enabled: true,
        reason,
      };
    })
    .filter(Boolean) as MonitoringRule[];
}
