# arrears_rate

**Type:** metric  
**Layer:** L2  
**Table:** ``  
**Column:** ``

## Description
% kendaraan yang menunggak (durasi > 0).

## Formula
```
COUNT(*) WHERE durasi_tunggakan_days > 0 / COUNT(*) × 100%
```

## Upstream
- `durasi_tunggakan_days`

## Downstream
—

## Governance
derived_runtime
