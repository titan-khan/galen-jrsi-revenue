# Q-VAL-003 — Kode_jenken yang missing dari dim_jenken (L4-DATA-001)

**Trust level:** VERIFIED  
**Category:** VAL

## SQL

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
