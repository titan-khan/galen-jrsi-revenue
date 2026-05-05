# recommended_treatment

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Treatment strategy yang direkomendasikan untuk segmen ini (denormalized di registry_enriched).

## Formula
```
JOIN ref.treatment_rules ON segmen_kepatuhan = treatment_rules.segmen
```

## Upstream
- `segmen_kepatuhan`

## Downstream
- `expected_recovery_konservatif`
- `kanal_utama_actual`

## Governance
framework_v1.4
