// Edge Function: segment_summary
// Berikan distribusi + metrik per segmen, dengan optional filter
//
// Deploy: supabase functions deploy segment_summary
// Call:   POST /functions/v1/segment_summary

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SummaryRequest {
  kabupaten?: string;          // filter by kabupaten
  segmen?: string;             // filter to single segment
  group_by?: "segmen" | "kabupaten" | "jenken";
}

interface SegmenRow {
  segmen_kepatuhan: string;
  nama_segmen?: string;
  nama_kabupaten?: string;
  jenis_kendaraan?: string;
  n_kendaraan: number;
  pct_motor?: number;
  pct_punya_hp?: number;
  rata_pkb_per_kendaraan?: number;
  total_potensi_pkb?: number;
  rata_hari_tunggakan?: number;
}

const SEGMEN_NAMA: Record<string, string> = {
  H1: "Patuh Aktif",
  K1: "Baru Lewat Jatuh Tempo",
  O1: "Mulai Mengabaikan",
  M1: "Tidak Patuh Pasif",
  M2: "Tidak Patuh Kronis",
  S1: "Belum Terdaftar",
  S2: "Kendaraan Hantu",
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      },
    }
  );

  try {
    const body: SummaryRequest = await req.json().catch(() => ({}));
    const { kabupaten, segmen, group_by = "segmen" } = body;

    let rows: SegmenRow[] = [];
    let total_n = 0;
    let total_potensi = 0;

    if (group_by === "kabupaten" || kabupaten) {
      // Per kabupaten breakdown
      let q = supabase
        .schema("gold_plus")
        .from("agg_segmen_kabupaten")
        .select("*");
      if (kabupaten) q = q.eq("nama_kabupaten", kabupaten);
      if (segmen) q = q.eq("segmen_kepatuhan", segmen);

      const { data, error } = await q.order("segmen_kepatuhan");
      if (error) throw error;
      rows = (data || []).map((r: any) => ({
        ...r,
        nama_segmen: SEGMEN_NAMA[r.segmen_kepatuhan] || r.segmen_kepatuhan,
      }));
    } else if (group_by === "jenken") {
      let q = supabase
        .schema("gold_plus")
        .from("agg_segmen_jenken")
        .select("*");
      if (segmen) q = q.eq("segmen_kepatuhan", segmen);
      const { data, error } = await q.order("segmen_kepatuhan");
      if (error) throw error;
      rows = (data || []).map((r: any) => ({
        ...r,
        nama_segmen: SEGMEN_NAMA[r.segmen_kepatuhan] || r.segmen_kepatuhan,
      }));
    } else {
      // Default: per segmen aggregate (sum across kabupaten)
      const { data, error } = await supabase
        .schema("gold_plus")
        .from("agg_segmen_kabupaten")
        .select("*");
      if (error) throw error;

      const byKode: Record<string, any> = {};
      for (const r of data || []) {
        const k = r.segmen_kepatuhan;
        if (!byKode[k]) {
          byKode[k] = {
            segmen_kepatuhan: k,
            nama_segmen: SEGMEN_NAMA[k] || k,
            n_kendaraan: 0,
            total_potensi_pkb: 0,
            _hp: 0,
            _motor: 0,
            _hari: 0,
            _count: 0,
          };
        }
        byKode[k].n_kendaraan += r.n_kendaraan;
        byKode[k].total_potensi_pkb += r.total_potensi_pkb;
        byKode[k]._hp += r.pct_punya_hp * r.n_kendaraan;
        byKode[k]._motor += r.pct_motor * r.n_kendaraan;
        byKode[k]._hari += r.rata_hari_tunggakan * r.n_kendaraan;
        byKode[k]._count += r.n_kendaraan;
      }
      rows = Object.values(byKode).map((r: any) => ({
        segmen_kepatuhan: r.segmen_kepatuhan,
        nama_segmen: r.nama_segmen,
        n_kendaraan: r.n_kendaraan,
        pct_motor: r._motor / r._count,
        pct_punya_hp: r._hp / r._count,
        total_potensi_pkb: Math.round(r.total_potensi_pkb),
        rata_hari_tunggakan: Math.round(r._hari / r._count),
      }));
      rows.sort((a, b) => a.segmen_kepatuhan.localeCompare(b.segmen_kepatuhan));
    }

    total_n = rows.reduce((s, r) => s + r.n_kendaraan, 0);
    total_potensi = rows.reduce((s, r) => s + (r.total_potensi_pkb || 0), 0);

    // Add caveats
    const caveats: string[] = [];
    if (kabupaten && rows.length === 0) {
      caveats.push(`Data untuk kabupaten "${kabupaten}" belum tersedia. Hanya Palangka Raya yang punya data kuantitatif saat ini.`);
    }
    caveats.push("Reference date untuk perhitungan tunggakan: 1 Mei 2025");
    caveats.push("Total potensi PKB hanya komponen pokok — belum termasuk SWDKLLJ, opsen, denda, atau BBNKB");

    return new Response(
      JSON.stringify(
        {
          group_by,
          filters: { kabupaten, segmen },
          total_n_kendaraan: total_n,
          total_potensi_pkb_idr: total_potensi,
          rows,
          caveats,
        },
        null,
        2
      ),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Example calls:
//   {} → all segmen aggregate
//   {"group_by": "kabupaten"} → per kabupaten breakdown
//   {"segmen": "M2"} → just M2 stats
//   {"kabupaten": "PALANGKA RAYA", "group_by": "jenken"} → M2-style breakdown PR by jenken
