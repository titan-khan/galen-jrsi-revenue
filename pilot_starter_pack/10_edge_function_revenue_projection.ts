// Edge Function: revenue_projection
// What-if simulator untuk dampak pendapatan per segmen × konversi
//
// Deploy: supabase functions deploy revenue_projection
// Call:   POST /functions/v1/revenue_projection

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ProjectionRequest {
  scenario?: "Konservatif" | "Moderat" | "Optimis" | "Custom";
  custom_konversi?: Record<string, number>;  // e.g., {"K1": 0.65, "M2": 0.20}
  segmen_filter?: string[];                   // e.g., ["K1", "M2"]
  kabupaten?: string;                          // default: PALANGKA RAYA (only data available)
}

interface ProjectionRow {
  segmen_kode: string;
  segmen_nama: string;
  n_kendaraan: number;
  konversi_pct: number;
  n_terkonversi: number;
  est_pkb_per_kendaraan: number;
  est_pendapatan_idr: number;
  notes: string[];
}

const SEGMEN_NAMA: Record<string, string> = {
  K1: "Baru Lewat Jatuh Tempo",
  O1: "Mulai Mengabaikan",
  M1: "Tidak Patuh Pasif",
  M2: "Tidak Patuh Kronis",
  S1: "Belum Terdaftar",
};

// Default scenario per Sheet 6
const DEFAULT_SCENARIOS: Record<string, Record<string, number>> = {
  Konservatif: { K1: 0.60, O1: 0.35, M1: 0.25, M2: 0.15, S1: 0.10 },
  Moderat:     { K1: 0.70, O1: 0.45, M1: 0.35, M2: 0.25, S1: 0.15 },
  Optimis:     { K1: 0.75, O1: 0.50, M1: 0.40, M2: 0.30, S1: 0.20 },
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
    const body: ProjectionRequest = await req.json().catch(() => ({}));
    const {
      scenario = "Konservatif",
      custom_konversi,
      segmen_filter,
      kabupaten = "PALANGKA RAYA",
    } = body;

    // Determine konversi rates
    let konversi: Record<string, number>;
    if (scenario === "Custom" && custom_konversi) {
      konversi = custom_konversi;
    } else {
      konversi = DEFAULT_SCENARIOS[scenario] || DEFAULT_SCENARIOS.Konservatif;
    }

    // Fetch segment data for the kabupaten
    let q = supabase
      .schema("gold_plus")
      .from("agg_segmen_kabupaten")
      .select("segmen_kepatuhan, n_kendaraan, rata_pkb_per_kendaraan")
      .eq("nama_kabupaten", kabupaten);

    const { data, error } = await q;
    if (error) throw error;

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          error: `No data for kabupaten "${kabupaten}". Only Palangka Raya available in pilot.`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const rows: ProjectionRow[] = [];
    let total_terkonversi = 0;
    let total_pendapatan = 0;

    for (const r of data) {
      const segmen = r.segmen_kepatuhan;

      // Skip H1 (already paid) and S2 (data cleanup, not revenue target)
      if (segmen === "H1" || segmen === "S2") continue;

      // Apply segmen_filter if provided
      if (segmen_filter && !segmen_filter.includes(segmen)) continue;

      const k = konversi[segmen] ?? 0;
      const n_terkonversi = Math.round(r.n_kendaraan * k);
      const pendapatan = n_terkonversi * r.rata_pkb_per_kendaraan;

      const notes: string[] = [];
      if (segmen === "M1" || segmen === "M2") {
        notes.push("Pendapatan = pokok PKB only. Denda dihapuskan via amnesti tidak dihitung.");
      }
      if (segmen === "S1") {
        notes.push("Setiap konversi = aliran pendapatan baru BERULANG setiap tahun. Compounding value tinggi.");
      }
      if (segmen === "M2") {
        notes.push("Wajib diikuti razia pasca-amnesti agar konversi target tercapai dan tidak menciptakan moral hazard.");
      }

      rows.push({
        segmen_kode: segmen,
        segmen_nama: SEGMEN_NAMA[segmen] || segmen,
        n_kendaraan: r.n_kendaraan,
        konversi_pct: k,
        n_terkonversi,
        est_pkb_per_kendaraan: r.rata_pkb_per_kendaraan,
        est_pendapatan_idr: pendapatan,
        notes,
      });

      total_terkonversi += n_terkonversi;
      total_pendapatan += pendapatan;
    }

    // Sort by est_pendapatan descending
    rows.sort((a, b) => b.est_pendapatan_idr - a.est_pendapatan_idr);

    return new Response(
      JSON.stringify(
        {
          scenario,
          kabupaten,
          rows,
          total_n_terkonversi: total_terkonversi,
          total_est_pendapatan_idr: total_pendapatan,
          total_est_pendapatan_label: `Rp ${(total_pendapatan / 1e9).toFixed(2)} Miliar`,
          caveats: [
            "Estimasi pokok PKB tahunan saja — belum termasuk SWDKLLJ, opsen, BBNKB.",
            "Untuk M2 yang terima amnesti penuh denda, denda yang dihapus tidak dihitung.",
            "S1 menghasilkan aliran pendapatan baru berulang — angka tahun pertama tidak mencerminkan total compounded value.",
            "Reference date: 2025-05-01. Konversi target dari framework v1.4.",
          ],
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
//   {} → conservative scenario, full PR
//   {"scenario": "Optimis"} → optimistic scenario
//   {"scenario": "Custom", "custom_konversi": {"M2": 0.25}} → custom rate for M2
//   {"segmen_filter": ["M2"]} → only M2 projection
