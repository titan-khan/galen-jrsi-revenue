# phone_coverage_pct

**Type:** metric  
**Layer:** L2  
**Table:** ``  
**Column:** ``

## Description
% kendaraan yang punya phone di setiap segmen.

## Formula
```
COUNT(*) WHERE has_phone=TRUE / COUNT(*) × 100% per segmen
```

## Upstream
- `has_phone`
- `segmen_kepatuhan`

## Downstream
- `kanal_utama_actual`

## Governance
derived_runtime
