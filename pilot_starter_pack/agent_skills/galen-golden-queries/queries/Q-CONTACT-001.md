# Q-CONTACT-001 — Phone coverage per segmen

**Trust level:** VERIFIED  
**Category:** CONTACT

## SQL

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
