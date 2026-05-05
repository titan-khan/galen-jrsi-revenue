# has_payment_history

**Type:** derived  
**Layer:** computed  
**Table:** ``  
**Column:** ``

## Description
Pernah ada transaksi pembayaran PKB di history?

## Formula
```
EXISTS (SELECT 1 FROM gold.transaksi_fact tf WHERE tf.nopol = re.nopol)
```

## Upstream
- `nopol`

## Downstream
- `segmen_kepatuhan`

## Governance
framework_v1.4

## Edge cases
- Multi-year history → still TRUE if ANY year has payment
- Different nopol but same pemilik → currently NOT joined (kendaraan-level only)
