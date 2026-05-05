# kanal_utama_actual

**Type:** decision  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Kanal komunikasi setelah feasibility check terhadap contactability.

## Formula
```
IF recommended_treatment.kanal_utama IN ('telp','wa') AND has_phone=FALSE THEN 'surat' ELSE recommended_treatment.kanal_utama END
```

## Upstream
- `recommended_treatment`
- `has_phone`

## Downstream
—

## Governance
derived_runtime
