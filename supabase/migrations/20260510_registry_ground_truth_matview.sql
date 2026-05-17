-- =============================================================================
-- ASSISTANT GROUND-TRUTH MATERIALIZED VIEWS
--
-- The previous registry_global_stats() and registry_categorical_summary()
-- functions did full-scan GROUP BY on gold.registry_enriched (~427K rows) per
-- request, consistently exceeding PostgREST's ~8s statement timeout when
-- called from the edge function. Solution: precompute aggregates into matviews
-- once, then have the RPCs query the matviews (sub-second).
--
-- Refresh with: SELECT gold.refresh_registry_ground_truth();
-- Suggested: pg_cron daily (data is loaded out-of-band).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Categorical distribution matview (long format: column × value)
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS gold.registry_categorical_dist_mv;

CREATE MATERIALIZED VIEW gold.registry_categorical_dist_mv AS
WITH src AS (
  SELECT
    kecamatan, kelurahan, merek_kendaraan, warna_plat, bahan_bakar,
    tipe, segmen_kepatuhan, kode_jenken,
    treatment_kanal_utama, treatment_kebijakan_amnesti, treatment_aksi_utama,
    est_pkb_per_kendaraan
  FROM gold.registry_enriched
),
unpivoted AS (
  SELECT 'kecamatan'::TEXT AS column_name,
         COALESCE(NULLIF(TRIM(kecamatan),''),'(tidak diketahui)') AS value,
         est_pkb_per_kendaraan
  FROM src
  UNION ALL SELECT 'kelurahan',
         COALESCE(NULLIF(TRIM(kelurahan),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'merek_kendaraan',
         COALESCE(NULLIF(TRIM(merek_kendaraan),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'warna_plat',
         COALESCE(NULLIF(TRIM(warna_plat),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'bahan_bakar',
         COALESCE(NULLIF(TRIM(bahan_bakar),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'tipe',
         COALESCE(NULLIF(TRIM(tipe),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'segmen_kepatuhan',
         COALESCE(NULLIF(TRIM(segmen_kepatuhan),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'kode_jenken',
         COALESCE(NULLIF(TRIM(kode_jenken),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'treatment_kanal_utama',
         COALESCE(NULLIF(TRIM(treatment_kanal_utama),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'treatment_kebijakan_amnesti',
         COALESCE(NULLIF(TRIM(treatment_kebijakan_amnesti),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
  UNION ALL SELECT 'treatment_aksi_utama',
         COALESCE(NULLIF(TRIM(treatment_aksi_utama),''),'(tidak diketahui)'),
         est_pkb_per_kendaraan FROM src
)
SELECT
  column_name,
  value,
  COUNT(*)::INT                                                AS vehicle_count,
  COALESCE(ROUND(SUM(est_pkb_per_kendaraan))::BIGINT, 0)       AS total_est_pkb
FROM unpivoted
GROUP BY column_name, value;

CREATE INDEX idx_registry_cat_dist_mv_col_count
  ON gold.registry_categorical_dist_mv (column_name, vehicle_count DESC);

GRANT SELECT ON gold.registry_categorical_dist_mv
  TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2) Global stats matview (single-row JSONB blob)
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS gold.registry_global_stats_mv;

CREATE MATERIALIZED VIEW gold.registry_global_stats_mv AS
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
SELECT
  1::INT AS singleton,
  jsonb_build_object(
    'total_kendaraan',           (SELECT total_kendaraan           FROM totals),
    'total_est_pkb',             (SELECT total_est_pkb             FROM totals),
    'with_phone_count',          (SELECT with_phone_count          FROM totals),
    'with_payment_history_count',(SELECT with_payment_history_count FROM totals),
    'compliancePyramid',         (SELECT COALESCE(jsonb_agg(p ORDER BY p.kode), '[]'::jsonb) FROM pyramid p),
    'complianceByKabupaten',     (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb)                 FROM by_kab k)
  ) AS stats;

CREATE UNIQUE INDEX idx_registry_global_stats_mv_singleton
  ON gold.registry_global_stats_mv (singleton);

GRANT SELECT ON gold.registry_global_stats_mv
  TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Replace RPCs with fast matview queries (SECURITY DEFINER bypasses
--    caller's GRANT issues on underlying tables — only the matview is read)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.registry_categorical_summary(
  p_column TEXT,
  p_top_n  INT DEFAULT 50
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = gold, pg_temp AS $$
DECLARE
  v_allowed TEXT[] := ARRAY[
    'kecamatan','kelurahan','merek_kendaraan','warna_plat','bahan_bakar',
    'tipe','segmen_kepatuhan','kode_jenken',
    'treatment_kanal_utama','treatment_kebijakan_amnesti','treatment_aksi_utama'
  ];
  v_result JSONB;
BEGIN
  IF NOT (p_column = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'column % not in whitelist', p_column;
  END IF;
  IF p_top_n IS NULL OR p_top_n <= 0 OR p_top_n > 500 THEN
    p_top_n := 50;
  END IF;

  WITH agg AS (
    SELECT value, vehicle_count, total_est_pkb
    FROM gold.registry_categorical_dist_mv
    WHERE column_name = p_column
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE value <> '(tidak diketahui)')::INT AS distinct_known,
      COUNT(*)::INT                                              AS distinct_total,
      COALESCE(SUM(vehicle_count),0)::INT                        AS total_rows,
      COALESCE(SUM(vehicle_count) FILTER (WHERE value='(tidak diketahui)'),0)::INT AS blank_rows
    FROM agg
  ),
  top_rows AS (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) AS rows
    FROM (
      SELECT value, vehicle_count, total_est_pkb
      FROM agg ORDER BY vehicle_count DESC LIMIT p_top_n
    ) t
  )
  SELECT jsonb_build_object(
    'column',         p_column,
    'distinct_known', s.distinct_known,
    'distinct_total', s.distinct_total,
    'total_rows',     s.total_rows,
    'blank_rows',     s.blank_rows,
    'top',            tr.rows
  )
  INTO v_result
  FROM summary s, top_rows tr;

  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION gold.registry_categorical_summary(TEXT, INT)
  TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION gold.registry_global_stats() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = gold, pg_temp AS $$
  SELECT stats FROM gold.registry_global_stats_mv WHERE singleton = 1;
$$;

GRANT EXECUTE ON FUNCTION gold.registry_global_stats() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4) Refresh helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.refresh_registry_ground_truth() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = gold, pg_temp AS $$
BEGIN
  REFRESH MATERIALIZED VIEW gold.registry_categorical_dist_mv;
  REFRESH MATERIALIZED VIEW gold.registry_global_stats_mv;
END $$;

GRANT EXECUTE ON FUNCTION gold.refresh_registry_ground_truth()
  TO authenticated, service_role;

COMMENT ON FUNCTION gold.refresh_registry_ground_truth() IS
  'Refresh the registry ground-truth matviews. Run after each registry data load. Safe to call concurrently — uses non-CONCURRENTLY refresh (full rewrite) since matviews are tiny.';
