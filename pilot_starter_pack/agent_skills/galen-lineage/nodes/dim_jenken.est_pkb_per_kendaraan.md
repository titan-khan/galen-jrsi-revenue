# dim_jenken.est_pkb_per_kendaraan

**Type:** aggregate  
**Layer:** ref  
**Table:** ``  
**Column:** ``

## Description
Median PKB per kode_jenken berdasarkan history 3 tahun terakhir.

## Formula
```
MEDIAN(pokok_pkb) GROUP BY kode_jenken WHERE tahun_pajak >= reference_year - 3
```

## Upstream
- `transaksi.pokok_pkb`
- `transaksi.kode_jenken`
- `transaksi.tahun_pajak`

## Downstream
- `registry_enriched.est_pkb_per_kendaraan`
- `total_potensi_pkb`

## Governance
derived_runtime

## Edge cases
- Kode_jenken hanya muncul di old data → fallback to all-time median, flag is_stale_estimate=TRUE
