# Q-VAL-001 — Sanity check row count

**Trust level:** VERIFIED  
**Category:** VAL

## SQL

```sql
SELECT
    COUNT(*) AS total_rows,
    CASE
        WHEN COUNT(*) BETWEEN 420000 AND 435000 THEN 'OK'
        ELSE 'MISMATCH (expected ~427,977)'
    END AS health
FROM gold.registry_enriched;
```
