# motor_share_pct

**Type:** metric  
**Layer:** L2  
**Table:** ``  
**Column:** ``

## Description
% kendaraan yang motor (R2) vs mobil (R4).

## Formula
```
COUNT(*) WHERE kode_jenken IN (motor codes) / COUNT(*) × 100%
```

## Upstream
- `transaksi.kode_jenken`

## Downstream
—

## Governance
derived_runtime
