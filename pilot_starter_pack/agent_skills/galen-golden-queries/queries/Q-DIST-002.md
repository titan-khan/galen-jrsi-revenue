# Q-DIST-002 — Distribusi motor vs mobil per segmen

**Trust level:** VERIFIED  
**Category:** DIST

## SQL

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
