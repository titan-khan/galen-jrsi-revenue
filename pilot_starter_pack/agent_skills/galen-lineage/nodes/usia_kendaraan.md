# usia_kendaraan

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Usia kendaraan dalam tahun.

## Formula
```
EXTRACT(YEAR FROM reference_date) - thn_buat
```

## Upstream
- `thn_buat`
- `reference_date`

## Downstream
- `usia_kendaraan_band`
- `segmen_kepatuhan`

## Governance
derived_runtime

## Edge cases
- thn_buat IS NULL → usia=NULL
- thn_buat > reference_year → usia negative → set NULL
