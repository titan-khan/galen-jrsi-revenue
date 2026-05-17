-- =============================================================================
-- ASSISTANT GROUND-TRUTH RPCs
--
-- The Assistant Edge Function previously aggregated registry stats from a
-- 5000-row sample of gold.registry_enriched (~427K rows). This caused undercount
-- on distinct counts (kecamatan, kelurahan, merek, ...) and on numeric KPIs
-- (compliance pyramid counts, total est PKB, etc).
--
-- These two RPCs push aggregation server-side over the FULL table:
--   1. registry_categorical_summary — generic distinct-count + top-N for any
--      whitelisted categorical column.
--   2. registry_global_stats — full-table totals + compliance pyramid +
--      compliance by kabupaten.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Generic categorical rollup with column whitelist (SQL-injection safe)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.registry_categorical_summary(
  p_column TEXT,
  p_top_n  INT DEFAULT 50
) RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_allowed TEXT[] := ARRAY[
    'kecamatan','kelurahan','merek_kendaraan','warna_plat','bahan_bakar',
    'tipe','segmen_kepatuhan','kode_jenken',
    'treatment_kanal_utama','treatment_kebijakan_amnesti','treatment_aksi_utama'
  ];
  v_sql    TEXT;
  v_result JSONB;
BEGIN
  IF NOT (p_column = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'column % not in whitelist', p_column;
  END IF;

  IF p_top_n IS NULL OR p_top_n <= 0 OR p_top_n > 500 THEN
    p_top_n := 50;
  END IF;

  v_sql := format($q$
    WITH base AS (
      SELECT COALESCE(NULLIF(TRIM(%1$I::TEXT),''),'(tidak diketahui)') AS value,
             est_pkb_per_kendaraan
      FROM gold.registry_enriched
    ),
    agg AS (
      SELECT value,
             COUNT(*)::INT AS vehicle_count,
             COALESCE(ROUND(SUM(est_pkb_per_kendaraan))::BIGINT, 0) AS total_est_pkb
      FROM base GROUP BY value
    ),
    summary AS (
      SELECT
        COUNT(*) FILTER (WHERE value <> '(tidak diketahui)')::INT AS distinct_known,
        COUNT(*)::INT                                              AS distinct_total,
        SUM(vehicle_count)::INT                                    AS total_rows,
        COALESCE(SUM(vehicle_count) FILTER (WHERE value='(tidak diketahui)'),0)::INT AS blank_rows
      FROM agg
    ),
    top_rows AS (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) AS rows
      FROM (
        SELECT value, vehicle_count, total_est_pkb
        FROM agg ORDER BY vehicle_count DESC LIMIT %2$L
      ) t
    )
    SELECT jsonb_build_object(
      'column',         %3$L,
      'distinct_known', s.distinct_known,
      'distinct_total', s.distinct_total,
      'total_rows',     s.total_rows,
      'blank_rows',     s.blank_rows,
      'top',            tr.rows
    )
    FROM summary s, top_rows tr
  $q$, p_column, p_top_n, p_column);

  EXECUTE v_sql INTO v_result;
  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION gold.registry_categorical_summary(TEXT, INT)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION gold.registry_categorical_summary(TEXT, INT) IS
  'Generic categorical rollup over gold.registry_enriched. Whitelisted columns only. Returns {distinct_known, distinct_total, total_rows, blank_rows, top:[...]}.';


-- -----------------------------------------------------------------------------
-- 2) Full-table totals + compliance pyramid + compliance by kabupaten
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.registry_global_stats() RETURNS JSONB
LANGUAGE sql STABLE AS $$
  WITH pyramid AS (
    SELECT segmen_kepatuhan                                      AS kode,
           MIN(segmen_nama)                                      AS nama,
           COUNT(*)::INT                                         AS count,
           ROUND(AVG(durasi_tunggakan_days))::INT                AS avg_tunggakan_days,
           ROUND(AVG(CASE WHEN has_phone THEN 1 ELSE 0 END) * 100, 1)::NUMERIC          AS with_phone_pct,
           ROUND(AVG(CASE WHEN has_payment_history THEN 1 ELSE 0 END) * 100, 1)::NUMERIC AS with_payment_history_pct,
           COALESCE(ROUND(SUM(est_pkb_per_kendaraan))::BIGINT, 0) AS total_est_pkb
    FROM gold.registry_enriched
    GROUP BY segmen_kepatuhan
  ),
  by_kab AS (
    SELECT b.kabupaten_id,
           dk.nama_kabupaten                                    AS kabupaten,
           dk.tipologi_wilayah                                  AS tipologi,
           COUNT(*)::INT                                        AS kendaraan_count,
           COALESCE(ROUND(SUM(b.est_pkb_per_kendaraan))::BIGINT, 0) AS total_est_pkb
    FROM gold.registry_enriched b
    LEFT JOIN gold.dim_kabupaten dk USING (kabupaten_id)
    GROUP BY b.kabupaten_id, dk.nama_kabupaten, dk.tipologi_wilayah
    ORDER BY total_est_pkb DESC
    LIMIT 14
  ),
  totals AS (
    SELECT COUNT(*)::INT                                            AS total_kendaraan,
           COALESCE(ROUND(SUM(est_pkb_per_kendaraan))::BIGINT, 0)   AS total_est_pkb,
           COUNT(*) FILTER (WHERE has_phone)::INT                   AS with_phone_count,
           COUNT(*) FILTER (WHERE has_payment_history)::INT         AS with_payment_history_count
    FROM gold.registry_enriched
  )
  SELECT jsonb_build_object(
    'total_kendaraan',           (SELECT total_kendaraan           FROM totals),
    'total_est_pkb',             (SELECT total_est_pkb             FROM totals),
    'with_phone_count',          (SELECT with_phone_count          FROM totals),
    'with_payment_history_count',(SELECT with_payment_history_count FROM totals),
    'compliancePyramid',         (SELECT COALESCE(jsonb_agg(p ORDER BY p.kode), '[]'::jsonb) FROM pyramid p),
    'complianceByKabupaten',     (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb)                 FROM by_kab k)
  );
$$;

GRANT EXECUTE ON FUNCTION gold.registry_global_stats() TO anon, authenticated, service_role;

COMMENT ON FUNCTION gold.registry_global_stats() IS
  'Ground-truth aggregates over the FULL gold.registry_enriched table (no sampling). Used by assistant to override sample-derived stats.';
