# Q-VAL-004 — Distribusi vs framework reference (audit)

**Trust level:** VERIFIED  
**Category:** VAL

## SQL

```sql
WITH actual AS (
    SELECT segmen_kepatuhan, COUNT(*) AS actual_count
    FROM gold.registry_enriched
    GROUP BY segmen_kepatuhan
),
expected AS (
    SELECT 'H1' AS segmen, 175000 AS expected_count
    UNION ALL SELECT 'K1', 35000
    UNION ALL SELECT 'O1', 50000
    UNION ALL SELECT 'M1', 40000
    UNION ALL SELECT 'M2', 60000
    UNION ALL SELECT 'S1', 35000
    UNION ALL SELECT 'S2', 33000
)
SELECT
    e.segmen,
    e.expected_count,
    a.actual_count,
    a.actual_count - e.expected_count AS diff,
    ROUND(100.0 * (a.actual_count - e.expected_count) / e.expected_count, 2) AS diff_pct
FROM expected e
LEFT JOIN actual a ON e.segmen = a.segmen_kepatuhan
ORDER BY ABS(a.actual_count - e.expected_count) DESC;
```
