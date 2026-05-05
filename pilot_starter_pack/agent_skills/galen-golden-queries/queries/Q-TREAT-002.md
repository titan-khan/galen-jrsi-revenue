# Q-TREAT-002 — Treatment feasibility (kanal x phone availability)

**Trust level:** VERIFIED  
**Category:** TREAT

## SQL

```sql
SELECT
    re.segmen_kepatuhan,
    re.kanal_utama,
    SUM(CASE WHEN re.has_phone THEN 1 ELSE 0 END) AS reachable_via_phone,
    COUNT(*) AS total,
    ROUND(100.0 * SUM(CASE WHEN re.has_phone THEN 1 ELSE 0 END) / COUNT(*), 2) AS phone_coverage_pct
FROM gold.registry_enriched re
GROUP BY re.segmen_kepatuhan, re.kanal_utama
ORDER BY re.segmen_kepatuhan;
```
