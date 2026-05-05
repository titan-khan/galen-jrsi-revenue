# Q-TREAT-001 — Treatment recommendation per segmen with sample count

**Trust level:** VERIFIED  
**Category:** TREAT

## SQL

```sql
SELECT
    tr.segmen,
    tr.kanal_utama,
    tr.kebijakan_amnesti,
    tr.aksi_utama,
    tr.perkiraan_konversi,
    COALESCE(re_count.jumlah, 0) AS jumlah_kendaraan
FROM ref.treatment_rules tr
LEFT JOIN (
    SELECT segmen_kepatuhan, COUNT(*) AS jumlah
    FROM gold.registry_enriched
    GROUP BY segmen_kepatuhan
) re_count ON tr.segmen = re_count.segmen_kepatuhan
ORDER BY
    CASE tr.segmen
        WHEN 'H1' THEN 1 WHEN 'K1' THEN 2 WHEN 'O1' THEN 3
        WHEN 'M1' THEN 4 WHEN 'M2' THEN 5 WHEN 'S1' THEN 6 WHEN 'S2' THEN 7
    END;
```
