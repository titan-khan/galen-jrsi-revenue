# Q-DIST-003 — Usia kendaraan distribution per segmen

**Trust level:** VERIFIED  
**Category:** DIST

## SQL

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
