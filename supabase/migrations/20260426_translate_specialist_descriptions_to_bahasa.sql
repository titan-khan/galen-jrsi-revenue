-- Backfill: translate any specialist `description` rows still using the
-- legacy English templates from HireSpecialist.tsx (pre-2026-04-26) into
-- Bahasa Indonesia. Each branch is anchored to one of the five exact
-- prefix+suffix templates so unrelated free-form descriptions are skipped.
-- Idempotent: re-running matches zero rows on the second pass.

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Continuously monitor (.+), detect anomalies and performance degradation early, identify root causes, and recommend data-driven corrective actions to maintain optimal performance\.$',
  'Memantau \1 secara berkelanjutan, mendeteksi anomali dan penurunan performa secara dini, mengidentifikasi akar masalah, serta merekomendasikan tindakan korektif berbasis data untuk menjaga performa optimal.'
)
WHERE description LIKE 'Continuously monitor %, detect anomalies and performance degradation early, identify root causes, and recommend data-driven corrective actions to maintain optimal performance.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Track (.+) trends, analyze patterns and contributing factors, detect early warning signals, and provide actionable recommendations to improve and maintain strong performance\.$',
  'Melacak tren \1, menganalisis pola dan faktor kontributor, mendeteksi sinyal peringatan dini, serta memberikan rekomendasi yang dapat ditindaklanjuti untuk meningkatkan dan mempertahankan performa.'
)
WHERE description LIKE 'Track % trends, analyze patterns and contributing factors, detect early warning signals, and provide actionable recommendations to improve and maintain strong performance.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Monitor (.+) performance, proactively identify issues and opportunities, analyze key drivers, and deliver actionable insights to optimize outcomes\.$',
  'Memantau performa \1, mengidentifikasi isu dan peluang secara proaktif, menganalisis driver utama, serta memberikan insight aksional untuk mengoptimalkan hasil.'
)
WHERE description LIKE 'Monitor % performance, proactively identify issues and opportunities, analyze key drivers, and deliver actionable insights to optimize outcomes.';

UPDATE public.agents
SET description = regexp_replace(
  description,
  '^Track (.+) performance over time, identify growth patterns and seasonal variations, and maintain visibility into key trends driving business outcomes\.$',
  'Melacak performa \1 dari waktu ke waktu, mengidentifikasi pola pertumbuhan dan variasi musiman, serta menjaga visibilitas tren utama yang mendorong outcome bisnis.'
)
WHERE description LIKE 'Track % performance over time, identify growth patterns and seasonal variations, and maintain visibility into key trends driving business outcomes.';
