# usia_pemilik_estimated

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Estimasi usia pemilik di reference_date.

## Formula
```
EXTRACT(YEAR FROM AGE(reference_date, tgl_lahir))
```

## Upstream
- `transaksi.tgl_lahir`
- `reference_date`

## Downstream
- `usia_pemilik_band`

## Governance
derived_runtime

## Edge cases
- tgl_lahir > reference_date → data error → NULL
- tgl_lahir IS NULL → propagate NULL
