# swdkllj_recovery_share

**Type:** metric  
**Layer:** L2  
**Table:** ``  
**Column:** ``

## Description
SWDKLLJ sebagai % dari PKB realized (benchmark vs nasional 15-25%).

## Formula
```
SUM(pokok_swd) / SUM(pokok_pkb) × 100%
```

## Upstream
- `transaksi.pokok_swd`
- `transaksi.pokok_pkb`

## Downstream
—

## Governance
derived_runtime

## Edge cases
- SUM(pokok_pkb)=0 → return NULL
