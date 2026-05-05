# framework_v1.4_decision_rule — edge_case_classification

**Source:** `framework_v1.4_decision_rule`  
**Category:** `edge_case_classification`

---

Edge case dalam classification: kendaraan dengan tunggakan >5 tahun. Kalau usia kendaraan <20 tahun → tetap M2 (Tidak Patuh Kronis, kemungkinan kendaraan masih beroperasi). Kalau usia kendaraan ≥20 tahun → REKLASIFIKASI ke S2 (Kendaraan Hantu, kemungkinan sudah tidak ada fisik). Threshold ini diambil karena: kendaraan motor umumnya operasional 15-20 tahun, kendaraan mobil 20-25 tahun. Tunggakan >5 tahun pada kendaraan tua = signal kuat bahwa kendaraan sudah tidak digunakan/dibuang. Klasifikasi M2 untuk kendaraan tua = waste resource (kampanye kepada kendaraan tidak ada). Reklasifikasi ke S2 = treatment data cleanup yang tepat.
