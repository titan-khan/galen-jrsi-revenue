# Q-VAL-002 — Unclassified rows

**Trust level:** VERIFIED  
**Category:** VAL

## SQL

```sql
SELECT
    COUNT(*) AS unclassified_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM gold.registry_enriched), 4) AS pct
FROM gold.registry_enriched
WHERE segmen_kepatuhan IS NULL OR segmen_kepatuhan = 'unclassified';
```
