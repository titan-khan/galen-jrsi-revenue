// =============================================================================
// Period & Segment Utilities
// Converts UI filter slugs into date ranges and route IDs for DB queries
// =============================================================================

export interface DateRange {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;
  label: string; // e.g. "Jan 2026"
}

/**
 * Parse a period slug like "jan-2026" into a month date range
 */
export function parsePeriod(slug: string): DateRange {
  const MONTH_MAP: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const parts = slug.split('-');
  const monthAbbr = parts[0].toLowerCase();
  const year = parseInt(parts[1], 10);
  const monthIndex = MONTH_MAP[monthAbbr] ?? 0;

  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0); // last day of month

  const label = `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)} ${year}`;

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    label,
  };
}

/**
 * Get the comparison period dates based on comparison type
 */
export function getComparisonPeriod(
  currentPeriod: DateRange,
  comparisonType: 'previous' | 'yoy' | 'none'
): DateRange | null {
  if (comparisonType === 'none') return null;

  const start = new Date(currentPeriod.startDate);

  if (comparisonType === 'previous') {
    // Previous month
    const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
    return {
      startDate: formatDate(prevStart),
      endDate: formatDate(prevEnd),
      label: formatMonthLabel(prevStart),
    };
  }

  // YoY — same month, previous year
  const yoyStart = new Date(start.getFullYear() - 1, start.getMonth(), 1);
  const yoyEnd = new Date(start.getFullYear() - 1, start.getMonth() + 1, 0);
  return {
    startDate: formatDate(yoyStart),
    endDate: formatDate(yoyEnd),
    label: formatMonthLabel(yoyStart),
  };
}

/**
 * Get N monthly date ranges for sparkline data, ending at the given period
 */
export function getSparklineMonths(endPeriodSlug: string, count: number = 12): DateRange[] {
  const endPeriod = parsePeriod(endPeriodSlug);
  const endDate = new Date(endPeriod.startDate);
  const months: DateRange[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const monthStart = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 0);
    months.push({
      startDate: formatDate(monthStart),
      endDate: formatDate(monthEnd),
      label: formatShortMonth(monthStart),
    });
  }

  return months;
}

/**
 * Map segment filter value to route_id for DB queries
 * Returns null for "all" (no route filter)
 */
export function mapSegmentToRouteId(segment: string): string | null {
  const SEGMENT_MAP: Record<string, string> = {
    'R001': 'R001',
    'R002': 'R002',
    'R003': 'R003',
    'R004': 'R004',
    'R005': 'R005',
  };
  if (segment === 'all') return null;
  return SEGMENT_MAP[segment] || null;
}

/**
 * Get the month string in the format used by v_monthly_nps (YYYY-MM)
 */
export function toNpsMonthFormat(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get the first day of month string (YYYY-MM-01) used by most gold views
 */
export function toMonthStart(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Get a human-readable comparison label from period filters
 * e.g. "vs Dec 2025" or "vs Jan 2025 (YoY)"
 */
export function getComparisonLabel(
  periodSlug: string,
  comparison: string
): string {
  const currentPeriod = parsePeriod(periodSlug);
  const compPeriod = getComparisonPeriod(currentPeriod, comparison as 'previous' | 'yoy' | 'none');
  if (!compPeriod) return '';
  const suffix = comparison === 'yoy' ? ' (YoY)' : '';
  return `vs ${compPeriod.label}${suffix}`;
}

// ─── Internal Helpers ─────────────────────────────────────────────────

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMonthLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortMonth(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()];
}
