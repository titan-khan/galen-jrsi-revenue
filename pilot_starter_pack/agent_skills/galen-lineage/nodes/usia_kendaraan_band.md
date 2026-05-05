# usia_kendaraan_band

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Band usia kendaraan untuk klasifikasi S1/S2.

## Formula
```
CASE WHEN usia_kendaraan <= 15 THEN '<=15' WHEN usia_kendaraan > 15 THEN '>15' ELSE NULL END
```

## Upstream
- `usia_kendaraan`

## Downstream
- `segmen_kepatuhan`

## Governance
framework_v1.4
