-- =============================================================================
-- L6 GOLDEN QUERIES — JR PKB Pilot Palangka Raya
-- =============================================================================
-- Verified, executable SQL library. Each query is tagged with trust level
-- in the comment header. Galen uses these as foundation queries.
--
-- Trust levels:
--   VERIFIED = tested + validated against framework v1.4
--   REVIEWED = reviewed by pilot lead, not yet user-validated
--   DRAFT    = auto-generated, not yet validated
-- =============================================================================


-- =============================================================================
-- CATEGORY: DISTRIBUTION
-- =============================================================================

-- Q-DIST-001 [VERIFIED] Total kendaraan per segmen
SELECT
    segmen_kepatuhan AS segmen,
    COUNT(*) AS total_kendaraan,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan
ORDER BY
    CASE segmen_kepatuhan
        WHEN 'H1' THEN 1 WHEN 'K1' THEN 2 WHEN 'O1' THEN 3
        WHEN 'M1' THEN 4 WHEN 'M2' THEN 5 WHEN 'S1' THEN 6 WHEN 'S2' THEN 7
        ELSE 8
    END;


-- Q-DIST-002 [VERIFIED] Distribusi motor vs mobil per segmen
SELECT
    re.segmen_kepatuhan,
    CASE WHEN dj.kategori = 'R2' THEN 'Motor' ELSE 'Mobil' END AS jenis,
    COUNT(*) AS jumlah
FROM gold.registry_enriched re
LEFT JOIN ref.dim_jenken dj ON re.kode_jenken = dj.kode_jenken
GROUP BY re.segmen_kepatuhan, jenis
ORDER BY re.segmen_kepatuhan, jenis;


-- Q-DIST-003 [VERIFIED] Usia kendaraan distribution per segmen
SELECT
    segmen_kepatuhan,
    CASE
        WHEN usia_kendaraan IS NULL THEN 'Unknown'
        WHEN usia_kendaraan < 5 THEN '<5 thn'
        WHEN usia_kendaraan < 10 THEN '5-9 thn'
        WHEN usia_kendaraan < 15 THEN '10-14 thn'
        WHEN usia_kendaraan < 20 THEN '15-19 thn'
        ELSE '20+ thn'
    END AS usia_band,
    COUNT(*) AS jumlah
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan, usia_band
ORDER BY segmen_kepatuhan, usia_band;


-- =============================================================================
-- CATEGORY: REVENUE
-- =============================================================================

-- Q-REV-001 [VERIFIED] Total potensi PKB per segmen
SELECT
    segmen_kepatuhan AS segmen,
    COUNT(*) AS jumlah_kendaraan,
    SUM(est_pkb_per_kendaraan) AS total_potensi_pkb,
    ROUND(AVG(est_pkb_per_kendaraan), 0) AS rata_pkb_per_kendaraan
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan
ORDER BY total_potensi_pkb DESC;


-- Q-REV-002 [VERIFIED] Expected recovery konservatif per segmen
WITH rev AS (
    SELECT
        re.segmen_kepatuhan,
        SUM(re.est_pkb_per_kendaraan) AS total_potensi
    FROM gold.registry_enriched re
    GROUP BY re.segmen_kepatuhan
)
SELECT
    rev.segmen_kepatuhan AS segmen,
    rev.total_potensi,
    tr.perkiraan_konversi,
    rev.total_potensi * (
        CAST(SPLIT_PART(REPLACE(tr.perkiraan_konversi, '%', ''), '-', 1) AS NUMERIC) / 100.0
    ) AS expected_recovery_konservatif
FROM rev
LEFT JOIN ref.treatment_rules tr ON rev.segmen_kepatuhan = tr.segmen
ORDER BY expected_recovery_konservatif DESC;


-- Q-REV-003 [REVIEWED] SWDKLLJ realized total + share
SELECT
    tahun_pajak,
    SUM(pokok_pkb) AS total_pkb,
    SUM(pokok_swd) AS total_swd,
    ROUND(100.0 * SUM(pokok_swd) / NULLIF(SUM(pokok_pkb), 0), 2) AS swd_share_pct
FROM gold.transaksi_fact
WHERE tahun_pajak >= EXTRACT(YEAR FROM CURRENT_DATE) - 3
GROUP BY tahun_pajak
ORDER BY tahun_pajak DESC;


-- =============================================================================
-- CATEGORY: TREATMENT
-- =============================================================================

-- Q-TREAT-001 [VERIFIED] Treatment recommendation per segmen with sample count
SELECT
    tr.segmen,
    tr.kanal_utama,
    tr.kebijakan_amnesti,
    tr.aksi_utama,
    tr.perkiraan_konversi,
    COALESCE(re_count.jumlah, 0) AS jumlah_kendaraan
FROM ref.treatment_rules tr
LEFT JOIN (
    SELECT segmen_kepatuhan, COUNT(*) AS jumlah
    FROM gold.registry_enriched
    GROUP BY segmen_kepatuhan
) re_count ON tr.segmen = re_count.segmen_kepatuhan
ORDER BY
    CASE tr.segmen
        WHEN 'H1' THEN 1 WHEN 'K1' THEN 2 WHEN 'O1' THEN 3
        WHEN 'M1' THEN 4 WHEN 'M2' THEN 5 WHEN 'S1' THEN 6 WHEN 'S2' THEN 7
    END;


-- Q-TREAT-002 [VERIFIED] Treatment feasibility (kanal x phone availability)
SELECT
    re.segmen_kepatuhan,
    re.kanal_utama,
    SUM(CASE WHEN re.has_phone THEN 1 ELSE 0 END) AS reachable_via_phone,
    COUNT(*) AS total,
    ROUND(100.0 * SUM(CASE WHEN re.has_phone THEN 1 ELSE 0 END) / COUNT(*), 2) AS phone_coverage_pct
FROM gold.registry_enriched re
GROUP BY re.segmen_kepatuhan, re.kanal_utama
ORDER BY re.segmen_kepatuhan;


-- =============================================================================
-- CATEGORY: CONTACTABILITY
-- =============================================================================

-- Q-CONTACT-001 [VERIFIED] Phone coverage per segmen
SELECT
    segmen_kepatuhan,
    COUNT(*) AS total,
    SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) AS with_phone,
    ROUND(100.0 * SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) / COUNT(*), 2) AS coverage_pct
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan
ORDER BY coverage_pct DESC;


-- Q-CONTACT-002 [VERIFIED] Kendaraan unreachable (no phone, M1+M2 segmen)
SELECT
    re.nopol,
    re.segmen_kepatuhan,
    re.kode_jenken,
    re.thn_buat,
    re.usia_kendaraan,
    re.est_pkb_per_kendaraan,
    re.kanal_utama AS kanal_default
FROM gold.registry_enriched re
WHERE re.segmen_kepatuhan IN ('M1', 'M2')
  AND re.has_phone = FALSE
ORDER BY re.est_pkb_per_kendaraan DESC
LIMIT 100;


-- =============================================================================
-- CATEGORY: DEEP_DIVE
-- =============================================================================

-- Q-DD-001 [VERIFIED] K1 segmen detail
SELECT
    'K1 - Kepatuhan Rendah Pendek' AS segmen,
    COUNT(*) AS jumlah_kendaraan,
    SUM(est_pkb_per_kendaraan) AS total_potensi_pkb,
    ROUND(AVG(est_pkb_per_kendaraan), 0) AS rata_pkb_per_kendaraan,
    SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) AS phone_reachable,
    ROUND(100.0 * SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) / COUNT(*), 2) AS phone_coverage_pct,
    AVG(durasi_tunggakan_days) AS rata_durasi_tunggakan_days
FROM gold.registry_enriched
WHERE segmen_kepatuhan = 'K1';


-- Q-DD-002 [VERIFIED] M2 segmen
SELECT
    'M2 - Macet Lama' AS segmen,
    COUNT(*) AS jumlah_kendaraan,
    SUM(est_pkb_per_kendaraan) AS total_potensi_pkb,
    SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) AS phone_reachable,
    AVG(usia_kendaraan) AS rata_usia_kendaraan,
    AVG(durasi_tunggakan_days) AS rata_durasi_tunggakan
FROM gold.registry_enriched
WHERE segmen_kepatuhan = 'M2';


-- Q-DD-003 [VERIFIED] Top 50 kendaraan by potensi PKB di K1+O1
SELECT
    re.nopol,
    re.segmen_kepatuhan,
    re.kode_jenken,
    dj.kategori,
    re.thn_buat,
    re.durasi_tunggakan_days,
    re.est_pkb_per_kendaraan,
    re.has_phone,
    re.kanal_utama
FROM gold.registry_enriched re
LEFT JOIN ref.dim_jenken dj ON re.kode_jenken = dj.kode_jenken
WHERE re.segmen_kepatuhan IN ('K1', 'O1')
  AND re.has_phone = TRUE
ORDER BY re.est_pkb_per_kendaraan DESC
LIMIT 50;


-- =============================================================================
-- CATEGORY: VALIDATION
-- =============================================================================

-- Q-VAL-001 [VERIFIED] Sanity check row count
SELECT
    COUNT(*) AS total_rows,
    CASE
        WHEN COUNT(*) BETWEEN 420000 AND 435000 THEN 'OK'
        ELSE 'MISMATCH (expected ~427,977)'
    END AS health
FROM gold.registry_enriched;


-- Q-VAL-002 [VERIFIED] Unclassified rows
SELECT
    COUNT(*) AS unclassified_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM gold.registry_enriched), 4) AS pct
FROM gold.registry_enriched
WHERE segmen_kepatuhan IS NULL OR segmen_kepatuhan = 'unclassified';


-- Q-VAL-003 [VERIFIED] Kode_jenken yang missing dari dim_jenken (L4-DATA-001)
SELECT
    re.kode_jenken,
    COUNT(*) AS jumlah_kendaraan
FROM gold.registry_enriched re
LEFT JOIN ref.dim_jenken dj ON re.kode_jenken = dj.kode_jenken
WHERE dj.kode_jenken IS NULL
GROUP BY re.kode_jenken
ORDER BY jumlah_kendaraan DESC;


-- Q-VAL-004 [VERIFIED] Distribusi vs framework reference (audit)
WITH actual AS (
    SELECT segmen_kepatuhan, COUNT(*) AS actual_count
    FROM gold.registry_enriched
    GROUP BY segmen_kepatuhan
),
expected AS (
    SELECT 'H1' AS segmen, 175000 AS expected_count
    UNION ALL SELECT 'K1', 35000
    UNION ALL SELECT 'O1', 50000
    UNION ALL SELECT 'M1', 40000
    UNION ALL SELECT 'M2', 60000
    UNION ALL SELECT 'S1', 35000
    UNION ALL SELECT 'S2', 33000
)
SELECT
    e.segmen,
    e.expected_count,
    a.actual_count,
    a.actual_count - e.expected_count AS diff,
    ROUND(100.0 * (a.actual_count - e.expected_count) / e.expected_count, 2) AS diff_pct
FROM expected e
LEFT JOIN actual a ON e.segmen = a.segmen_kepatuhan
ORDER BY ABS(a.actual_count - e.expected_count) DESC;


-- =============================================================================
-- CATEGORY: ROLLUP
-- =============================================================================

-- Q-ROLLUP-001 [VERIFIED] Pilot dashboard one-shot summary
SELECT
    'Total Kendaraan' AS metric, COUNT(*)::TEXT AS value
FROM gold.registry_enriched
UNION ALL SELECT 'Total Potensi PKB (Rp Miliar)',
    ROUND(SUM(est_pkb_per_kendaraan) / 1e9, 2)::TEXT
FROM gold.registry_enriched
UNION ALL SELECT 'Avg PKB per Kendaraan (Rp)',
    ROUND(AVG(est_pkb_per_kendaraan), 0)::TEXT
FROM gold.registry_enriched
UNION ALL SELECT 'Arrears Rate (%)',
    ROUND(100.0 * SUM(CASE WHEN durasi_tunggakan_days > 0 THEN 1 ELSE 0 END) / COUNT(*), 2)::TEXT
FROM gold.registry_enriched
UNION ALL SELECT 'Phone Coverage (%)',
    ROUND(100.0 * SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) / COUNT(*), 2)::TEXT
FROM gold.registry_enriched
UNION ALL SELECT 'Quick Wins (K1 + has_phone)',
    COUNT(*)::TEXT
FROM gold.registry_enriched
WHERE segmen_kepatuhan = 'K1' AND has_phone = TRUE;


-- Q-ROLLUP-002 [REVIEWED] Wilayah/typology rollup
-- Caveat: Verify wilayah column exists per L1 schema
SELECT
    wilayah AS wilayah_kelurahan,
    COUNT(*) AS jumlah_kendaraan,
    SUM(est_pkb_per_kendaraan) AS total_potensi_pkb,
    SUM(CASE WHEN segmen_kepatuhan = 'K1' THEN 1 ELSE 0 END) AS K1_count,
    SUM(CASE WHEN segmen_kepatuhan IN ('M1', 'M2') THEN 1 ELSE 0 END) AS M_segmen_count
FROM gold.registry_enriched
GROUP BY wilayah
ORDER BY total_potensi_pkb DESC NULLS LAST
LIMIT 20;
