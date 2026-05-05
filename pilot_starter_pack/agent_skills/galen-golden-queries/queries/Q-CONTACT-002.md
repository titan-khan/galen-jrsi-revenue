# Q-CONTACT-002 — Kendaraan unreachable (no phone, M1+M2 segmen)

**Trust level:** VERIFIED  
**Category:** CONTACT

## SQL

```sql
SELECT
    re.nopol,
    re.segmen_kepatuhan,
    re.kode_jenken,
    re.thn_buat,
    re.usia_kendaraan,
    re.est_pkb_per_kendaraan,
    re.kanal_utama AS kanal_default
FROM gold.registry_enriched re
WHERE re.segmen_kepatuhan IN ('M1', 'M2')
  AND re.has_phone = FALSE
ORDER BY re.est_pkb_per_kendaraan DESC
LIMIT 100;
```
