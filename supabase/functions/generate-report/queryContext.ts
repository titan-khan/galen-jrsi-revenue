// =============================================================================
// QUERY CONTEXT RESOLVER — Declarative DB queries from query specs
// Supports adaptive limits: runs lightweight COUNT(*) pre-queries to size
// fetches dynamically based on actual data volume.
// =============================================================================

import type { QueryContextSpec, AdaptiveConfig } from './querySpecs.ts';

interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: string | number | boolean | string[];
}

interface QueryContextInput {
  timeRange?: string;
  metricIds?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// ADAPTIVE DATA DISCOVERY
// Runs COUNT(*) pre-queries in parallel to discover actual data volume,
// then computes smart limits based on cardinality.
// ---------------------------------------------------------------------------

interface DataVolume {
  table: string;
  count: number;
}

/**
 * Discover data volume for tables that use adaptiveConfig.
 * Runs lightweight COUNT(*) queries in parallel with the same filters
 * as the full query (so we count exactly what we'd fetch).
 * Returns within timeoutMs or falls back to empty (use defaults).
 */
async function discoverDataVolume(
  supabaseClient: any,
  specs: QueryContextSpec[],
  inputContext: QueryContextInput,
  timeoutMs = 200,
): Promise<DataVolume[]> {
  // Only count tables that have adaptiveConfig
  const adaptiveSpecs = specs.filter((s) => s.adaptiveConfig);
  if (adaptiveSpecs.length === 0) return [];

  const countPromises = adaptiveSpecs.map(async (spec) => {
    try {
      let query = supabaseClient
        .from(spec.table)
        .select('*', { count: 'exact', head: true });

      // Apply same filters as the full query
      if (spec.filters) {
        for (const filter of spec.filters) {
          const value = substituteVariable(filter.value, inputContext);
          query = applyFilter(query, filter.field, filter.operator as any, value);
        }
      }

      const { count, error } = await query;
      if (error) {
        console.warn(`[adaptive] COUNT failed for ${spec.table}:`, error.message);
        return { table: spec.table, count: -1 }; // -1 = unknown, use default
      }
      return { table: spec.table, count: count ?? -1 };
    } catch {
      return { table: spec.table, count: -1 };
    }
  });

  // Race: all counts vs timeout
  try {
    const result = await Promise.race([
      Promise.all(countPromises),
      new Promise<DataVolume[]>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ]);
    return result;
  } catch {
    console.warn(`[adaptive] Cardinality check timed out after ${timeoutMs}ms, using defaults`);
    return [];
  }
}

/**
 * Compute the adaptive limit for a table based on its cardinality.
 * Decision logic:
 *   count ≤ maxLimit → fetch all (we want the complete picture for aggregation)
 *   count > maxLimit → cap at maxLimit
 *
 * Why fetch all within maxLimit?  Summary stats and monthly aggregations
 * need the *full* dataset to be accurate.  buildDbContextSection already
 * truncates what Claude sees (displayCap), so fetching more rows only
 * costs a bit of query time — it doesn't inflate the prompt.
 */
function computeAdaptiveLimit(count: number, config: AdaptiveConfig): number {
  if (count <= 0) {
    // Unknown count or empty table — use maxLimit as safe default
    return config.maxLimit;
  }
  // Fetch everything up to maxLimit; if table is larger, cap at maxLimit
  return Math.min(count, config.maxLimit);
}

// ---------------------------------------------------------------------------
// MAIN RESOLVER
// ---------------------------------------------------------------------------

/**
 * Resolve all query context specs against the database.
 * Steps:
 * 1. Run lightweight COUNT(*) pre-queries for adaptive tables
 * 2. Compute smart limits based on actual data volume
 * 3. Execute full queries with computed limits
 * 4. Compute summary statistics from results
 */
export async function resolveQueryContext(
  supabaseClient: any,
  specs: QueryContextSpec[] | null,
  inputContext: QueryContextInput
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  if (!specs || specs.length === 0) {
    return data;
  }

  // Always include business dictionary for context
  try {
    const { data: dictionary } = await supabaseClient
      .from('metadata_business_dictionary')
      .select('term, business_definition, agent_guidance')
      .limit(20);
    data.businessDictionary = dictionary || [];
  } catch {
    data.businessDictionary = [];
  }

  // --- Phase 1: Adaptive data discovery ---
  const volumes = await discoverDataVolume(supabaseClient, specs, inputContext);
  const volumeMap = new Map(volumes.map((v) => [v.table, v.count]));

  // Log adaptive decisions
  if (volumes.length > 0) {
    const logParts = volumes
      .filter((v) => v.count >= 0)
      .map((v) => {
        const spec = specs.find((s) => s.table === v.table);
        const limit = spec?.adaptiveConfig
          ? computeAdaptiveLimit(v.count, spec.adaptiveConfig)
          : '?';
        return `${v.table}=${v.count}→${limit}`;
      });
    console.log(`[adaptive] Data volumes: ${logParts.join(', ')}`);
  }

  // --- Phase 2: Execute full queries with adaptive limits ---
  const queryPromises = specs.map(async (spec) => {
    try {
      // Compute effective limit
      let effectiveLimit = spec.limit; // fixed limit (dim/reference tables)

      if (spec.adaptiveConfig) {
        const count = volumeMap.get(spec.table) ?? -1;
        effectiveLimit = computeAdaptiveLimit(count, spec.adaptiveConfig);
      }

      const result = await executeQuerySpec(supabaseClient, spec, inputContext, effectiveLimit);
      return { table: spec.table, data: result };
    } catch (error) {
      console.error(`Error querying ${spec.table}:`, error);
      return { table: spec.table, data: [], error: (error as Error).message };
    }
  });

  const results = await Promise.all(queryPromises);

  for (const result of results) {
    data[result.table] = result.data;
    if ('error' in result) {
      data[`${result.table}_error`] = result.error;
    }
  }

  // --- Phase 3: Compute summary statistics ---
  computeSummaryStats(data);

  return data;
}

// ---------------------------------------------------------------------------
// QUERY EXECUTION
// ---------------------------------------------------------------------------

/**
 * PostgREST default page size — Supabase silently caps results to this
 * even when .limit() requests more.  We paginate with .range() to bypass.
 */
const POSTGREST_PAGE_SIZE = 1000;

/**
 * Execute a single query spec against Supabase.
 * Uses effectiveLimit (from adaptive discovery) instead of spec.limit.
 * Automatically paginates with .range() when limit > POSTGREST_PAGE_SIZE.
 */
async function executeQuerySpec(
  supabaseClient: any,
  spec: QueryContextSpec,
  inputContext: QueryContextInput,
  effectiveLimit?: number,
): Promise<unknown[]> {
  const selectClause = spec.select.includes('*') ? '*' : spec.select.join(', ');
  const limit = effectiveLimit && effectiveLimit > 0 ? effectiveLimit : undefined;

  // Helper: build a base query with filters + ordering (no range/limit yet)
  function buildBaseQuery() {
    let query = supabaseClient.from(spec.table).select(selectClause);
    if (spec.filters) {
      for (const filter of spec.filters) {
        const value = substituteVariable(filter.value, inputContext);
        query = applyFilter(query, filter.field, filter.operator as any, value);
      }
    }
    if (spec.orderBy) {
      query = query.order(spec.orderBy.field, { ascending: spec.orderBy.ascending });
    }
    return query;
  }

  // If limit fits in a single page, simple single fetch
  if (!limit || limit <= POSTGREST_PAGE_SIZE) {
    let query = buildBaseQuery();
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw new Error(`Query failed on ${spec.table}: ${error.message}`);
    return data || [];
  }

  // Paginate: fetch in chunks of POSTGREST_PAGE_SIZE using .range()
  const allRows: unknown[] = [];
  let offset = 0;

  while (offset < limit) {
    const end = Math.min(offset + POSTGREST_PAGE_SIZE - 1, limit - 1);
    const query = buildBaseQuery().range(offset, end);
    const { data, error } = await query;

    if (error) throw new Error(`Query failed on ${spec.table} (page offset=${offset}): ${error.message}`);
    if (!data || data.length === 0) break; // no more rows

    allRows.push(...data);
    offset += data.length;

    // If we got fewer rows than the page size, there's no more data
    if (data.length < POSTGREST_PAGE_SIZE) break;
  }

  return allRows;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Substitute {{variable}} placeholders with actual values from input context.
 */
function substituteVariable(
  value: string | number | boolean | string[],
  context: QueryContextInput
): string | number | boolean | string[] {
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const key = value.slice(2, -2).trim();
    const resolved = context[key];
    if (resolved !== undefined) {
      return resolved as string | number | boolean | string[];
    }
  }
  return value;
}

/**
 * Apply a filter operator to a Supabase query.
 */
function applyFilter(
  query: any,
  field: string,
  operator: string,
  value: string | number | boolean | string[]
): any {
  switch (operator) {
    case 'eq':
      return query.eq(field, value);
    case 'neq':
      return query.neq(field, value);
    case 'gt':
      return query.gt(field, value);
    case 'gte':
      return query.gte(field, value);
    case 'lt':
      return query.lt(field, value);
    case 'lte':
      return query.lte(field, value);
    case 'in':
      return query.in(field, Array.isArray(value) ? value : [value]);
    case 'like':
      return query.like(field, value);
    default:
      console.warn(`Unknown filter operator: ${operator}`);
      return query;
  }
}

/**
 * Compute summary statistics from query results.
 * These are appended to the context so the LLM has pre-calculated aggregates.
 *
 * IMPORTANT: Monthly aggregations ensure Claude sees the full time-series
 * picture even though buildDbContextSection truncates raw rows to displayCap.
 */
function computeSummaryStats(data: Record<string, unknown>): void {
  // ---- Revenue stats ----
  const revenueData = data['fact_revenue'] as {
    gross_value_amount?: number;
    booking_datetime?: string;
    origin_city?: string;
    destination_city?: string;
  }[] | undefined;

  if (Array.isArray(revenueData) && revenueData.length > 0) {
    data.totalRevenue = revenueData.reduce((sum, r) => sum + (r.gross_value_amount || 0), 0);
    data.transactionCount = revenueData.length;

    // Monthly revenue aggregation — gives Claude the full time-series
    const revenueByMonth = new Map<string, { revenue: number; count: number }>();
    for (const r of revenueData) {
      const month = (r.booking_datetime || '').slice(0, 7); // "YYYY-MM"
      if (!month) continue;
      const entry = revenueByMonth.get(month) || { revenue: 0, count: 0 };
      entry.revenue += r.gross_value_amount || 0;
      entry.count += 1;
      revenueByMonth.set(month, entry);
    }
    data.revenueByMonth = Array.from(revenueByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, revenue: Math.round(v.revenue), transactions: v.count }));

    // Revenue by route (top routes)
    const revenueByRoute = new Map<string, { revenue: number; count: number }>();
    for (const r of revenueData) {
      const route = r.origin_city && r.destination_city
        ? `${r.origin_city}-${r.destination_city}` : 'Unknown';
      const entry = revenueByRoute.get(route) || { revenue: 0, count: 0 };
      entry.revenue += r.gross_value_amount || 0;
      entry.count += 1;
      revenueByRoute.set(route, entry);
    }
    data.revenueByRoute = Array.from(revenueByRoute.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([route, v]) => ({ route, revenue: Math.round(v.revenue), transactions: v.count }));
  }

  // ---- NPS stats ----
  const npsData = data['fact_nps_response'] as {
    promoters_count?: number;
    detractors_count?: number;
    total_responses?: number;
    month?: string;
    customer_type?: string;
  }[] | undefined;

  if (Array.isArray(npsData) && npsData.length > 0) {
    const totalPromoters = npsData.reduce((sum, n) => sum + (n.promoters_count || 0), 0);
    const totalDetractors = npsData.reduce((sum, n) => sum + (n.detractors_count || 0), 0);
    const totalResponses = npsData.reduce((sum, n) => sum + (n.total_responses || 0), 0);
    if (totalResponses > 0) {
      data.npsScore = Math.round(((totalPromoters - totalDetractors) / totalResponses) * 100);
      data.promotersPercent = Math.round((totalPromoters / totalResponses) * 100);
      data.detractorsPercent = Math.round((totalDetractors / totalResponses) * 100);
    }

    // Monthly NPS aggregation
    const npsByMonth = new Map<string, { promoters: number; detractors: number; total: number }>();
    for (const n of npsData) {
      const month = n.month || '';
      if (!month) continue;
      const entry = npsByMonth.get(month) || { promoters: 0, detractors: 0, total: 0 };
      entry.promoters += n.promoters_count || 0;
      entry.detractors += n.detractors_count || 0;
      entry.total += n.total_responses || 0;
      npsByMonth.set(month, entry);
    }
    data.npsByMonth = Array.from(npsByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        nps: v.total > 0 ? Math.round(((v.promoters - v.detractors) / v.total) * 100) : 0,
        responses: v.total,
      }));
  }

  // ---- Trip/OTP stats ----
  const tripData = data['fact_trip'] as {
    is_on_time?: boolean;
    trip_date?: string;
    delay_minutes?: number;
  }[] | undefined;

  if (Array.isArray(tripData) && tripData.length > 0) {
    const onTime = tripData.filter((t) => t.is_on_time).length;
    data.totalTrips = tripData.length;
    data.onTimeTrips = onTime;
    data.otpPercent = Math.round((onTime / tripData.length) * 100);

    // Monthly OTP aggregation
    const otpByMonth = new Map<string, { total: number; onTime: number; totalDelay: number }>();
    for (const t of tripData) {
      const month = (t.trip_date || '').slice(0, 7);
      if (!month) continue;
      const entry = otpByMonth.get(month) || { total: 0, onTime: 0, totalDelay: 0 };
      entry.total += 1;
      if (t.is_on_time) entry.onTime += 1;
      entry.totalDelay += t.delay_minutes || 0;
      otpByMonth.set(month, entry);
    }
    data.otpByMonth = Array.from(otpByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        otpPercent: Math.round((v.onTime / v.total) * 100),
        trips: v.total,
        avgDelay: Math.round(v.totalDelay / v.total),
      }));
  }

  // ---- Funnel stats ----
  const funnelData = data['fact_funnel'] as {
    homepage_flag?: boolean;
    trip_input_page_flag?: boolean;
    trip_option_page_flag?: boolean;
    seat_option_page_flag?: boolean;
    booking_page_flag?: boolean;
    order_id?: string;
  }[] | undefined;
  if (Array.isArray(funnelData) && funnelData.length > 0) {
    data.totalSessions = funnelData.length;
    data.homepageVisits = funnelData.filter((f) => f.homepage_flag).length;
    data.completedBookings = funnelData.filter((f) => f.booking_page_flag).length;
    data.conversionRate = data.totalSessions
      ? Math.round(((data.completedBookings as number) / (data.totalSessions as number)) * 100)
      : 0;
  }
}
