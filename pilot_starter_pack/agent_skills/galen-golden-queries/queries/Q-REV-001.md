# Q-REV-001 — Total potensi PKB per segmen

**Trust level:** VERIFIED  
**Category:** REV

## SQL

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
