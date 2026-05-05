# durasi_tunggakan_days

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Berapa hari kendaraan menunggak sejak notice terakhir.

## Formula
```
(reference_date::date - sd_notice::date)
```

## Upstream
- `sd_notice`
- `reference_date`

## Downstream
- `segmen_kepatuhan`
- `arrears_rate`

## Governance
framework_v1.4

## Edge cases
- sd_notice IS NULL → days=NULL → masuk S-track
- sd_notice > reference_date → clamp to 0 → masuk H1 (taat)
- Negative days (data error) → clamp to 0
