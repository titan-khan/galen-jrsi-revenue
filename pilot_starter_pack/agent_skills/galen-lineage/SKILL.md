---
name: galen-lineage
description: Trace data lineage between raw columns, derived columns, and metrics for the JR PKB pilot. Load when answering 'where does X come from' / dependency / impact-analysis questions.
---

# Galen Formula Lineage (L3)

Data lineage graph of 34 nodes connecting raw columns → derived columns → metrics. Use this skill when you need to trace where a metric or column comes from, find upstream dependencies, or document the governance / edge cases of a derivation.

Each node file lists upstream + downstream connections, the formula (if applicable), and known edge cases.

## Nodes
- [`sd_notice`](nodes/sd_notice.md) — Tanggal notice/jatuh tempo terakhir SD (Surat Denda).
- [`reference_date`](nodes/reference_date.md) — Cutoff date untuk semua perhitungan durasi. Per business assumption.
- [`thn_buat`](nodes/thn_buat.md) — Tahun pembuatan kendaraan.
- [`nopol`](nodes/nopol.md) — Nomor polisi kendaraan (PK).
- [`telp_pemilik`](nodes/telp_pemilik.md) — Nomor telepon rumah/utama pemilik.
- [`hp_pemilik`](nodes/hp_pemilik.md) — Nomor handphone pemilik.
- [`transaksi.pokok_pkb`](nodes/transaksi.pokok_pkb.md) — Nominal pokok PKB per transaksi (IDR).
- [`transaksi.pokok_swd`](nodes/transaksi.pokok_swd.md) — Nominal pokok SWDKLLJ per transaksi (IDR).
- [`transaksi.denda_swd`](nodes/transaksi.denda_swd.md) — Denda SWDKLLJ aktual yang sudah dikenakan.
- [`transaksi.kode_jenken`](nodes/transaksi.kode_jenken.md) — Kode jenis kendaraan (FK ke ref.dim_jenken).
- [`transaksi.tahun_pajak`](nodes/transaksi.tahun_pajak.md) — Tahun pajak transaksi.
- [`transaksi.tgl_lahir`](nodes/transaksi.tgl_lahir.md) — Tanggal lahir pemilik (dari KTP).
- [`durasi_tunggakan_days`](nodes/durasi_tunggakan_days.md) — Berapa hari kendaraan menunggak sejak notice terakhir.
- [`usia_kendaraan`](nodes/usia_kendaraan.md) — Usia kendaraan dalam tahun.
- [`usia_kendaraan_band`](nodes/usia_kendaraan_band.md) — Band usia kendaraan untuk klasifikasi S1/S2.
- [`has_payment_history`](nodes/has_payment_history.md) — Pernah ada transaksi pembayaran PKB di history?
- [`segmen_kepatuhan`](nodes/segmen_kepatuhan.md) — Segmen kepatuhan PKB per framework v1.4.
- [`recommended_treatment`](nodes/recommended_treatment.md) — Treatment strategy yang direkomendasikan untuk segmen ini (denormalized di regis
- [`has_phone`](nodes/has_phone.md) — Pemilik bisa dihubungi via telp atau HP?
- [`usia_pemilik_estimated`](nodes/usia_pemilik_estimated.md) — Estimasi usia pemilik di reference_date.
- [`dim_jenken.est_pkb_per_kendaraan`](nodes/dim_jenken.est_pkb_per_kendaraan.md) — Median PKB per kode_jenken berdasarkan history 3 tahun terakhir.
- [`dim_jenken.est_swd_per_kendaraan`](nodes/dim_jenken.est_swd_per_kendaraan.md) — Median SWDKLLJ per kode_jenken.
- [`segmen_distribution`](nodes/segmen_distribution.md) — Distribusi jumlah kendaraan per segmen.
- [`arrears_rate`](nodes/arrears_rate.md) — % kendaraan yang menunggak (durasi > 0).
- [`phone_coverage_pct`](nodes/phone_coverage_pct.md) — % kendaraan yang punya phone di setiap segmen.
- [`motor_share_pct`](nodes/motor_share_pct.md) — % kendaraan yang motor (R2) vs mobil (R4).
- [`total_potensi_pkb`](nodes/total_potensi_pkb.md) — Total estimasi potensi PKB yang bisa direalisasikan.
- [`rata_pkb_per_kendaraan`](nodes/rata_pkb_per_kendaraan.md) — Rata-rata potensi PKB per kendaraan.
- [`expected_recovery_konservatif`](nodes/expected_recovery_konservatif.md) — Estimasi konservatif PKB yang bisa di-recover (lower bound dari range konversi).
- [`swdkllj_total_realized`](nodes/swdkllj_total_realized.md) — Total SWDKLLJ realized di tahun referensi.
- [`swdkllj_recovery_share`](nodes/swdkllj_recovery_share.md) — SWDKLLJ sebagai % dari PKB realized (benchmark vs nasional 15-25%).
- [`denda_swdkllj_total`](nodes/denda_swdkllj_total.md) — Total denda SWDKLLJ aktual.
- [`denda_pkb_estimated`](nodes/denda_pkb_estimated.md) — Estimasi denda PKB (capped at 48% per regulasi).
- [`kanal_utama_actual`](nodes/kanal_utama_actual.md) — Kanal komunikasi setelah feasibility check terhadap contactability.
