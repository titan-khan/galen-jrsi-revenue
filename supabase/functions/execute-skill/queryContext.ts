// =============================================================================
// QUERY CONTEXT RESOLVER — Declarative DB queries from skill spec
// Replaces all hardcoded skill-name routing
// =============================================================================

interface QueryContextSpec {
  table: string;
  select: string[];
  filters?: QueryFilter[];
  orderBy?: { field: string; ascending: boolean };
  limit?: number;
}

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

/**
 * Resolve all query context specs against the database.
 * Substitutes {{variable}} placeholders with actual input values.
 * Returns a map of table_name → query results.
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

  // Execute each query spec
  const queryPromises = specs.map(async (spec) => {
    try {
      const result = await executeQuerySpec(supabaseClient, spec, inputContext);
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

  // Calculate summary statistics from results
  computeSummaryStats(data);

  return data;
}

/**
 * Execute a single query spec against Supabase.
 */
async function executeQuerySpec(
  supabaseClient: any,
  spec: QueryContextSpec,
  inputContext: QueryContextInput
): Promise<unknown[]> {
  // Build select clause — handle "*" case
  const selectClause = spec.select.includes('*') ? '*' : spec.select.join(', ');

  let query = supabaseClient.from(spec.table).select(selectClause);

  // Apply filters with variable substitution
  if (spec.filters) {
    for (const filter of spec.filters) {
      const value = substituteVariable(filter.value, inputContext);
      query = applyFilter(query, filter.field, filter.operator, value);
    }
  }

  // Apply ordering
  if (spec.orderBy) {
    query = query.order(spec.orderBy.field, { ascending: spec.orderBy.ascending });
  }

  // Apply limit
  if (spec.limit) {
    query = query.limit(spec.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Query failed on ${spec.table}: ${error.message}`);
  }

  return data || [];
}

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
 */
function computeSummaryStats(data: Record<string, unknown>): void {
  // Revenue stats
  const revenueData = data['fact_revenue'] as { gross_value_amount?: number }[] | undefined;
  if (Array.isArray(revenueData) && revenueData.length > 0) {
    data.totalRevenue = revenueData.reduce((sum, r) => sum + (r.gross_value_amount || 0), 0);
    data.transactionCount = revenueData.length;
  }

  // NPS stats
  const npsData = data['fact_nps_response'] as { promoters_count?: number; detractors_count?: number; total_responses?: number }[] | undefined;
  if (Array.isArray(npsData) && npsData.length > 0) {
    const totalPromoters = npsData.reduce((sum, n) => sum + (n.promoters_count || 0), 0);
    const totalDetractors = npsData.reduce((sum, n) => sum + (n.detractors_count || 0), 0);
    const totalResponses = npsData.reduce((sum, n) => sum + (n.total_responses || 0), 0);
    if (totalResponses > 0) {
      data.npsScore = Math.round(((totalPromoters - totalDetractors) / totalResponses) * 100);
      data.promotersPercent = Math.round((totalPromoters / totalResponses) * 100);
      data.detractorsPercent = Math.round((totalDetractors / totalResponses) * 100);
    }
  }

  // Trip/OTP stats
  const tripData = data['fact_trip'] as { is_on_time?: boolean }[] | undefined;
  if (Array.isArray(tripData) && tripData.length > 0) {
    const onTime = tripData.filter((t) => t.is_on_time).length;
    data.totalTrips = tripData.length;
    data.onTimeTrips = onTime;
    data.otpPercent = Math.round((onTime / tripData.length) * 100);
  }
}
