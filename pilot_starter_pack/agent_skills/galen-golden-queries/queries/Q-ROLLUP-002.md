# Q-ROLLUP-002 — Wilayah/typology rollup

**Trust level:** REVIEWED  
**Category:** ROLLUP

## SQL

```sql
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
```
