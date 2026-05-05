# Q-REV-002 — Expected recovery konservatif per segmen

**Trust level:** VERIFIED  
**Category:** REV

## SQL

```sql
WITH rev AS (
    SELECT
        re.segmen_kepatuhan,
        SUM(re.est_pkb_per_kendaraan) AS total_potensi
    FROM gold.registry_enriched re
    GROUP BY re.segmen_kepatuhan
)
SELECT
    rev.segmen_kepatuhan AS segmen,
    rev.total_potensi,
    tr.perkiraan_konversi,
    rev.total_potensi * (
        CAST(SPLIT_PART(REPLACE(tr.perkiraan_konversi, '%', ''), '-', 1) AS NUMERIC) / 100.0
    ) AS expected_recovery_konservatif
FROM rev
LEFT JOIN ref.treatment_rules tr ON rev.segmen_kepatuhan = tr.segmen
ORDER BY expected_recovery_konservatif DESC;
```
