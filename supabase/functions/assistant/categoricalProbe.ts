// =============================================================================
// CATEGORICAL PROBE — Detect which categorical columns the user is asking about
// and fetch ground-truth distinct/top-N rollups via the
// gold.registry_categorical_summary RPC.
//
// This bypasses the 5000-row sample limit of REGISTRY_SPEC for distinct counts
// and top-N breakdowns. The RPC's whitelist on the SQL side keeps things safe.
//
// We call PostgREST directly with Accept-Profile/Content-Profile headers
// because supabase-js v2's .schema('gold').rpc() does not reliably propagate
// the schema header for RPC calls (only for .from() table queries).
// =============================================================================

const COLUMN_TRIGGERS: Record<string, string[]> = {
  kecamatan:                    ['kecamatan'],
  kelurahan:                    ['kelurahan', 'desa'],
  merek_kendaraan:              ['merek', 'merk', 'brand'],
  warna_plat:                   ['warna plat', 'plat'],
  bahan_bakar:                  ['bahan bakar', 'bensin', 'solar', 'listrik'],
  tipe:                         ['tipe kendaraan', 'tipe motor', 'tipe mobil'],
  segmen_kepatuhan:             ['segmen', 'kepatuhan', 'pyramid', 'piramida'],
  kode_jenken:                  ['jenken', 'jenis kendaraan'],
  treatment_kanal_utama:        ['kanal', 'channel'],
  treatment_kebijakan_amnesti:  ['amnesti'],
  treatment_aksi_utama:         ['aksi treatment', 'tindakan utama'],
};

const MAX_COLUMNS_PER_REQUEST = 5;
const SCHEMA = 'gold';

export function detectCategoricalColumns(message: string): string[] {
  const lower = message.toLowerCase();
  const out: string[] = [];
  for (const [col, triggers] of Object.entries(COLUMN_TRIGGERS)) {
    if (triggers.some((t) => lower.includes(t))) out.push(col);
  }
  return out.slice(0, MAX_COLUMNS_PER_REQUEST);
}

async function postgrestRpc<T = unknown>(
  rpcName: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.warn('[postgrestRpc] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Accept-Profile': SCHEMA,
        'Content-Profile': SCHEMA,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[postgrestRpc] ${rpcName} HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[postgrestRpc] ${rpcName} fetch error: ${(err as Error).message}`);
    return null;
  }
}

export async function fetchCategoricalSummaries(
  _supabaseClient: any,
  columns: string[],
  topN = 50,
): Promise<Array<Record<string, unknown>>> {
  if (columns.length === 0) return [];

  const probes = await Promise.all(
    columns.map((col) =>
      postgrestRpc<Record<string, unknown>>('registry_categorical_summary', {
        p_column: col,
        p_top_n: topN,
      })
    )
  );

  const result: Array<Record<string, unknown>> = [];
  for (let i = 0; i < columns.length; i++) {
    const data = probes[i];
    if (data) result.push(data);
  }
  return result;
}

export async function fetchRegistryGlobalStats(
  _supabaseClient: any,
): Promise<Record<string, unknown> | null> {
  return await postgrestRpc<Record<string, unknown>>('registry_global_stats', {});
}
