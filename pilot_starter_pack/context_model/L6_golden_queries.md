# L6 — Golden Queries

**Layer:** L6 (Six-Layer Context Model)
**Purpose:** Library of **verified, trusted SQL queries** yang Galen pakai sebagai foundation untuk menjawab pertanyaan umum. Setiap golden query sudah di-test, di-explain, dan di-tag dengan trust level.
**Format:** Markdown narrative + SQL file (`L6_golden_queries.sql`)
**Last updated:** 2026-05-05
**Companion file:** `L6_golden_queries.sql` (executable SQL)

---

## 1. Why Golden Queries

LLM-generated SQL is fragile. Galen yang generate SQL on-the-fly bisa:
- Salah JOIN (terutama dengan data quality issues di L4-DATA).
- Lupa filter (e.g., scope Palangka Raya).
- Generate query expensive (full scan vs using materialized view).

L6 = **library of pre-vetted SQL** yang Galen prefer over auto-generation. Ketika user query semantically match, Galen pakai golden query langsung (atau dengan minor parameter substitution).

---

## 2. Trust Levels

Setiap query di-tag:

| Level | Meaning | Galen behavior |
|---|---|---|
| **VERIFIED** | Tested + result manually validated against framework v1.4 | Use as-is, high confidence |
| **REVIEWED** | Reviewed by pilot lead, syntax OK, logic plausible | Use with caveat banner |
| **DRAFT** | Auto-generated or user-suggested, not yet validated | Use with disclaimer "result may be incorrect" |

---

## 3. Query Categories

L6 organized into 7 categories matching common user intents:

1. **DISTRIBUTION** — Segmen distribution & demographics
2. **REVENUE** — Potential & realized revenue analysis
3. **TREATMENT** — Treatment recommendations & feasibility
4. **CONTACTABILITY** — Phone coverage & channel feasibility
5. **DEEP_DIVE** — Per-segmen detailed breakdown
6. **VALIDATION** — Data quality & sanity checks
7. **ROLLUP** — Cross-segmen summary roll-ups

---

## 4. Category: DISTRIBUTION

### Q-DIST-001 — Total kendaraan per segmen
**Trust:** VERIFIED
**User intent:** "Berapa total kendaraan per segmen?"
**Performance:** O(N), index on `segmen_kepatuhan`
**Verification:** Match Sheet 2 reference distribution within 1% (3,780 rows M2/S2 boundary).

```sql
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
```

### Q-DIST-002 — Distribusi motor vs mobil per segmen
**Trust:** VERIFIED
**User intent:** "Berapa motor dan mobil di setiap segmen?"

```sql
SELECT
    re.segmen_kepatuhan,
    CASE WHEN dj.kategori = 'R2' THEN 'Motor' ELSE 'Mobil' END AS jenis,
    COUNT(*) AS jumlah
FROM gold.registry_enriched re
LEFT JOIN ref.dim_jenken dj ON re.kode_jenken = dj.kode_jenken
GROUP BY re.segmen_kepatuhan, jenis
ORDER BY re.segmen_kepatuhan, jenis;
```

### Q-DIST-003 — Usia kendaraan distribution per segmen
**Trust:** VERIFIED

```sql
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
```

---

## 5. Category: REVENUE

### Q-REV-001 — Total potensi PKB per segmen
**Trust:** VERIFIED
**User intent:** "Berapa total potensi PKB di setiap segmen?"
**Caveat:** Estimasi berdasarkan median (L4-METRIC-001).

```sql
SELECT
    segmen_kepatuhan AS segmen,
    COUNT(*) AS jumlah_kendaraan,
    SUM(est_pkb_per_kendaraan) AS total_potensi_pkb,
    ROUND(AVG(est_pkb_per_kendaraan), 0) AS rata_pkb_per_kendaraan
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan
ORDER BY total_potensi_pkb DESC;
```

### Q-REV-002 — Expected recovery konservatif per segmen
**Trust:** VERIFIED
**User intent:** "Berapa estimasi PKB yang bisa di-recover?"
**Logic:** Pakai konversi lower bound dari treatment_rules.

```sql
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
    -- Parse "12-18%" → 0.12 (lower bound)
    rev.total_potensi * (
        CAST(SPLIT_PART(REPLACE(tr.perkiraan_konversi, '%', ''), '-', 1) AS NUMERIC) / 100.0
    ) AS expected_recovery_konservatif
FROM rev
LEFT JOIN ref.treatment_rules tr ON rev.segmen_kepatuhan = tr.segmen
ORDER BY expected_recovery_konservatif DESC;
```

### Q-REV-003 — SWDKLLJ realized total + share
**Trust:** REVIEWED
**Caveat:** Butuh transaksi_fact populated. Saat ini placeholder.

```sql
SELECT
    tahun_pajak,
    SUM(pokok_pkb) AS total_pkb,
    SUM(pokok_swd) AS total_swd,
    ROUND(100.0 * SUM(pokok_swd) / NULLIF(SUM(pokok_pkb), 0), 2) AS swd_share_pct
FROM gold.transaksi_fact
WHERE tahun_pajak >= EXTRACT(YEAR FROM CURRENT_DATE) - 3
GROUP BY tahun_pajak
ORDER BY tahun_pajak DESC;
```

---

## 6. Category: TREATMENT

### Q-TREAT-001 — Treatment recommendation per segmen (with sample count)
**Trust:** VERIFIED

```sql
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
```

### Q-TREAT-002 — Treatment feasibility (kanal × phone availability)
**Trust:** VERIFIED
**User intent:** "Untuk segmen K1, berapa kendaraan yang bisa di-WA?"

```sql
SELECT
    re.segmen_kepatuhan,
    re.kanal_utama,
    SUM(CASE WHEN re.has_phone THEN 1 ELSE 0 END) AS reachable_via_phone,
    COUNT(*) AS total,
    ROUND(100.0 * SUM(CASE WHEN re.has_phone THEN 1 ELSE 0 END) / COUNT(*), 2) AS phone_coverage_pct
FROM gold.registry_enriched re
GROUP BY re.segmen_kepatuhan, re.kanal_utama
ORDER BY re.segmen_kepatuhan;
```

---

## 7. Category: CONTACTABILITY

### Q-CONTACT-001 — Phone coverage per segmen
**Trust:** VERIFIED
**Caveat:** Phone validity not tested (L4-METRIC-004).

```sql
SELECT
    segmen_kepatuhan,
    COUNT(*) AS total,
    SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) AS with_phone,
    ROUND(100.0 * SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) / COUNT(*), 2) AS coverage_pct
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan
ORDER BY coverage_pct DESC;
```

### Q-CONTACT-002 — Kendaraan unreachable (no phone, segmen target M1+M2)
**Trust:** VERIFIED
**User intent:** "Kendaraan apa yang harus visit fisik karena no phone?"

```sql
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
```

---

## 8. Category: DEEP_DIVE

### Q-DD-001 — K1 segmen detail (high-priority quick wins)
**Trust:** VERIFIED
**User intent:** "Tunjukkan profile K1: jumlah, total potensi, channel."

```sql
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
```

### Q-DD-002 — M2 segmen — high effort, medium potential
**Trust:** VERIFIED

```sql
SELECT
    'M2 - Macet Lama' AS segmen,
    COUNT(*) AS jumlah_kendaraan,
    SUM(est_pkb_per_kendaraan) AS total_potensi_pkb,
    SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) AS phone_reachable,
    AVG(usia_kendaraan) AS rata_usia_kendaraan,
    AVG(durasi_tunggakan_days) AS rata_durasi_tunggakan
FROM gold.registry_enriched
WHERE segmen_kepatuhan = 'M2';
```

### Q-DD-003 — Top 50 kendaraan by potensi PKB di K1+O1 (low-effort high-value)
**Trust:** VERIFIED

```sql
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
```

---

## 9. Category: VALIDATION

### Q-VAL-001 — Sanity check: row count matches expected
**Trust:** VERIFIED

```sql
SELECT
    COUNT(*) AS total_rows,
    CASE
        WHEN COUNT(*) BETWEEN 420000 AND 435000 THEN 'OK'
        ELSE 'MISMATCH (expected ~427,977)'
    END AS health
FROM gold.registry_enriched;
```

### Q-VAL-002 — Unclassified rows (data quality flag)
**Trust:** VERIFIED

```sql
SELECT
    COUNT(*) AS unclassified_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM gold.registry_enriched), 4) AS pct
FROM gold.registry_enriched
WHERE segmen_kepatuhan IS NULL OR segmen_kepatuhan = 'unclassified';
```

### Q-VAL-003 — Kode_jenken yang missing dari dim_jenken
**Trust:** VERIFIED
**Reference:** L4-DATA-001.

```sql
SELECT
    re.kode_jenken,
    COUNT(*) AS jumlah_kendaraan
FROM gold.registry_enriched re
LEFT JOIN ref.dim_jenken dj ON re.kode_jenken = dj.kode_jenken
WHERE dj.kode_jenken IS NULL
GROUP BY re.kode_jenken
ORDER BY jumlah_kendaraan DESC;
```

### Q-VAL-004 — Distribusi vs framework reference (audit)
**Trust:** VERIFIED

```sql
WITH actual AS (
    SELECT segmen_kepatuhan, COUNT(*) AS actual_count
    FROM gold.registry_enriched
    GROUP BY segmen_kepatuhan
),
expected AS (
    -- Reference distribution from framework v1.4 Sheet 2 (manual seed)
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
```

---

## 10. Category: ROLLUP

### Q-ROLLUP-001 — Pilot dashboard one-shot summary
**Trust:** VERIFIED
**User intent:** "Ringkasan eksekutif satu layar."

```sql
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
```

### Q-ROLLUP-002 — Wilayah/typology rollup (jika ada di registry)
**Trust:** REVIEWED
**Caveat:** Field `wilayah_typology` belum confirmed exist; check L1.

```sql
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
```

---

## 11. Query Routing Map

Galen routes user intent → golden query via embedding similarity + tag match:

| User intent pattern | Golden query |
|---|---|
| "berapa kendaraan", "distribusi segmen" | Q-DIST-001 |
| "motor vs mobil" | Q-DIST-002 |
| "potensi pkb" | Q-REV-001 |
| "expected recovery", "berapa bisa direcover" | Q-REV-002 |
| "treatment rekomendasi" | Q-TREAT-001 |
| "yang bisa di WA / di telp" | Q-CONTACT-001 atau Q-TREAT-002 |
| "kendaraan tanpa telp" | Q-CONTACT-002 |
| "deep dive K1" | Q-DD-001 |
| "top kendaraan high potensi" | Q-DD-003 |
| "data sanity check" | Q-VAL-001 |
| "ringkasan dashboard" | Q-ROLLUP-001 |

---

## 12. Parameter Substitution

Beberapa golden queries punya parameter (e.g., segmen filter). Galen substitute via simple template:

```python
# Pseudocode
query = golden_queries["Q-DD-001"]
if user_intent.segmen_filter:
    query = query.replace("'K1'", f"'{user_intent.segmen_filter}'")
```

For SQL injection safety, use parameterized queries via PostgREST RPC layer (not raw substitution).

---

## 13. Maintenance

When to add a new golden query:
- L5 surfaces 3+ user queries with same intent.
- Pilot lead identifies a critical path query missing.
- Validation reveals a useful health check.

When to deprecate:
- Schema change makes query invalid.
- Better/cleaner version exists.

Mark deprecated as `**DEPRECATED 2026-XX-XX:**` in description, but keep in file untuk audit trail.

---

## 14. How Galen Uses L6

1. **Query intent classification** → match to L6 query ID.
2. **Execute via Supabase PostgREST RPC** → return result.
3. **Surface trust level** in response: "Saya pakai golden query Q-DIST-001 (VERIFIED)..."
4. **Fallback to auto-gen** only if no L6 match → flag low confidence.
5. **Suggest L6 promotion** if user query is novel + reusable.
