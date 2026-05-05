-- Backfill: replace generic specialist descriptions with JRSI-mission-aligned,
-- naturalized Bahasa wording (pencegahan kecelakaan + tata kelola santunan
-- Jasa Raharja). Each branch is anchored to one of the legacy prefix+suffix
-- templates from HireSpecialist.tsx so unrelated rows are skipped. Idempotent.
--
-- For the legacy "Memantau X secara berkelanjutan ..." template, the same copy
-- was used for both Critical and Warning suggestion classes, so we route by
-- specialist `name` against the underlying metric severity (Fatalitas Rate /
-- MD = critical; everything else under that template = warning).

-- ─────────────────────────────────────────────────────────────────────────────
-- Pass A: legacy generic Bahasa → final naturalized JR-mission copy
-- ─────────────────────────────────────────────────────────────────────────────

-- Legacy Critical/Warning shared template → final critical (for `critical` metrics)
UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Memantau (.+) secara berkelanjutan, mendeteksi anomali dan penurunan performa secara dini, mengidentifikasi akar masalah, serta merekomendasikan tindakan korektif berbasis data untuk menjaga performa optimal\.$',
  '\1 sudah masuk zona kritis. Spesialis ini menelusuri kabupaten, ruas, dan jam puncak yang paling banyak menyumbang, lalu mengusulkan intervensi cepat untuk memutus laju korban kecelakaan dan klaim santunan.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Memantau % secara berkelanjutan, mendeteksi anomali dan penurunan performa secara dini, mengidentifikasi akar masalah, serta merekomendasikan tindakan korektif berbasis data untuk menjaga performa optimal.'
  AND name IN (
    'Fatalitas Rate Monitoring',
    'Total Korban Meninggal Dunia Monitoring'
  );

-- Legacy Critical/Warning shared template → final warning (everything else)
UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Memantau (.+) secara berkelanjutan, mendeteksi anomali dan penurunan performa secara dini, mengidentifikasi akar masalah, serta merekomendasikan tindakan korektif berbasis data untuk menjaga performa optimal\.$',
  '\1 mulai bergerak ke arah yang merugikan. Spesialis ini menangkap sinyal sejak dini di tiap wilayah dan kelompok berisiko, lalu menyiapkan langkah pencegahan sebelum tren berubah jadi lonjakan korban dan klaim.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Memantau % secara berkelanjutan, mendeteksi anomali dan penurunan performa secara dini, mengidentifikasi akar masalah, serta merekomendasikan tindakan korektif berbasis data untuk menjaga performa optimal.';

-- Legacy Optimization template → final optimization
UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Melacak tren (.+), menganalisis pola dan faktor kontributor, mendeteksi sinyal peringatan dini, serta memberikan rekomendasi yang dapat ditindaklanjuti untuk meningkatkan dan mempertahankan performa\.$',
  'Saat \1 bergerak signifikan, spesialis ini mengurai akar masalahnya per kabupaten dan periode, lalu menyusun rencana perbaikan agar risiko korban dan beban santunan ke depan tetap terkendali.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Melacak tren %, menganalisis pola dan faktor kontributor, mendeteksi sinyal peringatan dini, serta memberikan rekomendasi yang dapat ditindaklanjuti untuk meningkatkan dan mempertahankan performa.';

-- Legacy AI Specialist template → final specialist
UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Memantau performa (.+), mengidentifikasi isu dan peluang secara proaktif, menganalisis driver utama, serta memberikan insight aksional untuk mengoptimalkan hasil\.$',
  'Spesialis ini mengawal \1 secara proaktif — membaca sinyal yang relevan untuk keselamatan jalan dan klaim, lalu memberi rekomendasi konkret yang membantu pencegahan kecelakaan dan tata kelola santunan Jasa Raharja.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Memantau performa %, mengidentifikasi isu dan peluang secara proaktif, menganalisis driver utama, serta memberikan insight aksional untuk mengoptimalkan hasil.';

-- Legacy Tracking template → final tracking
UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Melacak performa (.+) dari waktu ke waktu, mengidentifikasi pola pertumbuhan dan variasi musiman, serta menjaga visibilitas tren utama yang mendorong outcome bisnis\.$',
  'Spesialis ini mengikuti pergerakan \1 dari waktu ke waktu — pola musiman, perubahan struktural, dan deviasi dari target — supaya indikator ini terus selaras dengan misi pencegahan kecelakaan dan penyaluran santunan.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Melacak performa % dari waktu ke waktu, mengidentifikasi pola pertumbuhan dan variasi musiman, serta menjaga visibilitas tren utama yang mendorong outcome bisnis.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Pass B: first-pass JR template ("Memantau X yang berada dalam kondisi kritis")
-- → final naturalized copy. Only kicks in for environments that received the
-- intermediate first JR pass; idempotent everywhere else.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Memantau (.+) yang berada dalam kondisi kritis, mengidentifikasi wilayah, waktu, dan faktor pendorong terbesar, serta merekomendasikan intervensi prioritas untuk mencegah kecelakaan dan menekan beban santunan Jasa Raharja\.$',
  '\1 sudah masuk zona kritis. Spesialis ini menelusuri kabupaten, ruas, dan jam puncak yang paling banyak menyumbang, lalu mengusulkan intervensi cepat untuk memutus laju korban kecelakaan dan klaim santunan.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Memantau % yang berada dalam kondisi kritis, mengidentifikasi wilayah, waktu, dan faktor pendorong terbesar, serta merekomendasikan intervensi prioritas untuk mencegah kecelakaan dan menekan beban santunan Jasa Raharja.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Memantau (.+) yang memberi sinyal peringatan, mengidentifikasi pola dan pendorong yang memburuk, serta merekomendasikan langkah dini sebelum berkembang menjadi lonjakan kecelakaan dan klaim santunan\.$',
  '\1 mulai bergerak ke arah yang merugikan. Spesialis ini menangkap sinyal sejak dini di tiap wilayah dan kelompok berisiko, lalu menyiapkan langkah pencegahan sebelum tren berubah jadi lonjakan korban dan klaim.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Memantau % yang memberi sinyal peringatan, mengidentifikasi pola dan pendorong yang memburuk, serta merekomendasikan langkah dini sebelum berkembang menjadi lonjakan kecelakaan dan klaim santunan.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Pass C: second-pass JR template ("Memprioritaskan X yang berada dalam kondisi
-- kritis: memetakan ...") → final naturalized copy. Only kicks in for envs
-- that received the second pass.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Memprioritaskan (.+) yang berada dalam kondisi kritis: memetakan kabupaten, ruas jalan, dan jam puncak penyumbang utama, lalu menyusun intervensi terprioritas yang menekan korban kecelakaan dan beban santunan Jasa Raharja\.$',
  '\1 sudah masuk zona kritis. Spesialis ini menelusuri kabupaten, ruas, dan jam puncak yang paling banyak menyumbang, lalu mengusulkan intervensi cepat untuk memutus laju korban kecelakaan dan klaim santunan.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Memprioritaskan % yang berada dalam kondisi kritis: memetakan kabupaten, ruas jalan, dan jam puncak penyumbang utama, lalu menyusun intervensi terprioritas yang menekan korban kecelakaan dan beban santunan Jasa Raharja.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Mendeteksi pemburukan (.+) secara dini: mengurai pola per wilayah dan kelompok berisiko, lalu menyiapkan langkah pencegahan sebelum berubah menjadi lonjakan korban kecelakaan dan klaim santunan\.$',
  '\1 mulai bergerak ke arah yang merugikan. Spesialis ini menangkap sinyal sejak dini di tiap wilayah dan kelompok berisiko, lalu menyiapkan langkah pencegahan sebelum tren berubah jadi lonjakan korban dan klaim.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Mendeteksi pemburukan % secara dini: mengurai pola per wilayah dan kelompok berisiko, lalu menyiapkan langkah pencegahan sebelum berubah menjadi lonjakan korban kecelakaan dan klaim santunan.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Menelusuri perubahan signifikan pada (.+): mengurai akar masalah per kabupaten dan periode, lalu menyusun rencana perbaikan terukur agar risiko korban dan beban santunan ke depan terus terkendali\.$',
  'Saat \1 bergerak signifikan, spesialis ini mengurai akar masalahnya per kabupaten dan periode, lalu menyusun rencana perbaikan agar risiko korban dan beban santunan ke depan tetap terkendali.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Menelusuri perubahan signifikan pada %: mengurai akar masalah per kabupaten dan periode, lalu menyusun rencana perbaikan terukur agar risiko korban dan beban santunan ke depan terus terkendali.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Mengawal (.+) secara proaktif: menyaring sinyal yang berdampak ke keselamatan jalan dan klaim, lalu memberikan rekomendasi konkret untuk pencegahan kecelakaan dan tata kelola santunan Jasa Raharja\.$',
  'Spesialis ini mengawal \1 secara proaktif — membaca sinyal yang relevan untuk keselamatan jalan dan klaim, lalu memberi rekomendasi konkret yang membantu pencegahan kecelakaan dan tata kelola santunan Jasa Raharja.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Mengawal % secara proaktif: menyaring sinyal yang berdampak ke keselamatan jalan dan klaim, lalu memberikan rekomendasi konkret untuk pencegahan kecelakaan dan tata kelola santunan Jasa Raharja.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Mengamati pergerakan (.+) dari waktu ke waktu — pola musiman, perubahan struktural, dan deviasi dari target — agar indikator ini tetap mendukung pencegahan kecelakaan dan efisiensi penyaluran santunan\.$',
  'Spesialis ini mengikuti pergerakan \1 dari waktu ke waktu — pola musiman, perubahan struktural, dan deviasi dari target — supaya indikator ini terus selaras dengan misi pencegahan kecelakaan dan penyaluran santunan.'
)
WHERE entity_type = 'specialist'
  AND description LIKE 'Mengamati pergerakan % dari waktu ke waktu — pola musiman, perubahan struktural, dan deviasi dari target — agar indikator ini tetap mendukung pencegahan kecelakaan dan efisiensi penyaluran santunan.';
