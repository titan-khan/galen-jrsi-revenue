// Edge Function: classify_segment
// Klasifikasi 1 kendaraan ke 7-segmen sesuai framework v1.4
// Reference date: 2025-05-01
//
// Deploy: supabase functions deploy classify_segment
// Call:   POST /functions/v1/classify_segment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface ClassifyRequest {
  sd_notice?: string | null;        // ISO date "YYYY-MM-DD"
  tanggal_transaksi?: string | null; // ISO date or null
  thn_buat?: number | null;          // year
}

interface ClassifyResponse {
  segmen_kode: string;               // H1, K1, O1, M1, M2, S1, S2
  segmen_nama: string;
  warna: string;
  durasi_tunggakan_days: number | null;
  has_payment_history: boolean;
  usia_kendaraan: number | null;
  rationale: string;
}

const REFERENCE_DATE = new Date("2025-05-01");

const SEGMEN_INFO: Record<string, { nama: string; warna: string }> = {
  H1: { nama: "Patuh Aktif", warna: "HIJAU" },
  K1: { nama: "Baru Lewat Jatuh Tempo", warna: "KUNING" },
  O1: { nama: "Mulai Mengabaikan", warna: "ORANYE" },
  M1: { nama: "Tidak Patuh Pasif", warna: "MERAH" },
  M2: { nama: "Tidak Patuh Kronis", warna: "MERAH" },
  S1: { nama: "Belum Terdaftar", warna: "ABU" },
  S2: { nama: "Kendaraan Hantu", warna: "ABU" },
};

function classify(req: ClassifyRequest): ClassifyResponse {
  const has_payment_history =
    req.tanggal_transaksi !== null && req.tanggal_transaksi !== undefined;

  const usia_kendaraan =
    req.thn_buat ? REFERENCE_DATE.getFullYear() - req.thn_buat : null;

  let durasi_tunggakan_days: number | null = null;
  if (req.sd_notice) {
    const sd = new Date(req.sd_notice);
    durasi_tunggakan_days = Math.floor(
      (REFERENCE_DATE.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Apply classification rules in priority order
  let segmen_kode: string;
  let rationale: string;

  if (!has_payment_history && usia_kendaraan !== null && usia_kendaraan <= 15) {
    segmen_kode = "S1";
    rationale = `Belum pernah transact dan usia ${usia_kendaraan} tahun ≤ 15 — likely tangan kedua tanpa balik nama. Penghalang: BBNKB.`;
  } else if (!has_payment_history && usia_kendaraan !== null && usia_kendaraan > 15) {
    segmen_kode = "S2";
    rationale = `Belum pernah transact dan usia ${usia_kendaraan} tahun > 15 — likely kendaraan tidak ada fisik (Kendaraan Hantu).`;
  } else if (durasi_tunggakan_days === null || durasi_tunggakan_days <= 0) {
    segmen_kode = "H1";
    rationale = `sd_notice belum lewat (${durasi_tunggakan_days} hari) — kendaraan masih dalam masa berlaku.`;
  } else if (durasi_tunggakan_days >= 1 && durasi_tunggakan_days <= 90) {
    segmen_kode = "K1";
    rationale = `Tunggakan ${durasi_tunggakan_days} hari (1-90) + ada riwayat transaksi.`;
  } else if (durasi_tunggakan_days >= 91 && durasi_tunggakan_days <= 365) {
    segmen_kode = "O1";
    rationale = `Tunggakan ${durasi_tunggakan_days} hari (91-365) + ada riwayat — mulai mengabaikan.`;
  } else if (durasi_tunggakan_days >= 366 && durasi_tunggakan_days <= 730) {
    segmen_kode = "M1";
    rationale = `Tunggakan ${durasi_tunggakan_days} hari (1-2 tahun) — tidak patuh pasif. Akumulasi denda jadi penghalang nyata.`;
  } else if (durasi_tunggakan_days >= 731 && durasi_tunggakan_days <= 1825) {
    segmen_kode = "M2";
    rationale = `Tunggakan ${durasi_tunggakan_days} hari (2-5 tahun) — tidak patuh kronis. Denda akumulasi 2-4× pokok.`;
  } else if (
    durasi_tunggakan_days > 1825 &&
    usia_kendaraan !== null &&
    usia_kendaraan < 20
  ) {
    segmen_kode = "M2";
    rationale = `Tunggakan ${durasi_tunggakan_days} hari (>5 tahun) tapi usia kendaraan ${usia_kendaraan} < 20 — masih M2.`;
  } else if (
    durasi_tunggakan_days > 1825 &&
    usia_kendaraan !== null &&
    usia_kendaraan >= 20
  ) {
    segmen_kode = "S2";
    rationale = `Tunggakan ${durasi_tunggakan_days} hari + usia ${usia_kendaraan} ≥ 20 — reklasifikasi ke Kendaraan Hantu.`;
  } else {
    segmen_kode = "unclassified";
    rationale = "Tidak match aturan apapun. Periksa data input.";
  }

  const info = SEGMEN_INFO[segmen_kode] || { nama: "Unknown", warna: "GREY" };

  return {
    segmen_kode,
    segmen_nama: info.nama,
    warna: info.warna,
    durasi_tunggakan_days,
    has_payment_history,
    usia_kendaraan,
    rationale,
  };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body: ClassifyRequest = await req.json();
    const result = classify(body);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Example call:
//   curl -X POST https://<project>.supabase.co/functions/v1/classify_segment \
//     -H "Authorization: Bearer <anon_key>" \
//     -H "Content-Type: application/json" \
//     -d '{"sd_notice": "2024-01-15", "tanggal_transaksi": "2023-01-10", "thn_buat": 2018}'
//
// Expected response: {"segmen_kode": "M1", "segmen_nama": "Tidak Patuh Pasif", ...}
