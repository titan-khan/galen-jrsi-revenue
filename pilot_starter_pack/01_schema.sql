-- =============================================================================
-- JR PILOT — PKB Micro-Segmentation Schema for Supabase
-- Based on PKB Micro Segmentation PalangkaRaya v1.4
-- Reference date for tunggakan calculation: 2025-05-01
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;       -- for Galen KB pgvector
CREATE EXTENSION IF NOT EXISTS pg_cron;      -- for scheduled MV refresh

-- 2. SCHEMAS
CREATE SCHEMA IF NOT EXISTS gold;
CREATE SCHEMA IF NOT EXISTS gold_plus;
CREATE SCHEMA IF NOT EXISTS ref;             -- reference / lookup tables
CREATE SCHEMA IF NOT EXISTS kb;              -- Galen knowledge base

-- =============================================================================
-- DIMENSION TABLES
-- =============================================================================

CREATE TABLE gold.dim_kabupaten (
  kabupaten_id     INT PRIMARY KEY,
  nama_kabupaten   TEXT NOT NULL UNIQUE,
  tipologi_wilayah TEXT NOT NULL CHECK (tipologi_wilayah IN ('Pusat Urban','Hub Industri','Wilayah Hinterland'))
);

CREATE TABLE gold.dim_upt (
  upt_id           INT PRIMARY KEY,
  upt_nama         TEXT NOT NULL,
  kabupaten_id     INT REFERENCES gold.dim_kabupaten(kabupaten_id)
);

CREATE TABLE gold.dim_jenken (
  kode_jenken      TEXT PRIMARY KEY,
  jenis_kendaraan  TEXT NOT NULL,
  is_motor         BOOLEAN NOT NULL,
  est_pkb_per_kendaraan NUMERIC(12,0)  -- from Sheet 7 — Segmen × Jenis Kendaraan
);

CREATE TABLE gold.dim_layanan (
  id_layanan       INT PRIMARY KEY,
  nama_layanan     TEXT NOT NULL
);

-- =============================================================================
-- FACT TABLES
-- =============================================================================

-- Registry fact — one row per registered vehicle
-- This is the PRIMARY table for segmentation
CREATE TABLE gold.registry_fact (
  vehicle_id       BIGINT PRIMARY KEY,
  nopol_masked     TEXT,
  kabupaten_id     INT REFERENCES gold.dim_kabupaten(kabupaten_id),
  upt_id           INT REFERENCES gold.dim_upt(upt_id),
  kode_jenken      TEXT REFERENCES gold.dim_jenken(kode_jenken),

  -- Source columns for segmentation
  sd_notice        DATE,                   -- tanggal jatuh tempo STNK
  tanggal_transaksi DATE,                  -- transaksi terakhir, NULL = belum pernah
  thn_buat         INT,                    -- tahun pembuatan kendaraan
  no_hp_masked     TEXT,                   -- untuk derive has_phone

  -- Source columns for context
  merek_kendaraan  TEXT,
  tipe             TEXT,
  bahan_bakar      TEXT,
  warna_plat       TEXT,
  kecamatan        TEXT,
  kelurahan        TEXT,

  -- Lineage
  loaded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_period    TEXT
);

CREATE INDEX idx_registry_kabupaten ON gold.registry_fact(kabupaten_id);
CREATE INDEX idx_registry_jenken    ON gold.registry_fact(kode_jenken);
CREATE INDEX idx_registry_sd_notice ON gold.registry_fact(sd_notice);

-- Transaksi fact — one row per payment transaction (for revenue modeling)
CREATE TABLE gold.transaksi_fact (
  transaksi_id     BIGINT PRIMARY KEY,
  paid_on          TIMESTAMPTZ NOT NULL,
  vehicle_bucket   TEXT,                   -- masked nopol bucket
  kabupaten_id     INT REFERENCES gold.dim_kabupaten(kabupaten_id),
  upt_id           INT REFERENCES gold.dim_upt(upt_id),
  kode_jenken      TEXT REFERENCES gold.dim_jenken(kode_jenken),
  id_layanan       INT REFERENCES gold.dim_layanan(id_layanan),

  pokok_pkb        NUMERIC(12,0),
  tunggakan_pokok_pkb NUMERIC(12,0),
  pokok_bbnkb      NUMERIC(12,0),
  pokok_swdkllj    NUMERIC(12,0),
  tunggakan_pokok_swdkllj NUMERIC(12,0),
  denda_swdkllj    NUMERIC(12,0),
  tunggakan_denda_swdkllj NUMERIC(12,0),
  total_amount     NUMERIC(12,0),

  loaded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transaksi_paid_on   ON gold.transaksi_fact(paid_on);
CREATE INDEX idx_transaksi_kabupaten ON gold.transaksi_fact(kabupaten_id);

-- =============================================================================
-- DERIVED VIEW — 7-SEGMENT CLASSIFICATION
-- This is the heart of the framework. Reference date: 2025-05-01
-- =============================================================================

CREATE OR REPLACE VIEW gold_plus.registry_segmented AS
WITH base AS (
  SELECT
    r.*,
    DATE '2025-05-01' AS reference_date,

    -- Derived attributes
    DATE '2025-05-01' - r.sd_notice AS durasi_tunggakan_days,
    (r.tanggal_transaksi IS NOT NULL) AS has_payment_history,
    EXTRACT(YEAR FROM DATE '2025-05-01')::INT - r.thn_buat AS usia_kendaraan,
    (r.no_hp_masked IS NOT NULL AND TRIM(r.no_hp_masked) <> '') AS has_phone

  FROM gold.registry_fact r
)
SELECT
  *,

  -- 7-Segment classification per framework v1.4
  CASE
    -- Out-of-pyramid: never transacted
    WHEN NOT has_payment_history AND usia_kendaraan <= 15 THEN 'S1'  -- Belum Terdaftar
    WHEN NOT has_payment_history AND usia_kendaraan > 15 THEN 'S2'   -- Kendaraan Hantu

    -- Pyramid base: still valid
    WHEN sd_notice IS NULL OR durasi_tunggakan_days <= 0 THEN 'H1'   -- Patuh Aktif

    -- In-pyramid: with payment history
    WHEN durasi_tunggakan_days BETWEEN 1 AND 90 THEN 'K1'            -- Baru Lewat Jatuh Tempo
    WHEN durasi_tunggakan_days BETWEEN 91 AND 365 THEN 'O1'          -- Mulai Mengabaikan
    WHEN durasi_tunggakan_days BETWEEN 366 AND 730 THEN 'M1'         -- Tidak Patuh Pasif
    WHEN durasi_tunggakan_days BETWEEN 731 AND 1825 THEN 'M2'        -- Tidak Patuh Kronis (2-5 thn)
    WHEN durasi_tunggakan_days > 1825 AND usia_kendaraan < 20 THEN 'M2'    -- M2 alt: >5 thn tapi kendaraan <20 thn
    WHEN durasi_tunggakan_days > 1825 AND usia_kendaraan >= 20 THEN 'S2'   -- Reklasifikasi ke hantu

    ELSE 'unclassified'
  END AS segmen_kepatuhan
FROM base;

-- =============================================================================
-- MATERIALIZED VIEWS (Pre-aggregates per segmen)
-- =============================================================================

-- Aggregate per segmen × kabupaten
CREATE MATERIALIZED VIEW gold_plus.agg_segmen_kabupaten AS
SELECT
  r.segmen_kepatuhan,
  k.tipologi_wilayah,
  k.nama_kabupaten,
  COUNT(*) AS n_kendaraan,
  SUM(CASE WHEN j.is_motor THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS pct_motor,
  SUM(CASE WHEN r.has_phone THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS pct_punya_hp,
  AVG(j.est_pkb_per_kendaraan)::NUMERIC(12,0) AS rata_pkb_per_kendaraan,
  SUM(j.est_pkb_per_kendaraan)::NUMERIC(14,0) AS total_potensi_pkb,
  AVG(GREATEST(r.durasi_tunggakan_days, 0))::INT AS rata_hari_tunggakan
FROM gold_plus.registry_segmented r
JOIN gold.dim_kabupaten k ON r.kabupaten_id = k.kabupaten_id
LEFT JOIN gold.dim_jenken j ON r.kode_jenken = j.kode_jenken
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX idx_agg_segmen_kab ON gold_plus.agg_segmen_kabupaten(segmen_kepatuhan, nama_kabupaten);

-- Aggregate per segmen × jenis kendaraan
CREATE MATERIALIZED VIEW gold_plus.agg_segmen_jenken AS
SELECT
  r.segmen_kepatuhan,
  j.jenis_kendaraan,
  j.kode_jenken,
  COUNT(*) AS jumlah,
  AVG(j.est_pkb_per_kendaraan)::NUMERIC(12,0) AS est_pkb_per_kendaraan,
  SUM(CASE WHEN r.has_phone THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS pct_punya_hp,
  AVG(r.usia_kendaraan)::FLOAT AS rata_usia,
  COUNT(*)::FLOAT / SUM(COUNT(*)) OVER (PARTITION BY r.segmen_kepatuhan) AS pct_volume
FROM gold_plus.registry_segmented r
LEFT JOIN gold.dim_jenken j ON r.kode_jenken = j.kode_jenken
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX idx_agg_segmen_jen ON gold_plus.agg_segmen_jenken(segmen_kepatuhan, kode_jenken);

-- =============================================================================
-- REFERENCE TABLES (Program SADAR + Treatment + RACI)
-- =============================================================================

-- 7 Segments definitions (from framework v1.4)
CREATE TABLE ref.segmen (
  kode             TEXT PRIMARY KEY,
  nama             TEXT NOT NULL,
  warna            TEXT NOT NULL,
  kelas_pyramid    TEXT NOT NULL,           -- 'Basis Patuh', 'Goyah', 'Tidak Mau Pasif', 'Tidak Mau Mengakar', 'Luar Pyramid'
  durasi_tunggakan TEXT NOT NULL,
  profil_perilaku  TEXT NOT NULL,
  posisi_pyramid_djp TEXT NOT NULL
);

INSERT INTO ref.segmen (kode, nama, warna, kelas_pyramid, durasi_tunggakan, profil_perilaku, posisi_pyramid_djp) VALUES
('H1', 'Patuh Aktif',           'HIJAU',  'Basis Patuh',         'Belum jatuh tempo',
 'Wajib pajak yang disiplin. Membayar sebelum atau pada saat jatuh tempo.',
 'Basis pyramid — mau dan mampu. Intervensi: menjaga kepatuhan.'),

('K1', 'Baru Lewat Jatuh Tempo','KUNING', 'Goyah Awal',          '1-90 hari',
 'Lupa atau sibuk. Niat membayar masih ada. Akumulasi denda kecil.',
 'Peralihan dari patuh ke goyah. Pengingat ringan cukup.'),

('O1', 'Mulai Mengabaikan',     'ORANYE', 'Goyah Lanjut',        '91-365 hari',
 'Mulai lalai. Pajak tergeser dari prioritas. Denda mulai memberatkan.',
 'Goyah menuju tidak mau. Friksi perlu dikurangi nyata.'),

('M1', 'Tidak Patuh Pasif',     'MERAH',  'Tidak Mau Pasif',     '1-2 tahun',
 'Pasif tidak membayar. Akumulasi denda menjadi penghalang nyata.',
 'Tidak mau pasif. Amnesti parsial dipertimbangkan.'),

('M2', 'Tidak Patuh Kronis',    'MERAH',  'Tidak Mau Mengakar',  '2-5+ tahun',
 'Ketidakpatuhan mengakar. Denda 2-4× pokok. Tanpa intervensi mendasar tidak akan kembali.',
 'Tidak mau mengakar. Amnesti penuh denda diperlukan.'),

('S1', 'Belum Terdaftar',       'ABU',    'Luar Pyramid',        'Tidak pernah membayar (≤15 thn)',
 'Pembelian tangan kedua tanpa balik nama. 97.5% motor. Hanya 2% punya HP.',
 'Belum pernah masuk sistem. Penghalang: BBNKB, bukan denda.'),

('S2', 'Kendaraan Hantu',       'ABU',    'Luar Pyramid',        'Tidak pernah membayar (>15 thn) atau >5 thn tunggakan + >20 thn usia',
 'Diasumsikan tidak ada secara fisik. Hanya 19% punya HP.',
 'Bukan target kampanye. Verifikasi registrasi dan pembersihan data.');

-- Treatment lookup per segmen
CREATE TABLE ref.treatment_lookup (
  segmen_kode      TEXT PRIMARY KEY REFERENCES ref.segmen(kode),
  tujuan_strategis TEXT NOT NULL,
  kanal_utama      TEXT NOT NULL,
  pesan_personalisasi TEXT NOT NULL,
  kebijakan_amnesti TEXT NOT NULL,
  aksi_utama       TEXT NOT NULL,
  perkiraan_konversi TEXT NOT NULL
);

-- (Inserted in 02_reference_data.sql)

-- 9 Program SADAR
CREATE TABLE ref.program_sadar (
  program_id       SERIAL PRIMARY KEY,
  nama             TEXT NOT NULL,
  deskripsi        TEXT NOT NULL,
  segmen_sasaran   TEXT[] NOT NULL,           -- array of segmen codes
  pemangku_kepentingan TEXT[] NOT NULL,       -- array of stakeholder names
  tipologi_wilayah TEXT[] NOT NULL
);

-- RACI per aksi kunci
CREATE TABLE ref.raci_matrix (
  raci_id          SERIAL PRIMARY KEY,
  segmen_kode      TEXT REFERENCES ref.segmen(kode),
  aksi_kunci       TEXT NOT NULL,
  jasa_raharja     TEXT CHECK (jasa_raharja IN ('R','A','C','I',NULL)),
  bapenda          TEXT CHECK (bapenda IN ('R','A','C','I',NULL)),
  samsat           TEXT CHECK (samsat IN ('R','A','C','I',NULL)),
  polri            TEXT CHECK (polri IN ('R','A','C','I',NULL)),
  kelurahan        TEXT CHECK (kelurahan IN ('R','A','C','I',NULL)),
  vendor_ti        TEXT CHECK (vendor_ti IN ('R','A','C','I',NULL))
);

-- Revenue projection scenarios (from Sheet 6)
CREATE TABLE ref.revenue_scenario (
  scenario_id      SERIAL PRIMARY KEY,
  segmen_kode      TEXT REFERENCES ref.segmen(kode),
  konversi_pct     NUMERIC(4,2) NOT NULL,
  est_pendapatan_idr NUMERIC(14,0) NOT NULL,
  scenario_label   TEXT NOT NULL              -- 'Konservatif', 'Moderat', 'Optimis'
);

-- Recommended conservative scenario per Sheet 6:
-- K1: 60% conv → Rp 10.8 M
-- O1: 35% conv → Rp 5.0 M
-- M1: 25% conv → Rp 2.4 M
-- M2: 15% conv → Rp 5.1 M
-- S1: 10% conv → Rp 200 jt
-- TOTAL: Rp 23.5 M (additional revenue from PR)

-- =============================================================================
-- AUDIT TABLE — minimal lineage tracking for pilot
-- =============================================================================

CREATE TABLE public.batch_manifest (
  batch_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file_name TEXT NOT NULL,
  source_period    TEXT NOT NULL,
  raw_md5_checksum TEXT,
  raw_row_count    INT,
  loaded_row_count INT,
  loaded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           TEXT NOT NULL DEFAULT 'pending',
  notes            TEXT
);

-- =============================================================================
-- GALEN KB TABLES
-- =============================================================================

-- Reference docs with vector embeddings
CREATE TABLE kb.reference_docs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL,            -- 'framework_v1.4', 'paper_saptono_khozen', 'se-24-pj-2019'
  chunk_text       TEXT NOT NULL,
  chunk_metadata   JSONB,
  embedding        VECTOR(1536),             -- OpenAI text-embedding-3-small
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON kb.reference_docs USING hnsw (embedding vector_cosine_ops);

-- Few-shot examples for Galen specialist
CREATE TABLE kb.few_shot (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category         TEXT,
  question         TEXT NOT NULL,
  reasoning        TEXT,
  expected_answer  TEXT NOT NULL,
  embedding        VECTOR(1536),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON kb.few_shot USING hnsw (embedding vector_cosine_ops);

-- RPC: Similarity search for RAG
CREATE OR REPLACE FUNCTION kb.search_docs(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (source TEXT, chunk_text TEXT, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT source, chunk_text,
         1 - (embedding <=> query_embedding) AS similarity
  FROM kb.reference_docs
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RPC: Classify a single vehicle (for ad-hoc lookup)
CREATE OR REPLACE FUNCTION public.classify_vehicle_segment(
  p_sd_notice DATE,
  p_tanggal_transaksi DATE,
  p_thn_buat INT
)
RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT CASE
    WHEN p_tanggal_transaksi IS NULL AND
         (EXTRACT(YEAR FROM DATE '2025-05-01') - p_thn_buat) <= 15 THEN 'S1'
    WHEN p_tanggal_transaksi IS NULL AND
         (EXTRACT(YEAR FROM DATE '2025-05-01') - p_thn_buat) > 15 THEN 'S2'
    WHEN p_sd_notice IS NULL OR (DATE '2025-05-01' - p_sd_notice) <= 0 THEN 'H1'
    WHEN (DATE '2025-05-01' - p_sd_notice) BETWEEN 1 AND 90 THEN 'K1'
    WHEN (DATE '2025-05-01' - p_sd_notice) BETWEEN 91 AND 365 THEN 'O1'
    WHEN (DATE '2025-05-01' - p_sd_notice) BETWEEN 366 AND 730 THEN 'M1'
    WHEN (DATE '2025-05-01' - p_sd_notice) BETWEEN 731 AND 1825 THEN 'M2'
    WHEN (DATE '2025-05-01' - p_sd_notice) > 1825 AND
         (EXTRACT(YEAR FROM DATE '2025-05-01') - p_thn_buat) < 20 THEN 'M2'
    WHEN (DATE '2025-05-01' - p_sd_notice) > 1825 AND
         (EXTRACT(YEAR FROM DATE '2025-05-01') - p_thn_buat) >= 20 THEN 'S2'
    ELSE 'unclassified'
  END;
$$;

-- =============================================================================
-- REFRESH SCHEDULE (pg_cron)
-- =============================================================================

SELECT cron.schedule(
  'refresh-agg-segmen-kabupaten', '0 4 * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY gold_plus.agg_segmen_kabupaten $$
);

SELECT cron.schedule(
  'refresh-agg-segmen-jenken', '0 4 * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY gold_plus.agg_segmen_jenken $$
);

-- =============================================================================
-- VERIFICATION QUERY (run after data load)
-- Expected counts per Sheet 2 (matriks segmen × wilayah):
--   H1 = 107,967, K1 = 33,789, O1 = 32,916, M1 = 25,039,
--   M2 = 140,966, S1 = 12,756, S2 = 74,544
--   Total = 427,977
-- =============================================================================

-- SELECT segmen_kepatuhan, COUNT(*)
-- FROM gold_plus.registry_segmented
-- GROUP BY segmen_kepatuhan
-- ORDER BY segmen_kepatuhan;
