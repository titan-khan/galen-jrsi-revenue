# Q-REV-003 — SWDKLLJ realized total + share

**Trust level:** REVIEWED  
**Category:** REV

## SQL

```sql
SELECT
    tahun_pajak,
    SUM(pokok_pkb) AS total_pkb,
    SUM(pokok_swd) AS total_swd,
    ROUND(100.0 * SUM(pokok_swd) / NULLIF(SUM(pokok_pkb), 0), 2) AS swd_share_pct
FROM gold.transaksi_fact
WHERE tahun_pajak >= EXTRACT(YEAR FROM CURRENT_DATE) - 3
GROUP BY tahun_pajak
ORDER BY tahun_pajak DESC;
```
