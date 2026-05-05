# has_phone

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Pemilik bisa dihubungi via telp atau HP?

## Formula
```
(telp_pemilik IS NOT NULL AND LENGTH(telp_pemilik) >= 8) OR (hp_pemilik IS NOT NULL AND LENGTH(hp_pemilik) >= 8)
```

## Upstream
- `telp_pemilik`
- `hp_pemilik`

## Downstream
- `phone_coverage_pct`
- `kanal_utama_actual`

## Governance
derived_runtime

## Edge cases
- String with non-numeric chars → currently passes if length OK (TODO: digit validation)
- Country code prefix (+62...) → length still passes
