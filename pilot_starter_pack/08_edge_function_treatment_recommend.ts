// Edge Function: treatment_recommend
// Berikan treatment recommendation lengkap untuk segmen + (optional) kabupaten
//
// Deploy: supabase functions deploy treatment_recommend
// Call:   POST /functions/v1/treatment_recommend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TreatmentRequest {
  segmen_kode: string;          // H1, K1, O1, M1, M2, S1, S2
  kabupaten?: string;            // optional filter
}

interface TreatmentResponse {
  segmen_kode: string;
  segmen_nama: string;
  tujuan_strategis: string;
  kanal_utama: string;
  pesan_personalisasi: string;
  kebijakan_amnesti: string;
  aksi_utama: string;
  perkiraan_konversi: string;
  raci: Array<{
    aksi_kunci: string;
    jasa_raharja: string | null;
    bapenda: string | null;
    samsat: string | null;
    polri: string | null;
    kelurahan: string | null;
    vendor_ti: string | null;
  }>;
  programs: Array<{
    program_id: number;
    nama: string;
    deskripsi: string;
  }>;
  kabupaten_context?: {
    nama_kabupaten: string;
    n_kendaraan: number;
    pct_punya_hp: number;
    rata_pkb_per_kendaraan: number;
    total_potensi_pkb: number;
    rata_hari_tunggakan: number;
  } | null;
  caveats: string[];
}

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
    const body: TreatmentRequest = await req.json();
    const { segmen_kode, kabupaten } = body;

    if (!segmen_kode) {
      return new Response(
        JSON.stringify({ error: "segmen_kode required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch treatment lookup
    const { data: treatment, error: tErr } = await supabase
      .schema("ref")
      .from("treatment_lookup")
      .select("*, segmen!inner(nama)")
      .eq("segmen_kode", segmen_kode)
      .single();

    if (tErr || !treatment) {
      return new Response(
        JSON.stringify({ error: `Unknown segmen: ${segmen_kode}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch RACI for this segmen
    const { data: raci } = await supabase
      .schema("ref")
      .from("raci_matrix")
      .select("aksi_kunci, jasa_raharja, bapenda, samsat, polri, kelurahan, vendor_ti")
      .eq("segmen_kode", segmen_kode);

    // 3. Fetch programs targeting this segmen
    const { data: programs } = await supabase
      .schema("ref")
      .from("program_sadar")
      .select("program_id, nama, deskripsi")
      .contains("segmen_sasaran", [segmen_kode]);

    // 4. Optional: kabupaten context
    let kabupaten_context = null;
    if (kabupaten) {
      const { data } = await supabase
        .schema("gold_plus")
        .from("agg_segmen_kabupaten")
        .select("nama_kabupaten, n_kendaraan, pct_punya_hp, rata_pkb_per_kendaraan, total_potensi_pkb, rata_hari_tunggakan")
        .eq("segmen_kepatuhan", segmen_kode)
        .eq("nama_kabupaten", kabupaten)
        .maybeSingle();
      kabupaten_context = data;
    }

    // 5. Caveats
    const caveats: string[] = [];
    if (segmen_kode === "S2") {
      caveats.push("S2 BUKAN target kampanye. Treatment = data cleanup. Mengirim pesan ke ghost vehicle merusak kredibilitas seluruh kampanye.");
    }
    if (segmen_kode === "M2" && treatment.kebijakan_amnesti?.includes("PENUH")) {
      caveats.push("Amnesti penuh denda M2 WAJIB diikuti razia + tilang setelah deadline berakhir. Tanpa penegakan = sinyal 'tidak ada konsekuensi'.");
    }
    if (segmen_kode === "M1") {
      caveats.push("Amnesti M1 hanya parsial 50-75%. Pokok PKB + SWDKLLJ tetap dibayar penuh.");
    }
    if (segmen_kode === "S1") {
      caveats.push("S1 menggunakan lever pengurangan BBNKB, bukan amnesti denda. Setiap konversi = aliran pendapatan baru berulang.");
    }
    if (kabupaten && !kabupaten_context) {
      caveats.push(`Data kuantitatif untuk kabupaten "${kabupaten}" belum tersedia. Hanya Pusat Urban (Palangka Raya) yang punya data.`);
    }

    // 6. Audit log (best effort, don't fail request)
    supabase
      .from("audit_log")
      .insert({
        endpoint: "treatment_recommend",
        payload_summary: { segmen_kode, kabupaten },
        response_status: 200,
      })
      .then(() => {}) // fire and forget
      .catch(() => {});

    const response: TreatmentResponse = {
      segmen_kode: treatment.segmen_kode,
      segmen_nama: (treatment as any).segmen.nama,
      tujuan_strategis: treatment.tujuan_strategis,
      kanal_utama: treatment.kanal_utama,
      pesan_personalisasi: treatment.pesan_personalisasi,
      kebijakan_amnesti: treatment.kebijakan_amnesti,
      aksi_utama: treatment.aksi_utama,
      perkiraan_konversi: treatment.perkiraan_konversi,
      raci: raci || [],
      programs: programs || [],
      kabupaten_context,
      caveats,
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Example call:
//   curl -X POST https://<project>.supabase.co/functions/v1/treatment_recommend \
//     -H "Authorization: Bearer <anon_key>" \
//     -H "Content-Type: application/json" \
//     -d '{"segmen_kode": "M2", "kabupaten": "PALANGKA RAYA"}'
