# total_potensi_pkb

**Type:** metric  
**Layer:** L2  
**Table:** ``  
**Column:** ``

## Description
Total estimasi potensi PKB yang bisa direalisasikan.

## Formula
```
SUM(est_pkb_per_kendaraan) GROUP BY scope
```

## Upstream
- `dim_jenken.est_pkb_per_kendaraan`
- `segmen_kepatuhan`

## Downstream
- `expected_recovery_konservatif`
- `rata_pkb_per_kendaraan`

## Governance
derived_runtime
