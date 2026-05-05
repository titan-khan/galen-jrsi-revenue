# L4 — Tribal Knowledge

**Layer:** L4 (Six-Layer Context Model)
**Purpose:** Capture **business rationale, caveats, anti-patterns, and "why we chose X" decisions** yang tidak ada di kode atau di framework dokumen formal. Ini adalah pengetahuan yang biasanya hanya hidup di kepala domain expert.
**Format:** Markdown narrative, tagged & searchable
**Last updated:** 2026-05-05
**Audience:** Galen agent (RAG ingestion) + new pilot team members.

---

## 1. Why Tribal Knowledge Matters

Schema (L1), definitions (L2), dan lineage (L3) menjelaskan **WHAT** angka-angkanya. L4 menjelaskan **WHY** keputusan-keputusan itu diambil.

Tanpa L4, Galen sering jatuh ke 2 jebakan:
1. **False precision** — memberi angka yang technically benar tapi business-wrong.
2. **Naive recommendation** — menyarankan langkah yang melanggar konteks regulasi/operasional yang tidak tertulis.

L4 berisi rules of thumb, gotchas, sejarah pengambilan keputusan, dan anti-patterns.

---

## 2. Knowledge Categories

L4 di-organisir ke 7 kategori. Setiap entry punya:

- **ID** — `L4-{category}-{seq}` (e.g., `L4-SEGMEN-001`)
- **Title** — short rule statement
- **Body** — context + rationale
- **Tags** — for retrieval
- **Source** — siapa/dimana asal pengetahuan ini

Categories:
1. **SEGMEN** — Klasifikasi 7-segmen quirks
2. **TREATMENT** — Treatment selection caveats
3. **DATA** — Data quality issues observed
4. **REGULASI** — Regulatory constraints non-obvious
5. **OPS** — Operational realities
6. **METRIC** — Metric interpretation gotchas
7. **PILOT** — Pilot scope & assumptions

---

## 3. Category: SEGMEN (Klasifikasi 7-segmen)

### L4-SEGMEN-001 — M2/S2 boundary at usia 20 tahun is a soft rule
**Tags:** `segmen`, `boundary`, `framework_v1.4`

**Rule:** Untuk kendaraan dengan `durasi_tunggakan > 1825 hari` (5 tahun), framework v1.4 split jadi M2 (jika usia <20) atau S2 (jika usia ≥20).

**Why:** Logika business: kendaraan tua + nunggak lama → biasanya sudah hilang/di-stripped. Kendaraan <20 tahun masih likely physically exist + recoverable.

**Caveat:** Ini "soft rule" — di data observed, 3,780 rows landed di M2/S2 boundary dengan classification yang sedikit beda dari Sheet 2 reference distribution. Difference karena edge case di handling NULL `thn_buat`.

**How to apply:** Galen jangan over-confident di angka per-row M2 vs S2. Boleh roll-up ke M+S group untuk total recovery estimation.

**Source:** Framework v1.4 Sheet "Segmentasi Kepatuhan PKB" + verifikasi vs enriched_registry.csv 2026-05-04.

---

### L4-SEGMEN-002 — H1 ≠ "tidak menunggak forever"
**Tags:** `segmen`, `H1`, `interpretation`

**Rule:** Segmen H1 (taat) berarti `durasi_tunggakan_days <= 0` AT REFERENCE DATE (2025-05-01). Bukan "selalu taat".

**Why:** Snapshot semantic. Kendaraan yang baru bayar hari ini masuk H1, padahal mungkin selama 3 tahun sebelumnya nunggak.

**How to apply:** Kalau user tanya "berapa kendaraan yang taat sepanjang masa?", JANGAN langsung jawab pakai count(H1). Jelaskan bahwa H1 = taat per snapshot, dan compliance history butuh longitudinal join ke transaksi_fact.

**Source:** Discussion 2026-05-03 (clarification re: snapshot vs time-series semantics).

---

### L4-SEGMEN-003 — S1 dan S2 keduanya "tanpa history", bukan "tidak terdaftar"
**Tags:** `segmen`, `S1`, `S2`, `data_gap`

**Rule:** S1/S2 = kendaraan terdaftar di registry tapi `has_payment_history = FALSE` (pernah skip pembayaran sejak data dimulai).

**Why:** "Tidak terdaftar" itu berarti tidak ada di registry sama sekali, jadi otomatis tidak masuk segmen apapun. S1/S2 adalah kendaraan terdaftar + invisible di transaksi.

**Caveat:** Ada chance bahwa transaksi dataset incomplete (e.g., scope hanya 2020+). Kendaraan yang bayar 2018-2019 saja akan misclassified ke S1/S2.

**How to apply:** Galen perlu disclose "scope data transaksi" ketika menjelaskan S1/S2. Add transparency line: "estimasi berdasarkan history yang tersedia di sistem (X tahun terakhir)".

**Source:** Saptono & Khozen (2021) framework + business review.

---

### L4-SEGMEN-004 — K1 vs O1 split di 90 hari adalah operational, bukan regulatory
**Tags:** `segmen`, `K1`, `O1`, `boundary`

**Rule:** K1 (1-90 hari) vs O1 (91-365 hari) split di 90 hari.

**Why:** 90 hari = soft cutoff dari best practice industry untuk "responsive collection" vs "structured collection". Bukan dari regulasi.

**Caveat:** Beberapa daerah Indonesia pakai 60 atau 120 hari. Framework v1.4 untuk Palangka Raya specifically. Jangan generalize ke daerah lain tanpa re-validation.

**Source:** Saptono & Khozen (2021) implementation note.

---

## 4. Category: TREATMENT (Treatment Selection Caveats)

### L4-TREATMENT-001 — "Kanal_utama" ≠ "Only kanal"
**Tags:** `treatment`, `channel`, `multi-touch`

**Rule:** Field `kanal_utama` adalah **primary** kanal, bukan exclusive.

**Why:** Real collection campaign biasanya multi-touch. Misalnya K1 primary = "WhatsApp blast" tapi follow-up bisa via SMS atau panggilan telepon.

**How to apply:** Ketika Galen kasih recommendation, frame sebagai "Mulai dengan kanal X, escalate ke Y kalau no-response". Jangan kesannya single-shot.

**Source:** Pilot operational discussion 2026-05-04.

---

### L4-TREATMENT-002 — Amnesti "active" tidak berarti auto-applied
**Tags:** `treatment`, `amnesti`, `regulasi`

**Rule:** `kebijakan_amnesti = "Aktif sampai 2025-12-31"` berarti policy is available, BUKAN bahwa setiap kendaraan auto-eligible.

**Why:** Amnesti biasanya butuh kondisi: pemilik aktif inisiasi, dokumen lengkap, bukti tidak fraudulent. Galen jangan mengiklankan amnesti sebagai "guaranteed waiver".

**How to apply:** Saat user tanya "kalau amnesti apakah denda hilang?", jawab dengan disclaimer: "Amnesti policy available for [segmen], tapi eligibility per kendaraan butuh verifikasi manual oleh staff."

**Source:** Regulasi Pemda + framework v1.4 amnesti rules.

---

### L4-TREATMENT-003 — "Perkiraan konversi" adalah HISTORICAL benchmark, bukan SLA
**Tags:** `treatment`, `konversi`, `benchmark`

**Rule:** Range "12-18%" untuk K1 berasal dari historical performance pilot test, bukan dari SLA atau target.

**Why:** Konversi bisa lebih tinggi atau rendah tergantung musim, kondisi ekonomi, kualitas kanal. Pilot ini sample dari Palangka Raya saja.

**How to apply:** Galen jangan menjamin "K1 akan konversi 12-18%". Frame sebagai "berdasarkan historical benchmark, K1 biasanya konversi 12-18%, tapi bervariasi per kampanye."

**Source:** Pilot historical results (small N, ~100 kendaraan).

---

### L4-TREATMENT-004 — Tidak ada treatment untuk "unclassified"
**Tags:** `treatment`, `unclassified`, `data_quality`

**Rule:** Jika segmen = NULL atau "unclassified", JANGAN apply treatment apapun.

**Why:** Data anomaly. Kemungkinan input data corrupt atau missing field critical.

**How to apply:** Galen harus surface ini sebagai "data quality issue" dan recommend manual review, bukan auto-treatment.

**Source:** Data quality review 2026-05-04.

---

## 5. Category: DATA (Data Quality Issues Observed)

### L4-DATA-001 — 5 extra kode_jenken di transaksi vs dim_jenken seed
**Tags:** `data_quality`, `kode_jenken`, `joins`

**Rule:** Ditemukan 5 `kode_jenken` value di transaksi yang tidak ada di seed `dim_jenken` table: A, D, E, plus anomaly di S.

**Impact:** Joins akan gagal untuk row-row dengan kode ini → estimasi PKB-nya akan NULL → segmen-level aggregate akan under-count.

**How to apply:** Sebelum jalan classification, run validation: `SELECT DISTINCT kode_jenken FROM transaksi WHERE kode_jenken NOT IN (SELECT kode_jenken FROM dim_jenken)`. Either add ke dim_jenken atau flag unresolved.

**Source:** Verifikasi enriched_registry.csv 2026-05-04.

---

### L4-DATA-002 — Phone column may have non-digit chars
**Tags:** `data_quality`, `phone`, `validation`

**Rule:** `telp_pemilik` dan `hp_pemilik` adalah string dan kadang berisi karakter selain digit (spasi, tanda baca, country code).

**Impact:** `LENGTH(telp) >= 8` validation pass-through anomaly: `"08-1234"` lulus tapi sebenarnya invalid.

**How to apply:** Untuk pilot, current validation OK (98%+ phone coverage match). Untuk production, perlu regex `^[0-9+]{8,}$`.

**Source:** Spot check 2026-05-04.

---

### L4-DATA-003 — Multi-pemilik per nopol possible (jarang tapi terjadi)
**Tags:** `data_quality`, `nopol`, `joins`

**Rule:** Ada kasus 1 nopol punya >1 pemilik di history (transfer kepemilikan).

**Impact:** `has_payment_history` join may overcount jika ada multiple ownership periods.

**How to apply:** Untuk pilot, abaikan (rare case, <0.5%). Document untuk production.

**Source:** Sample inspection.

---

### L4-DATA-004 — `tahun_pajak` di transaksi belum tentu = year of payment
**Tags:** `data_quality`, `tahun_pajak`, `temporal`

**Rule:** Kolom `tahun_pajak` di transaksi adalah tahun obligation (untuk pajak tahun X), BUKAN tanggal pembayaran aktual.

**Why:** Pemilik bisa bayar pajak tahun 2024 di tanggal 2025-03-15 (telat).

**How to apply:** Untuk metric "realized in year Y", pakai filter `tanggal_bayar` (kalau ada) atau dokumen sebagai "obligation realized for year Y" (semantic explicit).

**Source:** Domain knowledge transaksi pajak.

---

### L4-DATA-005 — Dataset transaksi belum kita ingest fully — pakai aggregate dari xlsx dictionary
**Tags:** `data_quality`, `pilot_scope`, `transaksi`

**Rule:** Untuk pilot ini, kita **belum** load full transaksi rows (hanya aggregate ke `dim_jenken.est_pkb_per_kendaraan`). `transaksi_fact` di gold schema seeded tapi belum populated.

**Impact:**
- `has_payment_history` di registry_enriched dihitung dari pre-aggregated lookup, BUKAN live join.
- Time-series queries (e.g., "month-over-month") tidak feasible sampai transaksi_fact populated.

**How to apply:** Galen, kalau user request time-series analysis, surface limitation explicitly: "Pilot ini belum include data transaksi level row. Saya bisa aggregasi, tapi tidak time-series."

**Source:** Pilot scope decision 2026-05-04.

---

## 6. Category: REGULASI (Regulatory Constraints)

### L4-REGULASI-001 — Denda PKB capped at 48%
**Tags:** `regulasi`, `denda_pkb`, `cap`

**Rule:** Per regulasi PKB, denda maksimum yang bisa di-charge adalah 48% dari pokok PKB (= 25% × 1.92 tahun).

**How to apply:** Formula `denda_pkb_estimated` di L3 sudah cap di 1.92 tahun. Galen jangan project denda lebih dari 48%.

**Source:** Peraturan Daerah PKB.

---

### L4-REGULASI-002 — SWDKLLJ wajib, tidak bisa amnesti
**Tags:** `regulasi`, `swdkllj`, `amnesti`

**Rule:** SWDKLLJ adalah dana wajib (Sumbangan Wajib Dana Kecelakaan Lalu Lintas Jalan) — tidak masuk dalam scope amnesti PKB.

**How to apply:** Jika user tanya tentang amnesti, clarify bahwa amnesti hanya untuk denda PKB (atau pokok dalam kasus tertentu), TIDAK menyentuh kewajiban SWDKLLJ.

**Source:** UU Lalu Lintas + framework v1.4.

---

### L4-REGULASI-003 — Data pribadi pemilik (NIK, alamat) tidak boleh muncul di output Galen
**Tags:** `regulasi`, `pdp`, `privacy`

**Rule:** Per UU PDP (Perlindungan Data Pribadi), Galen tidak boleh return raw NIK, alamat lengkap, atau tanggal lahir di chat output.

**How to apply:** Aggregate-only, atau partial masking (e.g., "alamat: Kel. X, Kec. Y, kota Z" tanpa nomor rumah).

**Source:** UU 27/2022 PDP + internal compliance review.

---

## 7. Category: OPS (Operational Realities)

### L4-OPS-001 — Surat fisik mahal, prioritaskan untuk M1+M2 saja
**Tags:** `ops`, `kanal_surat`, `cost`

**Rule:** Pengiriman surat fisik (~Rp 7,500/surat) adalah kanal paling mahal. Pilot mengarahkan surat hanya untuk M1, M2 (high-value, hard-to-reach).

**Why:** ROI calculation: untuk K1 dengan rata PKB Rp 500K, kalau konversi 12% → expected Rp 60K per attempt. Surat Rp 7.5K masih break-even, tapi WhatsApp Rp 200 lebih efisien.

**How to apply:** Galen jangan rekomendasikan surat untuk K1/H1.

**Source:** Pilot cost model.

---

### L4-OPS-002 — WhatsApp blast butuh nomor terdaftar Business API
**Tags:** `ops`, `kanal_wa`, `infra`

**Rule:** WhatsApp blast bukan dari nomor personal, harus via WA Business API (e.g., Twilio).

**Impact:** Setup time 2-4 minggu, biaya per-message sekitar Rp 200-400.

**How to apply:** Untuk pilot pertama, mungkin manual SMS/WA dari staff. Galen jangan over-promise "kirim 10K WA hari ini".

**Source:** Pilot infra discussion.

---

### L4-OPS-003 — Kunjungan lapangan butuh izin & koordinasi Polri
**Tags:** `ops`, `kanal_kunjungan`, `regulasi_ops`

**Rule:** Kunjungan ke alamat pemilik (untuk M2 atau S2) butuh koordinasi dengan kepolisian setempat untuk visit safety + dokumentasi.

**Impact:** Tidak bisa scale beyond ~50 kunjungan/minggu/petugas.

**How to apply:** Galen perlu surface capacity constraint kalau user ask "scale recovery campaign".

**Source:** Pilot ops planning.

---

### L4-OPS-004 — "Aksi_utama" text adalah saran, bukan SOP
**Tags:** `ops`, `aksi_utama`, `interpretation`

**Rule:** Field `aksi_utama` di registry_enriched adalah SUGGESTED action per framework v1.4. Bukan SOP wajib.

**Why:** Real campaign disesuaikan musiman (e.g., extension dekat hari libur). Staff lapangan punya discretion.

**How to apply:** Galen frame sebagai "rekomendasi default", invite user override jika ada konteks lokal.

**Source:** Framework v1.4 + ops feedback.

---

## 8. Category: METRIC (Metric Interpretation Gotchas)

### L4-METRIC-001 — `total_potensi_pkb` adalah ESTIMASI dari median, bukan sum aktual
**Tags:** `metric`, `total_potensi_pkb`, `estimate`

**Rule:** `total_potensi_pkb` di-derive dari `est_pkb_per_kendaraan` (median per kode_jenken) × count, BUKAN sum dari outstanding actual obligation.

**Why:** Pilot belum punya per-row obligation amount per registry. Median estimate adalah proxy.

**Caveat:** Bisa under/over-estimate by ~10-20% vs actual SIPADU (sistem pajak resmi).

**How to apply:** Galen frame sebagai "estimasi potensi (~Rp X miliar)". Jangan claim "Rp X miliar terutang exactly".

**Source:** Methodology decision pilot.

---

### L4-METRIC-002 — `expected_recovery_konservatif` pakai konversi LOWER bound
**Tags:** `metric`, `recovery`, `konservatif`

**Rule:** "Konservatif" berarti pakai ujung bawah dari range konversi (12-18% → pakai 12%).

**Why:** Buat planning realistic. Lebih baik over-deliver daripada over-promise ke management.

**How to apply:** Galen kalau user tanya "best case", terangkan ada `expected_recovery_optimistik` (TODO: belum di-implement, pakai 18%).

**Source:** PMO planning convention.

---

### L4-METRIC-003 — `arrears_rate` sensitive ke `reference_date` ± 30 hari
**Tags:** `metric`, `arrears_rate`, `temporal`

**Rule:** Karena banyak kendaraan yang baru bayar di akhir bulan, arrears_rate bisa swing ±2% jika reference_date geser ±30 hari.

**How to apply:** Galen jangan compare arrears rate dari 2 reference dates yang beda lebih dari 30 hari tanpa caveat.

**Source:** Sensitivity analysis 2026-05-04.

---

### L4-METRIC-004 — `phone_coverage_pct` includes invalid numbers
**Tags:** `metric`, `phone_coverage`, `data_quality`

**Rule:** Definisi `has_phone` cuma cek length≥8. Jadi "08abcdef" lulus.

**Impact:** Real WA-deliverable rate biasanya 70-80% dari `has_phone=TRUE`.

**How to apply:** Galen frame sebagai "indicative phone coverage", real deliverable rate butuh test campaign.

**Source:** Validation 2026-05-04.

---

## 9. Category: PILOT (Pilot Scope & Assumptions)

### L4-PILOT-001 — Pilot scope: Palangka Raya, Kalimantan Tengah, snapshot 2025-05-01
**Tags:** `pilot`, `scope`

**Rule:** Semua angka dan rekomendasi terikat pada data Palangka Raya per 2025-05-01.

**How to apply:** Galen jangan generalize ke daerah lain atau ke periode lain tanpa explicit caveat.

**Source:** Pilot kickoff.

---

### L4-PILOT-002 — Pilot one-shot, bukan production scale
**Tags:** `pilot`, `architecture`, `scope`

**Rule:** Architecture pilot: Python local processing → upload to Supabase → Galen serves. TIDAK ada Bronze/Silver layer, monitoring, RLS, atau scheduled refresh.

**How to apply:** Galen kalau user tanya "kapan refresh?", clarify bahwa data static dari one-shot upload.

**Source:** Pilot scope decision 2026-05-03.

---

### L4-PILOT-003 — Reference date hardcoded di loader
**Tags:** `pilot`, `reference_date`, `assumption`

**Rule:** `reference_date = '2025-05-01'` adalah constant di Python loader. Untuk re-run dengan date lain, harus update kode.

**How to apply:** Galen jangan compare across reference_dates dalam pilot ini (hanya 1 snapshot).

**Source:** 11_load_pilot.py L:55.

---

### L4-PILOT-004 — Galen agent boundary: hanya read, tidak write
**Tags:** `pilot`, `galen`, `permissions`

**Rule:** Galen hanya consume Supabase via read-only RPC. Tidak ada writeback ke DB.

**Why:** Pilot scope, juga safety (mencegah agent corrupt data).

**How to apply:** Galen kalau user request "update kolom X", politely decline + suggest manual update.

**Source:** Pilot architecture decision.

---

### L4-PILOT-005 — Bahasa: campur Bahasa Indonesia + English istilah teknis
**Tags:** `pilot`, `language`, `style`

**Rule:** User di pilot ini natural pakai Bahasa Indonesia dengan istilah teknis Inggris (e.g., "primary key", "join", "segmen"). Galen mirror style ini.

**How to apply:** Jangan over-formalize ke full English atau full BI. Mix is natural.

**Source:** Conversation history 2026-05-03 to 2026-05-05.

---

## 10. Anti-Patterns (Apa yang JANGAN Dilakukan)

### A1 — JANGAN compare arrears_rate antar daerah pakai threshold yang sama
Boundary segmen Palangka Raya specific. Daerah lain butuh re-calibration.

### A2 — JANGAN treat S1/S2 sebagai "lost cause"
S1/S2 punya recovery potential via outreach campaign baru (bukan continuation, tapi acquisition).

### A3 — JANGAN apply amnesti ke segmen H1
H1 sudah taat. Apply amnesti = revenue leak. Galen warn jika user request "kasih amnesti ke semua".

### A4 — JANGAN gunakan `count(*) = N` untuk validate dataset health
Use distribution comparison vs framework reference table (Sheet 2).

### A5 — JANGAN expose telp/hp di Galen output
Privasi. Mention "kendaraan reachable via phone" sufficient.

### A6 — JANGAN run loader 2x tanpa truncate registry_enriched
Akan duplikasi rows. Gunakan `--reset` flag atau manual TRUNCATE.

### A7 — JANGAN trust `tahun_pajak` sebagai date proxy
Ini tahun obligation, bukan tanggal pembayaran.

### A8 — JANGAN aggregate metric across `unclassified` rows
Akan distort segmen averages.

### A9 — JANGAN kasih konversi rate >18% ke K1 dalam projection
Lower bound 12% adalah safe, upper bound 18% sudah optimistik.

### A10 — JANGAN mix denda PKB dan denda SWDKLLJ tanpa label
Denda PKB di-estimate dari rule. Denda SWDKLLJ aktual dari kolom `denda_swd`. Beda governance.

---

## 11. Search Index for Galen RAG

Setiap entry di-index dengan tags. Contoh query routing:

| User asks | Retrieve entries |
|---|---|
| "Kenapa M2 dan S2 boundary di umur 20?" | L4-SEGMEN-001 |
| "Apakah amnesti otomatis?" | L4-TREATMENT-002, L4-REGULASI-002 |
| "Kenapa phone coverage 80% tapi WA delivery cuma 60%?" | L4-METRIC-004, L4-DATA-002 |
| "Kapan data ini di-refresh?" | L4-PILOT-002, L4-PILOT-003 |
| "Bisa apply amnesti ke H1?" | L4-TREATMENT-002, A3 |
| "Total recovery potensi berapa?" | L4-METRIC-001, L4-METRIC-002 |

---

## 12. Maintenance

L4 entries bersifat **append-only-with-deprecation**:

- New insight → add new entry dengan ID berurutan.
- Outdated entry → tandai `**DEPRECATED 2026-XX-XX:**` di awal body, jangan delete (preserve history).
- Major framework revision → archive seluruh L4 ke `L4_v1.md`, mulai L4 baru.

**Owner:** Pilot lead (data) + ops lead (operational rules).
**Review cadence:** Bi-weekly during pilot, monthly post-pilot.

---

## 13. How Galen Uses L4

1. **Top-K retrieval** — RAG query → top 3-5 L4 entries by tag + semantic match.
2. **Pre-answer disclaimers** — Surface relevant caveats sebelum menjawab.
3. **Reasoning trace** — Cite L4 entry ID di explanation (e.g., "Per L4-METRIC-001, total potensi adalah estimasi median-based").
4. **Anti-pattern guard** — Before generating recommendation, check apakah melanggar A1-A10. If yes, block + explain.
