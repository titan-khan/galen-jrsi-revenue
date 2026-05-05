# denda_pkb_estimated

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Estimasi denda PKB (capped at 48% per regulasi).

## Formula
```
pokok_pkb * 0.25 * LEAST(FLOOR(durasi_tunggakan_days / 365), 1.92)
```

## Upstream
- `transaksi.pokok_pkb`
- `durasi_tunggakan_days`

## Downstream
—

## Governance
framework_v1.4
