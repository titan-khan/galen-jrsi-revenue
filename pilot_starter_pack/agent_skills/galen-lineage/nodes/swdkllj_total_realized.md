# swdkllj_total_realized

**Type:** metric  
**Layer:** L2  
**Table:** ``  
**Column:** ``

## Description
Total SWDKLLJ realized di tahun referensi.

## Formula
```
SUM(pokok_swd) WHERE tahun_pajak = reference_year
```

## Upstream
- `transaksi.pokok_swd`
- `transaksi.tahun_pajak`

## Downstream
—

## Governance
derived_runtime
