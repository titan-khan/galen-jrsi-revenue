# segmen_kepatuhan

**Type:** decision  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Segmen kepatuhan PKB per framework v1.4.

## Formula
```
Rule-based classifier (see classify_segment function in 11_load_pilot.py)
```

## Upstream
- `durasi_tunggakan_days`
- `has_payment_history`
- `usia_kendaraan_band`

## Downstream
- `recommended_treatment`
- `segmen_distribution`
- `arrears_rate`
- `kanal_utama_actual`

## Governance
framework_v1.4

## Edge cases
- M2/S2 boundary at usia=20 (3,780 rows reclassified vs reference distribution)
- If all upstream NULL → 'unclassified' (handle separately)
