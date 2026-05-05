# dim_jenken.est_swd_per_kendaraan

**Type:** aggregate  
**Layer:** ref  
**Table:** ``  
**Column:** ``

## Description
Median SWDKLLJ per kode_jenken.

## Formula
```
MEDIAN(pokok_swd) GROUP BY kode_jenken WHERE tahun_pajak >= reference_year - 3
```

## Upstream
- `transaksi.pokok_swd`
- `transaksi.kode_jenken`
- `transaksi.tahun_pajak`

## Downstream
- `registry_enriched.est_swd_per_kendaraan`

## Governance
derived_runtime
