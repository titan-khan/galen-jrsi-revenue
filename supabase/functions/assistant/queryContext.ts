// =============================================================================
// QUERY CONTEXT RESOLVER — Declarative DB queries from query specs
// PKB pilot domain. Supports cross-schema queries via .schema('gold' | 'meta' |
// 'ref' | 'kb') and computes PKB-specific summary aggregations.
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
// SCHEMA-AWARE QUERY BUILDERS
// ---------------------------------------------------------------------------

function fromSpec(supabaseClient: any, spec: QueryContextSpec) {
  if (spec.schema && spec.schema !== 'public') {
    return supabaseClient.schema(spec.schema as any).from(spec.table);
  }
  return supabaseClient.from(spec.table);
}

// Returns a stable key under which the spec's data is stored on the result obj
function dataKeyFor(spec: QueryContextSpec): string {
  return spec.schema && spec.schema !== 'public'
    ? `${spec.schema}.${spec.table}`
    : spec.table;
}

// ---------------------------------------------------------------------------
// ADAPTIVE DATA DISCOVERY
// ---------------------------------------------------------------------------

interface DataVolume {
  key: string;
  count: number;
}

async function discoverDataVolume(
  supabaseClient: any,
  specs: QueryContextSpec[],
  inputContext: QueryContextInput,
  timeoutMs = 250,
): Promise<DataVolume[]> {
  const adaptiveSpecs = specs.filter((s) => s.adaptiveConfig);
  if (adaptiveSpecs.length === 0) return [];

  const countPromises = adaptiveSpecs.map(async (spec) => {
    const key = dataKeyFor(spec);
    try {
      let query = fromSpec(supabaseClient, spec).select('*', { count: 'exact', head: true });

      if (spec.filters) {
        for (const filter of spec.filters) {
          const value = substituteVariable(filter.value, inputContext);
          query = applyFilter(query, filter.field, filter.operator as any, value);
        }
      }

      const { count, error } = await query;
      if (error) {
        console.warn(`[adaptive] COUNT failed for ${key}:`, error.message);
        return { key, count: -1 };
      }
      return { key, count: count ?? -1 };
    } catch {
      return { key, count: -1 };
    }
  });

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

function computeAdaptiveLimit(count: number, config: AdaptiveConfig): number {
  if (count <= 0) return config.maxLimit;
  return Math.min(count, config.maxLimit);
}

// ---------------------------------------------------------------------------
// MAIN RESOLVER
// ---------------------------------------------------------------------------

export async function resolveQueryContext(
  supabaseClient: any,
  specs: QueryContextSpec[] | null,
  inputContext: QueryContextInput
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  if (!specs || specs.length === 0) {
    return data;
  }

  // Adaptive volume discovery
  const volumes = await discoverDataVolume(supabaseClient, specs, inputContext);
  const volumeMap = new Map(volumes.map((v) => [v.key, v.count]));

  if (volumes.length > 0) {
    const logParts = volumes
      .filter((v) => v.count >= 0)
      .map((v) => {
        const spec = specs.find((s) => dataKeyFor(s) === v.key);
        const limit = spec?.adaptiveConfig
          ? computeAdaptiveLimit(v.count, spec.adaptiveConfig)
          : '?';
        return `${v.key}=${v.count}→${limit}`;
      });
    if (logParts.length > 0) {
      console.log(`[adaptive] Data volumes: ${logParts.join(', ')}`);
    }
  }

  // Execute queries in parallel
  const queryPromises = specs.map(async (spec) => {
    const key = dataKeyFor(spec);
    try {
      let effectiveLimit = spec.limit;

      if (spec.adaptiveConfig) {
        const count = volumeMap.get(key) ?? -1;
        effectiveLimit = computeAdaptiveLimit(count, spec.adaptiveConfig);
      }

      const result = await executeQuerySpec(supabaseClient, spec, inputContext, effectiveLimit);
      return { key, data: result };
    } catch (error) {
      console.error(`Error querying ${key}:`, error);
      return { key, data: [], error: (error as Error).message };
    }
  });

  const results = await Promise.all(queryPromises);

  for (const result of results) {
    data[result.key] = result.data;
    if ('error' in result) {
      data[`${result.key}_error`] = result.error;
    }
  }

  computeSummaryStats(data);

  return data;
}

// ---------------------------------------------------------------------------
// QUERY EXECUTION
// ---------------------------------------------------------------------------

const POSTGREST_PAGE_SIZE = 1000;

async function executeQuerySpec(
  supabaseClient: any,
  spec: QueryContextSpec,
  inputContext: QueryContextInput,
  effectiveLimit?: number,
): Promise<unknown[]> {
  const selectClause = spec.select.includes('*') ? '*' : spec.select.join(', ');
  const limit = effectiveLimit && effectiveLimit > 0 ? effectiveLimit : undefined;

  function buildBaseQuery() {
    let query = fromSpec(supabaseClient, spec).select(selectClause);
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

  if (!limit || limit <= POSTGREST_PAGE_SIZE) {
    let query = buildBaseQuery();
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw new Error(`Query failed on ${dataKeyFor(spec)}: ${error.message}`);
    return data || [];
  }

  // Paginate via .range()
  const allRows: unknown[] = [];
  let offset = 0;

  while (offset < limit) {
    const end = Math.min(offset + POSTGREST_PAGE_SIZE - 1, limit - 1);
    const query = buildBaseQuery().range(offset, end);
    const { data, error } = await query;

    if (error) throw new Error(`Query failed on ${dataKeyFor(spec)} (page offset=${offset}): ${error.message}`);
    if (!data || data.length === 0) break;

    allRows.push(...data);
    offset += data.length;

    if (data.length < POSTGREST_PAGE_SIZE) break;
  }

  return allRows;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PKB PYRAMID ORDER (for sorting compliance pyramid)
// ---------------------------------------------------------------------------
const PYRAMID_ORDER: Record<string, number> = {
  'H1': 1, 'K1': 2, 'O1': 3, 'M1': 4, 'M2': 5, 'S1': 6, 'S2': 7,
};

// ---------------------------------------------------------------------------
// SUMMARY STATS — PKB DOMAIN
// ---------------------------------------------------------------------------

function computeSummaryStats(data: Record<string, unknown>): void {
  // ---- Compliance pyramid (registry_enriched) ----
  // Sample-based aggregation. The Edge Function may override the resulting
  // compliancePyramid / complianceByKabupaten / totalKendaraanInSample with
  // ground-truth values from gold.registry_global_stats() AFTER this runs.
  const registry = data['gold.registry_enriched'] as Array<{
    segmen_kepatuhan?: string;
    segmen_nama?: string;
    durasi_tunggakan_days?: number;
    has_phone?: boolean;
    has_payment_history?: boolean;
    est_pkb_per_kendaraan?: number;
    kabupaten_id?: number;
  }> | undefined;

  if (Array.isArray(registry) && registry.length > 0) {
    const total = registry.length;

    // Pyramid (group by segmen_kepatuhan)
    const pyramidMap = new Map<string, {
      kode: string; nama: string; count: number;
      tunggakanSum: number; tunggakanN: number;
      phoneCount: number; paymentHistoryCount: number;
      pkbSum: number;
    }>();

    for (const r of registry) {
      const kode = r.segmen_kepatuhan || 'UNKNOWN';
      const entry = pyramidMap.get(kode) || {
        kode, nama: r.segmen_nama || kode, count: 0,
        tunggakanSum: 0, tunggakanN: 0,
        phoneCount: 0, paymentHistoryCount: 0, pkbSum: 0,
      };
      entry.count += 1;
      if (typeof r.durasi_tunggakan_days === 'number') {
        entry.tunggakanSum += r.durasi_tunggakan_days;
        entry.tunggakanN += 1;
      }
      if (r.has_phone) entry.phoneCount += 1;
      if (r.has_payment_history) entry.paymentHistoryCount += 1;
      if (typeof r.est_pkb_per_kendaraan === 'number') {
        entry.pkbSum += r.est_pkb_per_kendaraan;
      }
      pyramidMap.set(kode, entry);
    }

    data.compliancePyramid = Array.from(pyramidMap.values())
      .map((e) => ({
        kode: e.kode,
        nama: e.nama,
        count: e.count,
        pct: Math.round((e.count / total) * 1000) / 10,
        avgTunggakanDays: e.tunggakanN > 0 ? Math.round(e.tunggakanSum / e.tunggakanN) : null,
        withPhonePct: Math.round((e.phoneCount / e.count) * 1000) / 10,
        withPaymentHistoryPct: Math.round((e.paymentHistoryCount / e.count) * 1000) / 10,
        totalEstPkb: Math.round(e.pkbSum),
      }))
      .sort((a, b) => (PYRAMID_ORDER[a.kode] ?? 99) - (PYRAMID_ORDER[b.kode] ?? 99));

    data.totalKendaraanInSample = total;

    // Compliance by kabupaten
    const byKab = new Map<number, { kabupatenId: number; count: number; pkbSum: number }>();
    for (const r of registry) {
      if (typeof r.kabupaten_id !== 'number') continue;
      const e = byKab.get(r.kabupaten_id) || { kabupatenId: r.kabupaten_id, count: 0, pkbSum: 0 };
      e.count += 1;
      e.pkbSum += r.est_pkb_per_kendaraan || 0;
      byKab.set(r.kabupaten_id, e);
    }

    // Decorate with kabupaten name if dim available
    const dimKab = data['gold.dim_kabupaten'] as Array<{ kabupaten_id: number; nama_kabupaten: string; tipologi_wilayah?: string }> | undefined;
    const nameById = new Map<number, { name: string; tipologi?: string }>();
    if (Array.isArray(dimKab)) {
      for (const k of dimKab) nameById.set(k.kabupaten_id, { name: k.nama_kabupaten, tipologi: k.tipologi_wilayah });
    }

    data.complianceByKabupaten = Array.from(byKab.values())
      .map((e) => ({
        kabupatenId: e.kabupatenId,
        kabupaten: nameById.get(e.kabupatenId)?.name || `kab ${e.kabupatenId}`,
        tipologi: nameById.get(e.kabupatenId)?.tipologi || null,
        kendaraanCount: e.count,
        totalEstPkb: Math.round(e.pkbSum),
      }))
      .sort((a, b) => b.totalEstPkb - a.totalEstPkb)
      .slice(0, 14);
  }

  // ---- Revenue stats (transaksi_2025) ----
  const trx = data['gold.transaksi_2025'] as Array<{
    paid_on?: string;
    pokok_pkb?: number;
    tunggakan_pokok_pkb?: number;
    pokok_swdkllj?: number;
    tunggakan_pokok_swdkllj?: number;
    denda_swdkllj?: number;
    kabupaten_id?: number;
  }> | undefined;

  if (Array.isArray(trx) && trx.length > 0) {
    const totalPkb = trx.reduce((s, t) => s + (t.pokok_pkb || 0), 0);
    const totalPkbArrears = trx.reduce((s, t) => s + (t.tunggakan_pokok_pkb || 0), 0);
    const totalSwdk = trx.reduce((s, t) => s + (t.pokok_swdkllj || 0), 0);
    const totalSwdkArrears = trx.reduce((s, t) => s + (t.tunggakan_pokok_swdkllj || 0), 0);
    const totalDenda = trx.reduce((s, t) => s + (t.denda_swdkllj || 0), 0);

    data.totalPkbCollected = Math.round(totalPkb);
    data.totalPkbArrears = Math.round(totalPkbArrears);
    data.totalSwdkllj = Math.round(totalSwdk);
    data.totalSwdkljjArrears = Math.round(totalSwdkArrears);
    data.totalDendaSwdkllj = Math.round(totalDenda);
    data.transactionCount = trx.length;

    // Monthly aggregation (paid_on is text 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS')
    const byMonth = new Map<string, { month: string; pkb: number; swdkllj: number; transactions: number }>();
    for (const t of trx) {
      const month = (t.paid_on || '').slice(0, 7);
      if (!month) continue;
      const e = byMonth.get(month) || { month, pkb: 0, swdkllj: 0, transactions: 0 };
      e.pkb += t.pokok_pkb || 0;
      e.swdkllj += t.pokok_swdkllj || 0;
      e.transactions += 1;
      byMonth.set(month, e);
    }
    data.pkbByMonth = Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((e) => ({ month: e.month, pkb: Math.round(e.pkb), swdkllj: Math.round(e.swdkllj), transactions: e.transactions }));
  }
}
