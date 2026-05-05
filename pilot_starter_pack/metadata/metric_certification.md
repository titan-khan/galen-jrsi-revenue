# Metric Certification Document

**Project:** JR PKB Pilot — Palangka Raya, Kalimantan Tengah
**Schema:** `meta.metric_certification`
**Version:** 1.1
**Effective date:** 2026-05-05
**Total metrics defined:** 27

---

## 1. Purpose

Setiap metrik yang Galen laporkan harus **bersertifikat** — didefinisikan formal dengan formula, sumber, governance, bukti validasi, dan confidence score. Hal ini mencegah Galen mengarang metrik atau memberikan angka yang ambigu.

---

## 2. Naming Convention

Setiap metrik punya 3 identifier:

| Field | Format | Contoh | Kegunaan |
|---|---|---|---|
| `metric_id` | `M-{DOMAIN}-{SEQ}` | `M-COMPL-001` | Technical reference, audit trail |
| `metric_name` | Bahasa Indonesia, proper case | `Distribusi Kendaraan per Segmen` | Display di dashboard, chat output |
| `metric_slug` | snake_case | `distribusi_kendaraan_per_segmen` | Code reference, SQL alias |

Galen selalu pakai `metric_name` saat berkomunikasi dengan user. Internal SQL dan kode pakai `metric_slug`.

---

## 3. Domain Code

| Domain prefix | Domain Name |
|---|---|
| M-COMPL | Kepatuhan |
| M-REV   | Pendapatan PKB |
| M-SWD   | SWDKLLJ |
| M-TREAT | Penanganan |
| M-DEMO  | Demografi & Kendaraan |
| M-OPS   | Operasional Kampanye |

---

## 4. Certification Levels

| Level | Kriteria | Galen behavior |
|---|---|---|
| **Bronze** | Formula didokumentasikan, source columns teridentifikasi | "Estimasi awal, perlu validasi" |
| **Silver** | Bronze + ter-validasi vs framework atau peer source | Pakai dengan confidence reasonable |
| **Gold** | Silver + di-validasi manual, di-sign-off domain expert + di-review dalam 90 hari | Confidence tinggi, primary metric untuk executive reporting |

---

## 5. Master Metric Catalog (27 Metrik)

### Domain: KEPATUHAN (8 metrik)

#### M-COMPL-001 — Distribusi Kendaraan per Segmen
- **Slug:** `distribusi_kendaraan_per_segmen`
- **Tipe:** count
- **Formula:** `COUNT(*) FROM gold.registry_enriched GROUP BY segmen_kepatuhan`
- **Unit:** kendaraan
- **Granularity:** per_segmen
- **Source tables:** gold.registry_enriched
- **Source columns:** segmen_kepatuhan
- **Governance:** framework_v1.4
- **Valid range:** 0 — 500.000
- **Cert level:** GOLD
- **Confidence:** 0.98
- **Validation:** Cocok dengan PKB Micro Segmentation v1.4 Sheet 2, match 99%
- **Notes:** Termasuk bucket 'unclassified'; M2/S2 boundary dapat bergeser ~1% (L4-SEGMEN-001)

#### M-COMPL-002 — Tingkat Tunggakan Keseluruhan
- **Slug:** `tingkat_tunggakan_keseluruhan`
- **Tipe:** percentage
- **Formula:** `100.0 * SUM(CASE WHEN durasi_tunggakan_days > 0 THEN 1 ELSE 0 END) / COUNT(*)`
- **Unit:** %
- **Granularity:** keseluruhan
- **Source tables:** gold.registry_enriched
- **Source columns:** durasi_tunggakan_days
- **Governance:** derived_runtime
- **Valid range:** 0 — 100
- **Cert level:** GOLD
- **Confidence:** 0.95
- **Validation:** Cross-check dengan Sheet 2 (ekspektasi ~60-65%)
- **Edge cases:** Sensitif terhadap reference_date ±30 hari (L4-METRIC-003)

#### M-COMPL-003 — Tingkat Tunggakan per Segmen
- **Slug:** `tingkat_tunggakan_per_segmen`
- **Tipe:** percentage
- **Formula:** `100.0 * SUM(CASE WHEN durasi_tunggakan_days > 0 THEN 1 ELSE 0 END) / COUNT(*) GROUP BY segmen_kepatuhan`
- **Unit:** %
- **Granularity:** per_segmen
- **Source tables:** gold.registry_enriched
- **Source columns:** durasi_tunggakan_days, segmen_kepatuhan
- **Governance:** derived_runtime
- **Valid range:** 0 — 100
- **Cert level:** GOLD
- **Confidence:** 0.95
- **Validation:** H1 ekspektasi ~0%, K1-M2 ekspektasi 100%, S1/S2 N/A
- **Notes:** S1/S2 secara definisi tidak ada payment history, jadi tidak masuk perhitungan

#### M-COMPL-004 — Rata-rata Lama Tunggakan
- **Slug:** `rata_rata_lama_tunggakan`
- **Tipe:** duration (mean)
- **Formula:** `AVG(durasi_tunggakan_days) WHERE durasi_tunggakan_days > 0`
- **Unit:** hari
- **Granularity:** per_segmen | keseluruhan
- **Source tables:** gold.registry_enriched
- **Source columns:** durasi_tunggakan_days
- **Governance:** derived_runtime
- **Valid range:** 0 — 5.000
- **Cert level:** SILVER
- **Confidence:** 0.85
- **Validation:** Rata-rata per-segmen sesuai dengan boundary framework (K1 ~45 hari, O1 ~200 hari)
- **Edge cases:** Mean sensitif terhadap outlier; pertimbangkan median untuk reporting yang lebih robust

#### M-COMPL-005 — Tingkat Kepatuhan (H1)
- **Slug:** `tingkat_kepatuhan_h1`
- **Tipe:** percentage
- **Formula:** `100.0 * COUNT(*) FILTER (WHERE segmen_kepatuhan = 'H1') / COUNT(*)`
- **Unit:** %
- **Granularity:** keseluruhan
- **Source tables:** gold.registry_enriched
- **Source columns:** segmen_kepatuhan
- **Governance:** framework_v1.4
- **Valid range:** 0 — 100
- **Cert level:** GOLD
- **Confidence:** 0.97
- **Validation:** Sesuai framework v1.4 ekspektasi share H1 ~40%
- **Notes:** Snapshot semantic (L4-SEGMEN-002) — bukan "selalu taat"

#### M-COMPL-006 — Tingkat Data Tidak Terklasifikasi
- **Slug:** `tingkat_data_tidak_terklasifikasi`
- **Tipe:** percentage
- **Formula:** `100.0 * COUNT(*) FILTER (WHERE segmen_kepatuhan IS NULL OR segmen_kepatuhan = 'unclassified') / COUNT(*)`
- **Unit:** %
- **Granularity:** keseluruhan
- **Source tables:** gold.registry_enriched
- **Source columns:** segmen_kepatuhan
- **Governance:** derived_runtime
- **Valid range:** 0 — 5
- **Cert level:** GOLD
- **Confidence:** 0.99
- **Validation:** Data pilot <0,1% unclassified — sehat
- **Notes:** Threshold: bila >2% → trigger data quality alert (L4-TREATMENT-004)

#### M-COMPL-007 — Pergerakan Segmen Bulanan
- **Slug:** `pergerakan_segmen_bulanan`
- **Tipe:** percentage
- **Formula:** `100.0 * COUNT(distinct nopol WHERE segmen_t != segmen_t_minus_1) / COUNT(distinct nopol)`
- **Unit:** %
- **Granularity:** keseluruhan
- **Source tables:** gold.registry_enriched (snapshot t), historical snapshot (t-1)
- **Source columns:** segmen_kepatuhan, nopol
- **Governance:** derived_runtime
- **Valid range:** 0 — 100
- **Cert level:** BRONZE
- **Confidence:** 0.50
- **Validation:** Pending: butuh 2+ snapshot (pilot one-shot, L4-PILOT-002)
- **Notes:** Operasional hanya post-pilot ketika monthly snapshot tersedia

#### M-COMPL-008 — Usia Data
- **Slug:** `usia_data`
- **Tipe:** duration
- **Formula:** `(CURRENT_DATE - reference_date)::INTEGER`
- **Unit:** hari
- **Granularity:** keseluruhan
- **Source tables:** (constant)
- **Source columns:** reference_date
- **Governance:** business_assumption
- **Valid range:** 0 — 365
- **Cert level:** GOLD
- **Confidence:** 1.00
- **Validation:** Trivial calculation
- **Notes:** Pilot reference_date = 2025-05-01; alert ketika >180 hari

---

### Domain: PENDAPATAN PKB (6 metrik)

#### M-REV-001 — Total Potensi PKB
- **Slug:** `total_potensi_pkb`
- **Tipe:** currency
- **Formula:** `SUM(est_pkb_per_kendaraan)`
- **Unit:** IDR
- **Granularity:** keseluruhan | per_segmen | per_wilayah
- **Source tables:** gold.registry_enriched, ref.dim_jenken
- **Source columns:** est_pkb_per_kendaraan, segmen_kepatuhan
- **Governance:** derived_runtime
- **Valid range:** 0 — 1.000.000.000.000
- **Cert level:** SILVER
- **Confidence:** 0.80
- **Validation:** Estimasi median-based (L4-METRIC-001), reconciliation vs SIPADU pending
- **Edge cases:** Distribusi right-skewed; median dipilih daripada mean untuk stabilitas

#### M-REV-002 — Rata-rata PKB per Kendaraan
- **Slug:** `rata_rata_pkb_per_kendaraan`
- **Tipe:** currency (mean)
- **Formula:** `AVG(est_pkb_per_kendaraan)`
- **Unit:** IDR
- **Granularity:** per_segmen
- **Source tables:** gold.registry_enriched
- **Source columns:** est_pkb_per_kendaraan
- **Governance:** derived_runtime
- **Valid range:** 0 — 50.000.000
- **Cert level:** SILVER
- **Confidence:** 0.80
- **Validation:** Rata-rata per-segmen dalam range yang masuk akal

#### M-REV-003 — Estimasi Penerimaan PKB (Konservatif)
- **Slug:** `estimasi_penerimaan_pkb_konservatif`
- **Tipe:** currency
- **Formula:** `total_potensi_pkb * konversi_lower_bound[segmen]` (konversi parsed dari `ref.treatment_rules.perkiraan_konversi`)
- **Unit:** IDR
- **Granularity:** per_segmen
- **Source tables:** gold.registry_enriched, ref.treatment_rules
- **Source columns:** est_pkb_per_kendaraan, perkiraan_konversi
- **Upstream metrics:** M-REV-001
- **Governance:** framework_v1.4
- **Valid range:** 0 — 200.000.000.000
- **Cert level:** GOLD
- **Confidence:** 0.85
- **Validation:** Range konversi dari framework v1.4
- **Notes:** Lower-bound (12%) dipakai untuk reporting konservatif (L4-METRIC-002)

#### M-REV-004 — Estimasi Penerimaan PKB (Optimistis)
- **Slug:** `estimasi_penerimaan_pkb_optimistis`
- **Tipe:** currency
- **Formula:** `total_potensi_pkb * konversi_upper_bound[segmen]`
- **Unit:** IDR
- **Granularity:** per_segmen
- **Source tables:** gold.registry_enriched, ref.treatment_rules
- **Source columns:** est_pkb_per_kendaraan, perkiraan_konversi
- **Upstream metrics:** M-REV-001
- **Governance:** framework_v1.4
- **Valid range:** 0 — 300.000.000.000
- **Cert level:** SILVER
- **Confidence:** 0.75
- **Validation:** Upper bound (18%) mencerminkan performa kampanye historikal terbaik
- **Notes:** Pakai dengan hati-hati — ada risiko over-promising ke leadership

#### M-REV-005 — PKB Terealisasi
- **Slug:** `pkb_terealisasi`
- **Tipe:** currency
- **Formula:** `SUM(pokok_pkb) FROM gold.transaksi_fact WHERE tahun_pajak = reference_year`
- **Unit:** IDR
- **Granularity:** keseluruhan
- **Source tables:** gold.transaksi_fact
- **Source columns:** pokok_pkb, tahun_pajak
- **Governance:** raw_source
- **Valid range:** 0 — 1.000.000.000.000
- **Cert level:** BRONZE
- **Confidence:** 0.40
- **Validation:** transaksi_fact belum ter-populate (L4-DATA-005)
- **Notes:** Akan naik ke GOLD ketika data transaksi di-ingest

#### M-REV-006 — Tingkat Realisasi Penagihan
- **Slug:** `tingkat_realisasi_penagihan`
- **Tipe:** percentage
- **Formula:** `100.0 * pkb_terealisasi / total_potensi_pkb` (post-campaign)
- **Unit:** %
- **Granularity:** per_kampanye
- **Source tables:** gold.transaksi_fact, gold_plus.campaign_log (future)
- **Source columns:** pokok_pkb, est_pkb_per_kendaraan
- **Upstream metrics:** M-REV-001, M-REV-005
- **Governance:** derived_runtime
- **Valid range:** 0 — 100
- **Cert level:** BRONZE
- **Confidence:** 0.30
- **Validation:** Pending eksekusi kampanye + data transaksi
- **Notes:** Hanya bisa dihitung post-campaign; deliverable utama pilot

---

### Domain: SWDKLLJ (3 metrik)

#### M-SWD-001 — Total SWDKLLJ Terealisasi
- **Slug:** `total_swdkllj_terealisasi`
- **Tipe:** currency
- **Formula:** `SUM(pokok_swd) FROM gold.transaksi_fact WHERE tahun_pajak = reference_year`
- **Unit:** IDR
- **Granularity:** keseluruhan
- **Source tables:** gold.transaksi_fact
- **Source columns:** pokok_swd, tahun_pajak
- **Governance:** raw_source
- **Valid range:** 0 — 100.000.000.000
- **Cert level:** BRONZE
- **Confidence:** 0.40
- **Validation:** transaksi_fact pending populate
- **Notes:** Wajib (regulasi), tidak masuk amnesti (L4-REGULASI-002)

#### M-SWD-002 — Kontribusi SWDKLLJ terhadap PKB
- **Slug:** `kontribusi_swdkllj_terhadap_pkb`
- **Tipe:** percentage
- **Formula:** `100.0 * SUM(pokok_swd) / NULLIF(SUM(pokok_pkb), 0)`
- **Unit:** %
- **Granularity:** keseluruhan | per_tahun
- **Source tables:** gold.transaksi_fact
- **Source columns:** pokok_swd, pokok_pkb
- **Upstream metrics:** M-SWD-001, M-REV-005
- **Governance:** derived_runtime
- **Valid range:** 5 — 50
- **Cert level:** BRONZE
- **Confidence:** 0.40
- **Validation:** Benchmark nasional 15-25%; data pilot pending
- **Edge cases:** SUM(pokok_pkb)=0 → return NULL

#### M-SWD-003 — Total Denda SWDKLLJ
- **Slug:** `total_denda_swdkllj`
- **Tipe:** currency
- **Formula:** `SUM(denda_swd) FROM gold.transaksi_fact`
- **Unit:** IDR
- **Granularity:** keseluruhan | per_tahun
- **Source tables:** gold.transaksi_fact
- **Source columns:** denda_swd
- **Governance:** raw_source
- **Valid range:** 0 — 50.000.000.000
- **Cert level:** BRONZE
- **Confidence:** 0.40
- **Validation:** Pending data transaksi

---

### Domain: PENANGANAN (3 metrik)

#### M-TREAT-001 — Cakupan Nomor Telepon
- **Slug:** `cakupan_nomor_telepon`
- **Tipe:** percentage
- **Formula:** `100.0 * SUM(CASE WHEN has_phone THEN 1 ELSE 0 END) / COUNT(*)`
- **Unit:** %
- **Granularity:** keseluruhan | per_segmen
- **Source tables:** gold.registry_enriched
- **Source columns:** has_phone (derived dari telp_pemilik, hp_pemilik)
- **Governance:** derived_runtime
- **Valid range:** 0 — 100
- **Cert level:** SILVER
- **Confidence:** 0.85
- **Validation:** Match ±1% vs Sheet 2 reference
- **Edge cases:** Termasuk nomor invalid (L4-METRIC-004); WA delivery aktual biasanya 70-80% dari has_phone

#### M-TREAT-002 — Kelayakan Kanal Komunikasi
- **Slug:** `kelayakan_kanal_komunikasi`
- **Tipe:** percentage
- **Formula:** `100.0 * COUNT(*) WHERE kanal_utama_actual = kanal_utama / COUNT(*)`
- **Unit:** %
- **Granularity:** per_segmen
- **Source tables:** gold.registry_enriched
- **Source columns:** kanal_utama (default), kanal_utama_actual (post-feasibility check)
- **Upstream metrics:** M-TREAT-001
- **Governance:** derived_runtime
- **Valid range:** 0 — 100
- **Cert level:** SILVER
- **Confidence:** 0.80
- **Validation:** Cross-check kanal vs ketersediaan phone

#### M-TREAT-003 — Target Prioritas Quick Win
- **Slug:** `target_prioritas_quick_win`
- **Tipe:** count
- **Formula:** `COUNT(*) WHERE segmen_kepatuhan IN ('K1','O1') AND has_phone = TRUE AND est_pkb_per_kendaraan > median_pkb`
- **Unit:** kendaraan
- **Granularity:** keseluruhan
- **Source tables:** gold.registry_enriched
- **Source columns:** segmen_kepatuhan, has_phone, est_pkb_per_kendaraan
- **Governance:** derived_runtime
- **Valid range:** 0 — 50.000
- **Cert level:** GOLD
- **Confidence:** 0.90
- **Validation:** KPI utama pilot — langsung dipakai untuk targeting kampanye
- **Notes:** Quick wins = ROI tertinggi yang diharapkan untuk gelombang pertama

---

### Domain: DEMOGRAFI & KENDARAAN (4 metrik)

#### M-DEMO-001 — Proporsi Sepeda Motor
- **Slug:** `proporsi_sepeda_motor`
- **Tipe:** percentage
- **Formula:** `100.0 * COUNT(*) FILTER (WHERE dim_jenken.kategori = 'R2') / COUNT(*)`
- **Unit:** %
- **Granularity:** keseluruhan | per_segmen
- **Source tables:** gold.registry_enriched, ref.dim_jenken
- **Source columns:** kode_jenken (registry), kategori (dim_jenken)
- **Governance:** derived_runtime
- **Valid range:** 50 — 95
- **Cert level:** SILVER
- **Confidence:** 0.85
- **Validation:** Match profil transportasi Indonesia (~85% motor)
- **Notes:** 5 kode_jenken belum termapping (L4-DATA-001) bisa distort ~0,5%

#### M-DEMO-002 — Rata-rata Usia Kendaraan
- **Slug:** `rata_rata_usia_kendaraan`
- **Tipe:** duration (mean)
- **Formula:** `AVG(usia_kendaraan)`
- **Unit:** tahun
- **Granularity:** keseluruhan | per_segmen
- **Source tables:** gold.registry_enriched
- **Source columns:** usia_kendaraan (derived dari thn_buat)
- **Governance:** derived_runtime
- **Valid range:** 0 — 30
- **Cert level:** SILVER
- **Confidence:** 0.85
- **Validation:** Plausibility check passed
- **Edge cases:** Usia negatif dari data error → NULL

#### M-DEMO-003 — Rata-rata Usia Pemilik
- **Slug:** `rata_rata_usia_pemilik`
- **Tipe:** duration (mean)
- **Formula:** `AVG(usia_pemilik_estimated)`
- **Unit:** tahun
- **Granularity:** keseluruhan | per_segmen
- **Source tables:** gold.transaksi_fact (atau registry jika di-join)
- **Source columns:** tgl_lahir, reference_date
- **Governance:** derived_runtime
- **Valid range:** 17 — 80
- **Cert level:** BRONZE
- **Confidence:** 0.50
- **Validation:** Pending ketersediaan kolom tgl_lahir
- **Notes:** PII-derived; aggregate-only

#### M-DEMO-004 — Indeks Konsentrasi Wilayah
- **Slug:** `indeks_konsentrasi_wilayah`
- **Tipe:** ratio (HHI-like)
- **Formula:** `SUM((wilayah_share)^2) where wilayah_share = COUNT(*) per wilayah / total_count`
- **Unit:** indeks (0-1)
- **Granularity:** keseluruhan
- **Source tables:** gold.registry_enriched, ref.dim_wilayah
- **Source columns:** wilayah
- **Governance:** derived_runtime
- **Valid range:** 0,0001 — 1,0000
- **Cert level:** SILVER
- **Confidence:** 0.75
- **Validation:** HHI-based concentration; high value = terkonsentrasi, low = tersebar
- **Notes:** Untuk prioritisasi deployment field staff

---

### Domain: OPERASIONAL KAMPANYE (3 metrik)

#### M-OPS-001 — Jumlah Outreach Kampanye
- **Slug:** `jumlah_outreach_kampanye`
- **Tipe:** count
- **Formula:** `COUNT(*) FROM gold_plus.campaign_log WHERE attempted = TRUE` (future table)
- **Unit:** outreach
- **Granularity:** per_kampanye | per_segmen
- **Source tables:** gold_plus.campaign_log (BELUM DIBUAT)
- **Source columns:** TBD
- **Governance:** derived_runtime
- **Valid range:** 0 — 500.000
- **Cert level:** BRONZE
- **Confidence:** 0.00
- **Validation:** Pending campaign execution layer
- **Notes:** Operasional post-pilot ketika layer eksekusi ditambahkan

#### M-OPS-002 — Biaya per Rupiah Tertagih
- **Slug:** `biaya_per_rupiah_tertagih`
- **Tipe:** currency (ratio)
- **Formula:** `total_biaya_kampanye / pkb_terealisasi`
- **Unit:** IDR per IDR tertagih
- **Granularity:** per_kampanye
- **Source tables:** gold_plus.campaign_log, gold.transaksi_fact
- **Upstream metrics:** M-OPS-001, M-REV-005
- **Governance:** derived_runtime
- **Valid range:** 0,0001 — 0,5000
- **Cert level:** BRONZE
- **Confidence:** 0.00
- **Validation:** Pending eksekusi kampanye
- **Notes:** Target <Rp 0,05 per Rp 1 tertagih (cost ratio 5%)

#### M-OPS-003 — Lama Penyelesaian Kasus
- **Slug:** `lama_penyelesaian_kasus`
- **Tipe:** duration
- **Formula:** `AVG(date_resolved - date_first_outreach)`
- **Unit:** hari
- **Granularity:** per_segmen
- **Source tables:** gold_plus.campaign_log (future)
- **Governance:** derived_runtime
- **Valid range:** 1 — 180
- **Cert level:** BRONZE
- **Confidence:** 0.00
- **Validation:** Pending eksekusi kampanye

---

## 6. Certification Summary

| Domain | Total | Gold | Silver | Bronze |
|---|---|---|---|---|
| Kepatuhan | 8 | 5 | 1 | 2 |
| Pendapatan PKB | 6 | 1 | 2 | 3 |
| SWDKLLJ | 3 | 0 | 0 | 3 |
| Penanganan | 3 | 1 | 2 | 0 |
| Demografi & Kendaraan | 4 | 0 | 3 | 1 |
| Operasional Kampanye | 3 | 0 | 0 | 3 |
| **TOTAL** | **27** | **7** | **8** | **12** |

**Pilot-ready (Gold + Silver):** 15 metrik
**Pending data ingest (Bronze):** 12 metrik — sebagian besar tergantung data transaksi

---

## 7. Re-certification Schedule

| Cert level | Cadence review |
|---|---|
| Gold | Setiap 90 hari, atau saat ada revisi framework |
| Silver | Setiap 60 hari selama pilot |
| Bronze | Setiap 30 hari, atau saat blocking dependency unblocked |

---

## 8. Quick Reference: Display Names by Domain

### Kepatuhan
1. Distribusi Kendaraan per Segmen (M-COMPL-001) — GOLD
2. Tingkat Tunggakan Keseluruhan (M-COMPL-002) — GOLD
3. Tingkat Tunggakan per Segmen (M-COMPL-003) — GOLD
4. Rata-rata Lama Tunggakan (M-COMPL-004) — SILVER
5. Tingkat Kepatuhan (H1) (M-COMPL-005) — GOLD
6. Tingkat Data Tidak Terklasifikasi (M-COMPL-006) — GOLD
7. Pergerakan Segmen Bulanan (M-COMPL-007) — BRONZE
8. Usia Data (M-COMPL-008) — GOLD

### Pendapatan PKB
1. Total Potensi PKB (M-REV-001) — SILVER
2. Rata-rata PKB per Kendaraan (M-REV-002) — SILVER
3. Estimasi Penerimaan PKB (Konservatif) (M-REV-003) — GOLD
4. Estimasi Penerimaan PKB (Optimistis) (M-REV-004) — SILVER
5. PKB Terealisasi (M-REV-005) — BRONZE
6. Tingkat Realisasi Penagihan (M-REV-006) — BRONZE

### SWDKLLJ
1. Total SWDKLLJ Terealisasi (M-SWD-001) — BRONZE
2. Kontribusi SWDKLLJ terhadap PKB (M-SWD-002) — BRONZE
3. Total Denda SWDKLLJ (M-SWD-003) — BRONZE

### Penanganan
1. Cakupan Nomor Telepon (M-TREAT-001) — SILVER
2. Kelayakan Kanal Komunikasi (M-TREAT-002) — SILVER
3. Target Prioritas Quick Win (M-TREAT-003) — GOLD

### Demografi & Kendaraan
1. Proporsi Sepeda Motor (M-DEMO-001) — SILVER
2. Rata-rata Usia Kendaraan (M-DEMO-002) — SILVER
3. Rata-rata Usia Pemilik (M-DEMO-003) — BRONZE
4. Indeks Konsentrasi Wilayah (M-DEMO-004) — SILVER

### Operasional Kampanye
1. Jumlah Outreach Kampanye (M-OPS-001) — BRONZE
2. Biaya per Rupiah Tertagih (M-OPS-002) — BRONZE
3. Lama Penyelesaian Kasus (M-OPS-003) — BRONZE

---

## 9. Galen Confidence Surfacing

Saat Galen melaporkan nilai metrik, harus surface dalam format:

```
{nilai} {unit}
[Cert: {level}] (Confidence: {score})
```

**Contoh:**

> Total Potensi PKB di K1: Rp 17,4 miliar
> [Cert: SILVER] (Confidence: 0.80)
> Catatan: Estimasi median-based, ter-validasi vs framework v1.4.

> Estimasi Penerimaan PKB (Konservatif) K1: Rp 2,1 miliar
> [Cert: GOLD] (Confidence: 0.85)
> Catatan: Konversi lower-bound 12% dari historical benchmark framework v1.4.

> Total SWDKLLJ Terealisasi: data belum tersedia
> [Cert: BRONZE] (Confidence: 0.40)
> Catatan: gold.transaksi_fact belum ter-populate untuk pilot ini (L4-DATA-005).

---

## 10. Maintenance

Kapan tambah metrik baru:
- Field officer/PMO request KPI baru.
- L5 surface 3+ user query yang minta metrik sejenis.
- Revisi framework menambahkan measurement baru.

Kapan deprecate:
- Diganti oleh metrik yang lebih baik (set `superseded_by`).
- Source data permanently unavailable.
- Framework menghapus konsep.

Deprecation soft (keep row, set `deprecated = TRUE` + alasan).

---

## 11. References

- L1 Schema Metadata: `context_model/L1_schema_metadata.md`
- L2 Curated Definitions: `context_model/L2_curated_definitions.yaml`
- L3 Formula Lineage: `context_model/L3_formula_lineage.md`
- L4 Tribal Knowledge: `context_model/L4_tribal_knowledge.md`
- Framework: PKB Micro Segmentation v1.4
