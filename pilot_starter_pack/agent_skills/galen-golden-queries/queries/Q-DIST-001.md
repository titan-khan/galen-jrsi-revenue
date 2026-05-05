# Q-DIST-001 — Total kendaraan per segmen

**Trust level:** VERIFIED  
**Category:** DIST

## SQL

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
