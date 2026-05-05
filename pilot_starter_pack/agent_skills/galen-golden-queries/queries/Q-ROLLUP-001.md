# Q-ROLLUP-001 — Pilot dashboard one-shot summary

**Trust level:** VERIFIED  
**Category:** ROLLUP

## SQL

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
