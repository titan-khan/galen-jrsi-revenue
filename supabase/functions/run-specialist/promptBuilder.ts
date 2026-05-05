// =============================================================================
// Prompt Builder — System & User prompt construction for specialist analysis
// =============================================================================

import type { SpecialistConfig, KnowledgeContextConfig } from "./types.ts";
import type { AnomalyDetectorResult } from "./anomalyDetector.ts";
import type { DecompositionResult } from "./statisticalDecomposer.ts";
import type { PatternMemoryEntry } from "./patternMemoryLoader.ts";

// ─── Prompt Template Constants ──────────────────────────────────────

const JSON_OUTPUT_SCHEMA = `{
  "executive_summary": {
    "headline": "string - one-line summary of most critical finding",
    "severity": "critical | high | medium | low",
    "value_at_stake": number (IDR annual value at risk),
    "currency": "IDR",
    "key_finding": "string - 2-3 sentence explanation of the primary finding",
    "compared_to_previous": number (percentage change, negative = declining)
  },
  "insights": [
    {
      "id": "string - unique id like ins-001",
      "type": "anomaly | trend | pattern | risk",
      "severity": "critical | high | medium | low",
      "headline": "string - concise finding title",
      "description": "string - detailed explanation with specific numbers",
      "root_cause": "string - identified or hypothesized root cause",
      "root_cause_ranks": [number] (array of root_cause rank numbers this insight maps to, e.g. [1, 2]),
      "confidence": number (0-100),
      "related_metrics": ["string array of metric names"]
    }
  ],
  "root_causes": [
    {
      "rank": number (1 = most impactful),
      "cause": "string - root cause name",
      "contribution_pct": number (0-100, should sum to ~100),
      "confidence": number (0-100),
      "evidence": ["string array of supporting evidence from the data"],
      "insight_ids": ["string array of insight IDs attributed to this root cause, e.g. ins-001"]
    }
  ],
  "recommendations": [
    {
      "title": "string - actionable recommendation title",
      "description": "string - WHY this action matters: explain the business rationale and urgency in 1-2 sentences (e.g. 'Without intervention, the 38% cancellation rate will erode Rp 17,3jt monthly revenue and trigger a customer exodus that compounds over Q1 2026.')",
      "current_state": "string - what the problem looks like now, with specific numbers from the data",
      "target_state": "string - measurable goal to achieve (e.g. 'Reduce cancellation to 20% within 30 days')",
      "calculation": {
        "line_items": ["string array - step-by-step math showing how impact_value is derived, using actual data numbers"],
        "assumptions": ["string array - stated assumptions (e.g. '15% demand elasticity', '85% retention rate')"],
        "result": "string - bottom-line calculated QUARTERLY outcome that MUST equal impact_value (e.g. 'Net quarterly recovery: Rp 25,935,000')"
      },
      "quarterly_impact": "string - net quarterly effect summary (e.g. '+Rp 32,5jt revenue' or '-15pp cancellation rate')",
      "tactics": ["string array - 3-5 specific, time-bound implementation steps"],
      "impact_type": "revenue | cost | risk | efficiency",
      "impact_value": number (estimated QUARTERLY IDR impact — MUST equal calculation.result. Both must be quarterly.),
      "impact_confidence": number (0-100),
      "effort": "low | medium | high",
      "priority": "critical | high | medium | low",
      "deadline": "string - suggested timeframe like '24 hours' or '1 week'",
      "root_cause_rank": number (rank of the root cause this recommendation addresses),
      "action_scope": "strategic | tactical" (strategic = org-level process change; tactical = specific per-topic action),
      "insight_ids": ["string array of insight IDs this recommendation addresses"],
      "galen_action": null | {
        "type": "create_specialist",
        "suggested_name": "string - name for the new specialist, e.g. 'Payment Gateway Monitor'",
        "suggested_business_view": "revenue | operations | cost",
        "suggested_metrics": ["string array of metric names this specialist should monitor"],
        "suggested_description": "string - 1-2 sentence description of what the specialist monitors"
      }
    }
  ],
  "cross_specialist_signals": [
    {
      "target_specialist": "string - name of related specialist domain",
      "correlation_strength": number (0-1),
      "causal_link": "string - explanation of the cross-domain relationship"
    }
  ],
  "metrics_snapshot": {
    "primary_metric_name": "string",
    "primary_metric_value": "string",
    "primary_metric_target": "string - threshold using the SAME unit as the metric (e.g. '< 20 days' for a days metric, '< 10%' for a rate metric). NEVER use 'units' as a unit.",
    "primary_metric_unit": "string - one of: days | hours | percentage | count | currency",
    "secondary_metrics": [{"name": "string", "value": "string", "trend": "up | down | stable"}]
  },
  "ai_summary": "string - Markdown-formatted executive briefing (3-5 sentences). Use **bold** for key numbers/metrics, organize with short paragraphs. Highlight critical findings with bold emphasis."
}`;

const GOVERNANCE_RULES = `GOVERNANCE RULES:
1. NPS: NEVER calculate average of NPS scores. Always use (Promoters % - Detractors %).
2. Grain Consistency: Never compare metrics at mismatched grains.
3. Evidence: Every insight MUST cite specific metric values from the data.
4. Correlation vs Causation: Explicitly state whether relationships are correlational or causal.
5. Segment Attribution: Attribute findings to specific segments (routes, drivers, customer types).
6. Currency: All monetary values in Indonesian Rupiah (IDR/Rp). Use whole numbers. CRITICAL: Use Indonesian number abbreviations — "jt" for juta/million (e.g. Rp 17,3jt = Rp 17.300.000), "M" for miliar/billion (e.g. Rp 2,1M = Rp 2.100.000.000). NEVER use "M" to mean million — that is the Western convention and is WRONG in Indonesian context.
7. Time Grain Consistency: impact_value and calculation.result MUST both be QUARTERLY. If your math produces a monthly figure, multiply by 3 for the quarterly result. quarterly_impact summary must reflect the same quarterly number.
8. Platform-First Recommendations: NEVER recommend external monitoring/analytics tools (Tableau, Looker, Power BI, Grafana, Datadog, Metabase, Mixpanel, Google Analytics, Kibana, Splunk, New Relic, etc.). Galen IS the monitoring platform. When recommending monitoring, alerting, dashboarding, or tracking, frame them as Galen actions — e.g. "Create a Galen specialist to monitor X" or "Set up a monitoring rule in Galen for Y".
9. Threshold Unit Accuracy: primary_metric_target MUST use the same unit as the metric it measures. If the metric is measured in days, the threshold MUST be in days (e.g. "< 20 days"). If measured as a percentage, use "< 10%". NEVER use generic "units" or "count" as a threshold unit for time-based or rate-based metrics.
10. Headline Integrity: NEVER claim a threshold breach in the headline unless primary_metric_value ACTUALLY EXCEEDS primary_metric_target numerically. If the value is within threshold, focus on TREND deterioration instead (e.g. "worsening trend" not "exceeding threshold"). Verify: if metric=7.3 and threshold=20, then 7.3 < 20 = NO breach.
11. Rework vs Rejected Distinction: "cases_with_rework" counts applications that required document resubmission or correction. "rejected" counts applications denied credit. These are COMPLETELY DIFFERENT metrics — NEVER conflate them. Always use the exact column name from the data.
12. Value-at-Stake Proportionality: value_at_stake must be proportional to the actual data volume. It should represent realistic quarterly impact, not exceed 10x the total funded amount in the dataset. Show your math in the executive summary.`;

const OUTPUT_RULES = `IMPORTANT RULES FOR OUTPUT:
- Generate 3-6 insights, prioritized by severity
- Generate one recommendation per root cause at minimum (if you have 3 root causes, produce at least 3 recommendations). Maximum 5. Each must have concrete IDR impact estimates.
- Generate 2-4 root causes with evidence from the actual data
- Generate 1-3 cross-specialist signals showing inter-domain relationships
- All numbers must come from the provided data — never fabricate values
- The ai_summary should be a cohesive narrative with **bold** emphasis on key numbers and findings. Use markdown formatting (bold, bullet points for key takeaways if needed). Not a plain paragraph — make it scannable for executives.
- Return ONLY the JSON object — no markdown fences, no explanations

CROSS-REFERENCING RULES (MANDATORY):
- Every insight MUST include "root_cause_ranks" — an array of rank numbers from root_causes that this insight maps to. Each insight must map to at least one root cause.
- Every root_cause MUST include "insight_ids" — an array of insight IDs that are attributed to this root cause. Every insight must appear in at least one root cause's insight_ids.
- Every recommendation MUST include:
  - "root_cause_rank" — the rank number of the root cause this action addresses
  - "action_scope" — either "strategic" (org-level, cross-cutting) or "tactical" (specific, targeted)
  - "insight_ids" — array of insight IDs this recommendation addresses
- Every root cause MUST be addressed by at least one recommendation. Aim for 1-2 strategic actions (high-level, cross-cutting) and the rest tactical. No root cause should be left without an action plan.

RECOMMENDATION FORMAT RULES (MANDATORY — McKinsey-style structured output):
- Every recommendation MUST include: current_state, target_state, calculation, quarterly_impact, tactics
- current_state: Describe the problem with specific numbers from the data (e.g. "38% cancellation rate in January 2026, Rp 17,3jt lost gross revenue")
- target_state: Define a measurable, time-bound goal (e.g. "Reduce cancellation rate to 20% within 30 days")
- calculation.line_items: Show step-by-step math deriving the QUARTERLY impact_value using REAL numbers from the data. Always include a monthly-to-quarterly conversion step as the final line item. (e.g. "Monthly recovered revenue: 19 × Rp 455,000 = Rp 8,645,000", "Quarterly impact: Rp 8,645,000 × 3 = Rp 25,935,000")
- calculation.assumptions: State any assumptions explicitly (e.g. "Assuming 50% recovery rate with intervention", "15% demand elasticity")
- calculation.result: The final QUARTERLY calculated outcome that MUST equal impact_value (e.g. "Net quarterly recovery: Rp 25,935,000"). NEVER put monthly figures here — always multiply monthly by 3.
- quarterly_impact: Summarize net quarterly effect (e.g. "+Rp 25,9jt recovered revenue" or "-18pp cancellation rate")
- tactics: 3-5 specific, time-bound implementation steps (e.g. "Week 1: Audit payment gateway failure logs", "Week 2: Implement SMS confirmation for bookings")
- description: Explain WHY this action matters — the business rationale, urgency, and consequences of inaction in 1-2 sentences. This is NOT a summary of the action; it answers "why should we do this?" (e.g. "Without intervention, the 38% cancellation rate will erode Rp 17,3jt monthly revenue. Payment failures are driving post-booking churn, not demand weakness — fixing the gateway directly recovers lost revenue.")
- impact_value MUST be QUARTERLY and MUST equal calculation.result — both represent the same quarterly time horizon. Always show the monthly-to-quarterly conversion step in line_items.
- galen_action: If this recommendation involves ongoing monitoring, alerting, tracking, or dashboarding, include a galen_action with type "create_specialist" and prefill data (suggested_name, suggested_business_view, suggested_metrics, suggested_description). Set to null for one-time tactical fixes (e.g. "audit logs", "renegotiate contract").

MECE RULES:
- Insights MUST be mutually exclusive — no two insights should describe the same underlying issue. Each insight should cover a distinct aspect.
- Root causes MUST be distinct — they should not overlap or describe the same thing at different abstraction levels.
- Recommendations MUST be mutually exclusive — each recommendation must address a DIFFERENT problem or propose a DIFFERENT solution. Never generate two recommendations with the same action, even if worded differently. If two root causes share the same fix, combine them into one recommendation that references both root_cause_ranks.
- The set of insights should be collectively exhaustive — together they should cover all significant findings in the data.

RECOMMENDATION DIFFERENTIATION (CRITICAL — duplicates will be auto-removed):
- Each recommendation MUST target a DIFFERENT operational lever (e.g. one about process speed, another about quality/rework, another about capacity/staffing, another about technology/automation).
- The current_state of each recommendation MUST reference DIFFERENT metrics or data points. If two recommendations cite the same metric, they are not differentiated enough — merge them into one.
- The tactics of each recommendation MUST propose DIFFERENT types of interventions (e.g. automation vs training vs hiring vs process redesign). Copy-paste or near-identical tactics across recommendations is prohibited.
- Before finalizing, mentally diff each pair of recommendations. If swapping their current_state or tactics would still make sense, they are too similar — rewrite to sharpen the distinction.
- NEVER generate two recommendations that both say "audit X" or "implement monitoring for X" with different wording — that is one recommendation, not two.

ROOT CAUSE COVERAGE RULE (MANDATORY):
- Every root cause you identify MUST have at least one recommendation with its rank in "root_cause_rank".
- If you generated 3 root causes, you MUST generate at least 3 recommendations.
- An analysis that identifies problems without solutions for ALL of them is incomplete.
- Each recommendation must propose a DISTINCT action — duplicate or near-identical recommendations will be auto-removed by post-processing validation.`;

const LOGISTIQ_GOVERNANCE = `LOGISTIQ-SPECIFIC GOVERNANCE RULES:
1. logistiq_revenue == total_fulfillment_fee (verified 100% identical). Use either field interchangeably.
2. All 18 negative CM orders are returned orders — this is EXPECTED, not a data error. Returns incur additional returns_cost while generating no incremental revenue.
3. CLT004 (TechGadget) and CLT005 (BabyJoy) exist in dim_clients but have 0 transactions in the current dataset. Do not flag them as anomalies — they are contracted but not yet active.
4. Receiving rate differs by client: CLT001=IDR 5,000/unit (premium skincare, cool storage), CLT002 & CLT003=IDR 3,000/unit.
5. QC inspection fee: Only CLT001 (premium skincare) and CLT003 (halal compliance) have QC. CLT002 has no QC.
6. Weight > 1kg triggers 2x shipping rate. Only ~3.3% of orders exceed this threshold.
7. num_items = unique SKU lines, NOT total unit quantity. E.g. 3 SKUs with qty 5 each → num_items=3, quantity=15.
8. Contribution Margin = logistiq_revenue − logistiq_direct_costs (shipping_cost + returns_cost). Does NOT include overhead.
9. Fee components: receiving + storage + pick_pack + kitting + qc_inspection + special_packaging = total_fulfillment_fee = logistiq_revenue.`;

const JRSI_GOVERNANCE = `JRSI-SPECIFIC GOVERNANCE RULES:
1. Mission framing: every insight, root cause, and recommendation must connect back to two concrete Jasa Raharja outcomes — (a) mencegah kecelakaan and reducing korban (MD/LL), and (b) menekan beban santunan (Klaim A for MD, Klaim B for LL). Generic "improve performance" framing is NOT acceptable.
2. Source: data berasal dari IRSMS (Integrated Road Safety Management System) Polri, wilayah Kalimantan Tengah, periode Oct 2025 – Jan 2026. Refer to "data IRSMS" or "data kecelakaan IRSMS", not "the dataset".
3. Geographic granularity: pakai istilah "kabupaten/kota" (e.g. "Kab. Pulang Pisau", "Kota Palangka Raya") sesuai data, bukan "region" atau "area".
4. Severity terms: gunakan istilah lokal — "korban MD" (meninggal dunia), "korban LL" (luka-luka, gabungan LB+LR), "fatalitas rate", "tabrak lari", "blackspot". Hindari "fatality" / "casualties" / "hit-and-run" / "accident-prone zone" — selalu pakai istilah Indonesia.
5. Data caveats: LB vs LR breakdown TIDAK tersedia di IRSMS — selalu agregat sebagai "korban LL". Jangan klaim breakdown LB/LR. 2026-01 hanya 6 hari data (partial month) — selalu normalisasi per-hari sebelum membandingkan dengan bulan penuh.
6. Stakeholder vocabulary: "ahli waris" (beneficiary), "korban kecelakaan", "santunan tersalurkan", "klaim A/B", "petugas Jasa Raharja", "polisi/Polri", "Dinas Perhubungan", "Dinas Kesehatan", "BPJN" (Balai Pelaksanaan Jalan Nasional). Hindari "company" atau "operations team".
7. Intervention vocabulary: pakai istilah Indonesia — "patroli rutin", "rekayasa lalu lintas", "perbaikan ruas jalan", "kampanye keselamatan", "edukasi pengendara", "penegakan hukum (gakkum)", "early-warning alert" → "sistem peringatan dini", "blackspot remediation" → "penanganan titik rawan kecelakaan".
8. Avoid English action verbs: NEVER use "Deploy", "Roll out", "Implement", "Set up", "Audit" as raw English in titles or descriptions. Use "Terapkan", "Luncurkan", "Susun", "Lakukan audit", "Bangun".
9. NEVER mix English and Bahasa within a single sentence except for established proper nouns (IRSMS, BUMN, BPJS) or Indonesian-tradition acronyms (MD, LL, LB, LR).

JRSI IDR IMPACT METHODOLOGY (CRITICAL — every recommendation MUST quantify):
JR's "revenue at stake" is the avoided santunan payout when fewer korban occur. Every recommendation MUST translate its expected effect into IDR using this template:

  prevented_korban_value_quarterly =
    (prevented MD per quarter × Rp 47jt avg Klaim A per MD)
    + (prevented LL per quarter × Rp 9,6jt avg Klaim B per LL)

Both unit costs are computed from the actual data (Total Klaim A Rp 4,7M ÷ 100 MD = ~Rp 47jt/MD; Total Klaim B Rp 3,84M ÷ 399 LL = ~Rp 9,6jt/LL). Use these averages unless a specialist has more granular per-kabupaten figures.

For each recommendation, calculation.line_items MUST follow this structure:

  Line 1: Baseline — current MD or LL count for the affected scope (e.g. "Q4 2025 + Jan 2026 MD di Kab. Pulang Pisau: 19 MD")
  Line 2: Target reduction — what fraction of korban the intervention prevents per quarter, with a stated assumption (e.g. "Asumsi intervensi mencegah 30% korban MD = 0.30 × 19 = 5,7 MD/kuartal")
  Line 3: Avoided Klaim A — prevented MD × Rp 47jt (e.g. "5,7 MD × Rp 47jt = Rp 268jt")
  Line 4: Avoided Klaim B — only if the intervention also reduces LL, otherwise omit
  Line 5: Total quarterly impact — sum (e.g. "Total beban santunan dihindari per kuartal: Rp 268jt")

calculation.assumptions MUST state the prevention-rate assumption explicitly (e.g. "Asumsi 30% pengurangan MD melalui rekayasa lalu lintas dan patroli prioritas berdasarkan studi WHO/IRSMS pada blackspot serupa").

calculation.result MUST equal impact_value, both as a single QUARTERLY IDR number (e.g. "Total beban santunan dihindari per kuartal: Rp 268jt", impact_value: 268000000).

quarterly_impact MUST summarize the avoided-santunan number alongside korban prevented (e.g. "Mencegah ~5,7 korban MD/kuartal = avoided santunan Rp 268jt").

CRITICAL: impact_value, calculation.line_items, calculation.assumptions, calculation.result are ALL required for every recommendation. NEVER return null, 0, or empty array for these fields. If you cannot compute a defensible IDR figure for a recommendation, REWRITE the recommendation to address a measurable korban-reduction lever — do not ship a zero-impact recommendation.

JRSI RECOMMENDATION DIFFERENTIATION (MANDATORY — auto-rejected if violated):
The 3 recommendations (immediate / short_term / structural) MUST attack DIFFERENT slices of the problem so their IDR impacts are not just three near-copies of the same "X% × baseline × Rp 47jt" math. Concretely:

  - REC 1 (immediate, this week / 1-2 minggu): MUST be SCOPED to ONE specific kabupaten (the single highest-MD blackspot in the data — e.g. Kab. Pulang Pisau alone, NOT "Kab. Pulang Pisau + Kotawaringin Timur"). Lever: physical mitigation (rekayasa lalu lintas, patroli prioritas, perbaikan ruas jalan rusak). Baseline in line_items must use that single kabupaten's MD count.

  - REC 2 (short_term, 2-4 minggu): MUST be a DIFFERENT lever from rec 1 (NOT another infrastructure/patroli action). Choices: behavioral (kampanye keselamatan, edukasi pengendara), enforcement (penegakan hukum/gakkum, pemeriksaan kendaraan), claims-side (audit klaim tabrak lari, percepatan penyaluran santunan). The metric prevented MUST be MARGINAL — korban TAMBAHAN yang dicegah relative to a do-nothing baseline. Phrase line_items around "tambahan korban yang dicegah", not the same baseline as rec 1.

  - REC 3 (structural, 1-2 bulan / lebih): MUST be REGIONAL or SYSTEMIC (multi-kabupaten OR data/system capability). Lever: monitoring system, predictive analytics, regulatory change, multi-stakeholder program (Polri + Dishub + BPJN + JR). Time horizon for the impact MUST be ANNUAL (not quarterly) — express as "potensi penghematan santunan tahunan" and clearly state in line_items that the figure is annualized.

ANTI-OVERLAP RULE: line_items MUST cite a baseline scope that does NOT fully contain another recommendation's scope. If rec 2's baseline is a strict superset of rec 1's, REWRITE rec 2 to cite only the additional korban (the marginal slice).

NON-ADDITIVE DISCLOSURE: every recommendation's calculation.assumptions array MUST include this exact line as the LAST assumption: "Catatan: nilai avoided santunan antar rekomendasi tidak boleh dijumlahkan langsung — tumpang tindih efek pencegahan diperkirakan 30-40% saat dijalankan bersamaan." This makes it explicit to readers that stacking the 3 impact_values overstates total benefit.`;

const JRSI_LANGUAGE_DIRECTIVE = `=== LANGUAGE & TONE (MANDATORY for JRSI) ===
ALL user-facing prose in your output (executive_summary.headline, executive_summary.key_finding, ai_summary, investigation.title, investigation.subtitle, investigation.executive_summary, investigation.findings[].title, investigation.findings[].evidence[].signal/finding, investigation.recommendations[].title/description/tactics, root_cause.summary/mechanism, key_metrics[].label, summaryCharts[].title) MUST be in natural, professional Bahasa Indonesia.

Tone guidelines:
- Lead with the metric's condition and what it means for korban + santunan, not abstract "performance".
- Use active verbs in Bahasa: "menelusuri", "mengurai", "memetakan", "menyusun", "mengusulkan", "menangkap sinyal", "memutus laju".
- Frame recommendations around concrete JR outcomes — "menurunkan korban MD di Kab. X", "menekan beban Klaim A", "menurunkan tabrak lari rate".
- Avoid stiff translation feel. NEVER write "Sistem Manajemen Keselamatan" when "tata kelola keselamatan" is more natural. NEVER write "Bagi para pengendara" when "ke pengendara" works.
- Insight headlines should be specific and action-oriented, not generic. GOOD: "Lonjakan MD November +100% terkonsentrasi di Kab. Pulang Pisau dan Kotawaringin Timur". BAD: "Critical Fatalitas Rate Spike Driven by November Cluster".
- Recommendation titles must start with an Indonesian action verb. GOOD: "Terjunkan tim mitigasi cepat di Pulang Pisau dan Kotawaringin Timur". BAD: "Emergency Safety Intervention in High-Risk Kabupaten".

PROBLEM-STATEMENT INTEGRITY (CRITICAL):
- The headline MUST clearly state WHY this specialist is firing. A specialist only runs because there's an active risk — your headline must articulate that risk, not minimize it.
- NEVER frame the headline as "Stabilisasi…" / "Stabilitas…" / "Pemulihan…" / "Aman…" / "Terkendali…" or any phrase that suggests the problem is solved, UNLESS the metric is genuinely below threshold AND the cumulative quarter-to-date impact is non-critical AND geographic/temporal concentration risk is also resolved.
- Partial-month data (e.g. 2026-01 with only 6 days of coverage) is NOT evidence of improvement. Per-day normalized rate, cumulative quarter-to-date count, and concentration risk are the real signals — anchor your headline on those.
- If the latest month shows a low number due to data partiality or a brief recovery, the headline must still surface the underlying problem (e.g. cumulative count, peak month, kabupaten concentration). GOOD: "Lonjakan MD November +100% belum tuntas — risiko struktural Kotawaringin Timur masih aktif". BAD: "Stabilisasi Korban MD Setelah Lonjakan November".
- key_finding (1-3 sentences) MUST: (a) state the headline problem in concrete numbers, (b) name the geographic/temporal concentration drivers using actual kabupaten/bulan names, (c) close with the JR consequence if unaddressed (beban Klaim A/B, korban tambahan). Avoid filler like "diperlukan vigilansi ketat" without specifying what to do or why.

Field-level rules:
- key_metrics[].label MUST be in Bahasa: "MD Bulan Ini", "Fatalitas Rate", "Tabrak Lari Rate", "Korban LL", "Total Santunan Tersalurkan". NEVER "Md incidents", "Hit-and-run cases".
- summaryCharts[].title MUST be a Bahasa narrative headline (e.g. "MD turun 58% setelah lonjakan November mereda" — NOT "Md incidents plunged 58% as safety measures take effect").
- Severity / priority enums (severity, priority, tier, action_scope) STAY in English (these are machine-read, not user-facing).
- Numeric/date formatting: ikuti aturan currency Bahasa (Rp Xjt / Rp XM), bulan dalam Bahasa ("Nov 2025"), persentase tetap "20%".
- Indonesian abbreviation hygiene: "Kab." and "Kota." are abbreviations — when they appear inside a sentence (e.g. "Kab. Pulang Pisau"), do NOT add an extra period at the sentence end. Sentence boundaries should be unambiguous capital-letter starts.`;

// ─── System Prompt Builder ──────────────────────────────────────────

export function buildSystemPrompt(
  specialist: { name: string; domain: string; description: string },
  skillMethodology?: string | null,
  knowledgeContext?: KnowledgeContextConfig | null,
): string {
  // Base identity — read from knowledge context, with domain-aware fallback
  const bc = knowledgeContext?.businessContext;
  const isJrsi = ["road-safety", "insurance", "data-ops"].includes(specialist.domain);
  const isLogistiq = specialist.domain.startsWith("logistiq") || ["supply-chain", "commercial", "customer", "finance"].includes(specialist.domain);
  const isBanking = specialist.domain === "banking";
  let companyIdentity: string;
  if (bc?.companyName) {
    const industryPart = bc.subIndustry || bc.industry || specialist.domain;
    const geoPart = bc.geography ? ` in ${bc.geography}` : "";
    companyIdentity = `${bc.companyName}, a ${industryPart} company${geoPart}`;
  } else if (isJrsi) {
    companyIdentity = "Jasa Raharja (PT Jasa Raharja, Persero) — BUMN penyalur santunan korban kecelakaan lalu lintas di Indonesia. Misi inti: mencegah kecelakaan agar korban (MD/LL) dan beban santunan (Klaim A/B) terus turun. Konteks data saat ini: kecelakaan lalu lintas di Kalimantan Tengah dari sistem IRSMS Polri";
  } else if (isBanking) {
    companyIdentity = "a banking institution in Indonesia operating a KPR (mortgage) lending business";
  } else if (isLogistiq) {
    companyIdentity = "LogistiQ, a third-party logistics (3PL) fulfillment company in Indonesia serving e-commerce and D2C brands";
  } else {
    companyIdentity = "TransportX, a bus transportation company in Indonesia";
  }

  let prompt = `You are ${specialist.name}, an AI monitoring specialist for ${companyIdentity}.

YOUR DOMAIN: ${specialist.domain}
YOUR ROLE: ${specialist.description}

You analyze real operational data to produce structured monitoring insights.

${GOVERNANCE_RULES}
`;

  // Domain-specific governance from knowledge context (replaces hardcoded LOGISTIQ_GOVERNANCE)
  if (knowledgeContext?.governanceRules?.length) {
    prompt += `\nDOMAIN-SPECIFIC GOVERNANCE RULES:\n`;
    knowledgeContext.governanceRules.forEach((rule, i) => {
      prompt += `${i + 1}. ${rule}\n`;
    });
    prompt += "\n";
  } else if (isJrsi) {
    prompt += "\n" + JRSI_GOVERNANCE + "\n\n" + JRSI_LANGUAGE_DIRECTIVE + "\n";
  } else if (isLogistiq && !isBanking) {
    // Legacy fallback for LogistiQ domains
    prompt += "\n" + LOGISTIQ_GOVERNANCE + "\n";
  }

  // Process chain injection (L4)
  if (knowledgeContext?.processChain?.length) {
    prompt += `\n=== PROCESS CHAIN (workflow stages) ===\n`;
    const sorted = [...knowledgeContext.processChain].sort((a, b) => a.order - b.order);
    sorted.forEach(stage => {
      prompt += `Stage ${stage.order}: ${stage.name}`;
      if (stage.description) prompt += ` — ${stage.description}`;
      if (stage.slaTarget) prompt += ` (SLA: ${stage.slaTarget.value} ${stage.slaTarget.unit})`;
      if (stage.metrics?.length) prompt += ` [Metrics: ${stage.metrics.join(', ')}]`;
      if (stage.owner) prompt += ` [Owner: ${stage.owner}]`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  // Failure mode library injection (L4)
  if (knowledgeContext?.failureModeLibrary?.length) {
    prompt += `=== KNOWN FAILURE MODES ===\n`;
    prompt += `When investigating anomalies, check these known failure patterns:\n`;
    knowledgeContext.failureModeLibrary.forEach(fm => {
      prompt += `- ${fm.name} (Stage: ${fm.stageId})`;
      if (fm.description) prompt += `: ${fm.description}`;
      prompt += `\n`;
      if (fm.dataSignature?.conditions?.length) {
        const sigParts = fm.dataSignature.conditions.map(c =>
          c.description || `${c.metric} ${c.operator} ${Array.isArray(c.value) ? c.value.join('-') : c.value}${c.unit || ''}`
        );
        prompt += `  Data signature (${fm.dataSignature.matchMode === 'all' ? 'ALL must match' : fm.dataSignature.matchMode === 'any' ? 'ANY can match' : `at least ${(fm.dataSignature.matchMode as {atLeast: number}).atLeast}`}): ${sigParts.join(', ')}\n`;
      }
      if (fm.cascadeEffect) prompt += `  Cascade: ${fm.cascadeEffect}\n`;
    });
    prompt += `\n`;
  }

  // Intervention library injection (L4)
  if (knowledgeContext?.interventionLibrary?.length) {
    prompt += `=== VALIDATED INTERVENTIONS ===\n`;
    prompt += `When recommending actions, prefer these validated interventions:\n`;
    knowledgeContext.interventionLibrary.forEach(iv => {
      prompt += `- ${iv.name} [${iv.actionType}/${iv.effort} effort]: ${iv.description}\n`;
      if (iv.expectedImpact) {
        prompt += `  Expected: ${iv.expectedImpact.type} impact`;
        if (iv.expectedImpact.timeToEffect) prompt += `, ${iv.expectedImpact.timeToEffect} to effect`;
        if (iv.expectedImpact.confidence) prompt += `, ${iv.expectedImpact.confidence}% confidence`;
        prompt += `\n`;
      }
      if (iv.tactics?.length) {
        prompt += `  Tactics: ${iv.tactics.join('; ')}\n`;
      }
    });
    prompt += `\n`;
  }

  // Investigation sequence instruction (L4)
  if (knowledgeContext?.investigationSequence) {
    const seq = knowledgeContext.investigationSequence;
    prompt += `INVESTIGATION ORDER: ${seq.order}\n`;
    if (seq.order === 'downstream-first') {
      prompt += `Investigate anomalies starting from output/customer-facing metrics, then trace upstream to find root cause.\n`;
    } else if (seq.order === 'upstream-first') {
      prompt += `Investigate anomalies starting from input/process metrics, then trace downstream impact.\n`;
    } else if (seq.order === 'severity-first') {
      prompt += `Investigate anomalies in order of severity (critical first).\n`;
    } else if (seq.order === 'custom' && seq.customSequence?.length) {
      prompt += `Follow this investigation sequence: ${seq.customSequence.join(' → ')}\n`;
    }
    if (seq.maxDepth) prompt += `Max investigation depth: ${seq.maxDepth} causal layers.\n`;
    prompt += `\n`;
  }

  // Seasonality context (L4)
  if (bc?.seasonality?.notes) {
    prompt += `SEASONALITY CONTEXT: ${bc.seasonality.notes}\n\n`;
  }

  // Inject skill methodology if available
  if (skillMethodology) {
    prompt += `=== ANALYSIS METHODOLOGY (YOU MUST FOLLOW THIS) ===

${skillMethodology}

=== END METHODOLOGY ===

`;
  }

  // JSON output requirement (always present — the UI needs structured JSON)
  prompt += `You MUST return ONLY valid JSON matching the exact schema below. No markdown, no explanation, no code fences — just the raw JSON object.

JSON OUTPUT SCHEMA:
${JSON_OUTPUT_SCHEMA}

${OUTPUT_RULES}`;

  return prompt;
}

/**
 * Build system prompt for INVESTIGATION runs.
 * Same identity, governance, L4 context, and skill methodology as standard —
 * but WITHOUT the standard JSON_OUTPUT_SCHEMA (the investigation schema is in the user prompt).
 */
export function buildInvestigationSystemPrompt(
  specialist: { name: string; domain: string; description: string },
  skillMethodology?: string | null,
  knowledgeContext?: KnowledgeContextConfig | null,
): string {
  // Reuse the identity + governance + L4 context portion
  const bc = knowledgeContext?.businessContext;
  const isJrsi = ["road-safety", "insurance", "data-ops"].includes(specialist.domain);
  const isLogistiq = specialist.domain.startsWith("logistiq") || ["supply-chain", "commercial", "customer", "finance"].includes(specialist.domain);
  const isBanking = specialist.domain === "banking";
  let companyIdentity: string;
  if (bc?.companyName) {
    const industryPart = bc.subIndustry || bc.industry || specialist.domain;
    const geoPart = bc.geography ? ` in ${bc.geography}` : "";
    companyIdentity = `${bc.companyName}, a ${industryPart} company${geoPart}`;
  } else if (isJrsi) {
    companyIdentity = "Jasa Raharja (PT Jasa Raharja, Persero) — BUMN penyalur santunan korban kecelakaan lalu lintas di Indonesia. Misi inti: mencegah kecelakaan agar korban (MD/LL) dan beban santunan (Klaim A/B) terus turun. Konteks data saat ini: kecelakaan lalu lintas di Kalimantan Tengah dari sistem IRSMS Polri";
  } else if (isBanking) {
    companyIdentity = "a banking institution in Indonesia operating a KPR (mortgage) lending business";
  } else if (isLogistiq) {
    companyIdentity = "LogistiQ, a third-party logistics (3PL) fulfillment company in Indonesia serving e-commerce and D2C brands";
  } else {
    companyIdentity = "TransportX, a bus transportation company in Indonesia";
  }

  let prompt = `You are ${specialist.name}, an AI monitoring specialist for ${companyIdentity}.

YOUR DOMAIN: ${specialist.domain}
YOUR ROLE: ${specialist.description}

You are conducting a DEEP INVESTIGATION of clustered anomalies. Your output must be a structured JSON investigation report.

${GOVERNANCE_RULES}
`;

  if (knowledgeContext?.governanceRules?.length) {
    prompt += `\nDOMAIN-SPECIFIC GOVERNANCE RULES:\n`;
    knowledgeContext.governanceRules.forEach((rule, i) => {
      prompt += `${i + 1}. ${rule}\n`;
    });
    prompt += "\n";
  } else if (isJrsi) {
    prompt += "\n" + JRSI_GOVERNANCE + "\n\n" + JRSI_LANGUAGE_DIRECTIVE + "\n";
  } else if (isLogistiq && !isBanking) {
    prompt += "\n" + LOGISTIQ_GOVERNANCE + "\n";
  }

  if (knowledgeContext?.processChain?.length) {
    prompt += `\n=== PROCESS CHAIN (workflow stages) ===\n`;
    const sorted = [...knowledgeContext.processChain].sort((a, b) => a.order - b.order);
    sorted.forEach(stage => {
      prompt += `Stage ${stage.order}: ${stage.name}`;
      if (stage.description) prompt += ` — ${stage.description}`;
      if (stage.slaTarget) prompt += ` (SLA: ${stage.slaTarget.value} ${stage.slaTarget.unit})`;
      if (stage.metrics?.length) prompt += ` [Metrics: ${stage.metrics.join(', ')}]`;
      if (stage.owner) prompt += ` [Owner: ${stage.owner}]`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  if (knowledgeContext?.failureModeLibrary?.length) {
    prompt += `=== KNOWN FAILURE MODES ===\n`;
    prompt += `When investigating anomalies, check these known failure patterns:\n`;
    knowledgeContext.failureModeLibrary.forEach(fm => {
      prompt += `- ${fm.name} (Stage: ${fm.stageId})`;
      if (fm.description) prompt += `: ${fm.description}`;
      prompt += `\n`;
      if (fm.dataSignature?.conditions?.length) {
        const sigParts = fm.dataSignature.conditions.map(c =>
          c.description || `${c.metric} ${c.operator} ${Array.isArray(c.value) ? c.value.join('-') : c.value}${c.unit || ''}`
        );
        prompt += `  Data signature (${fm.dataSignature.matchMode === 'all' ? 'ALL must match' : fm.dataSignature.matchMode === 'any' ? 'ANY can match' : `at least ${(fm.dataSignature.matchMode as {atLeast: number}).atLeast}`}): ${sigParts.join(', ')}\n`;
      }
      if (fm.cascadeEffect) prompt += `  Cascade: ${fm.cascadeEffect}\n`;
    });
    prompt += `\n`;
  }

  if (knowledgeContext?.interventionLibrary?.length) {
    prompt += `=== VALIDATED INTERVENTIONS ===\n`;
    prompt += `When recommending actions, prefer these validated interventions:\n`;
    knowledgeContext.interventionLibrary.forEach(iv => {
      prompt += `- ${iv.name} [${iv.actionType}/${iv.effort} effort]: ${iv.description}\n`;
      if (iv.expectedImpact) {
        prompt += `  Expected: ${iv.expectedImpact.type} impact`;
        if (iv.expectedImpact.timeToEffect) prompt += `, ${iv.expectedImpact.timeToEffect} to effect`;
        if (iv.expectedImpact.confidence) prompt += `, ${iv.expectedImpact.confidence}% confidence`;
        prompt += `\n`;
      }
      if (iv.tactics?.length) {
        prompt += `  Tactics: ${iv.tactics.join('; ')}\n`;
      }
    });
    prompt += `\n`;
  }

  if (knowledgeContext?.investigationSequence) {
    const seq = knowledgeContext.investigationSequence;
    prompt += `INVESTIGATION ORDER: ${seq.order}\n`;
    if (seq.order === 'downstream-first') {
      prompt += `Investigate anomalies starting from output/customer-facing metrics, then trace upstream to find root cause.\n`;
    } else if (seq.order === 'upstream-first') {
      prompt += `Investigate anomalies starting from input/process metrics, then trace downstream impact.\n`;
    } else if (seq.order === 'severity-first') {
      prompt += `Investigate anomalies in order of severity (critical first).\n`;
    } else if (seq.order === 'custom' && seq.customSequence?.length) {
      prompt += `Follow this investigation sequence: ${seq.customSequence.join(' → ')}\n`;
    }
    if (seq.maxDepth) prompt += `Max investigation depth: ${seq.maxDepth} causal layers.\n`;
    prompt += `\n`;
  }

  if (bc?.seasonality?.notes) {
    prompt += `SEASONALITY CONTEXT: ${bc.seasonality.notes}\n\n`;
  }

  if (skillMethodology) {
    prompt += `=== ANALYSIS METHODOLOGY (YOU MUST FOLLOW THIS) ===

${skillMethodology}

=== END METHODOLOGY ===

`;
  }

  prompt += `You MUST return ONLY valid JSON matching the investigation schema specified in the user prompt. No markdown, no explanation, no code fences — just the raw JSON object.`;

  return prompt;
}

// ─── User Prompt Builder ────────────────────────────────────────────

export function buildUserPrompt(
  specialist: { name: string; domain: string },
  config: SpecialistConfig,
  dbDataText: string,
  otherSpecialists: string[],
  anomalyResult?: AnomalyDetectorResult | null,
  decomposition?: DecompositionResult[] | null,
  patternMemory?: PatternMemoryEntry[] | null,
): string {
  let prompt = `Analyze the following database data for ${specialist.name} (domain: ${specialist.domain}).\n\n`;

  // Monitoring rules
  if (config.monitoringRules && config.monitoringRules.length > 0) {
    prompt += "MONITORING RULES TO EVALUATE:\n";
    for (const rule of config.monitoringRules) {
      if (!rule.enabled) continue;
      prompt += `  - [${rule.severity.toUpperCase()}] ${rule.name}: ${rule.whenCondition} ${rule.whenValue}${rule.whenUnit || ""} (scope: ${rule.forScope || "all"})\n`;
    }
    prompt += "\n";
  }

  // Pre-detected anomalies (L5 statistical pre-processing)
  if (anomalyResult?.anomalies?.length) {
    prompt += `=== PRE-DETECTED ANOMALIES (statistical analysis — you MUST incorporate these) ===\n`;
    prompt += `Data quality: completeness=${anomalyResult.dataQuality.completeness}%, freshness=${anomalyResult.dataQuality.freshness}, rows=${anomalyResult.dataQuality.rowCount}\n\n`;
    for (const a of anomalyResult.anomalies) {
      prompt += `[${a.severity.toUpperCase()}] ${a.metric}: ${a.description}`;
      if (a.deviation !== 0) prompt += ` (deviation: ${a.deviation > 0 ? '+' : ''}${a.deviation.toFixed(1)}%)`;
      prompt += ` [type: ${a.deviationType}]\n`;
    }
    prompt += `\nYou MUST incorporate these pre-detected anomalies into your analysis. Do not contradict them unless you find clear evidence in the data.\n\n`;
  }

  // Dimension decomposition (L5 statistical pre-processing)
  if (decomposition?.length) {
    prompt += `=== DIMENSION DECOMPOSITION (statistical attribution) ===\n`;
    for (const d of decomposition) {
      prompt += `Metric: ${d.metric} (total deviation: ${d.totalDeviation > 0 ? '+' : ''}${d.totalDeviation.toFixed(1)}%)\n`;
      prompt += `Top contributors (${d.decompositionMethod}):\n`;
      for (const c of d.topContributors) {
        prompt += `  - ${c.dimension}="${c.value}": ${c.contribution}% of total (value: ${c.metricValue}, count: ${c.count})\n`;
      }
    }
    prompt += `\nUse these dimensional breakdowns to identify root cause attribution.\n\n`;
  }

  // Historical pattern memory (L4)
  if (patternMemory?.length) {
    prompt += `=== HISTORICAL PATTERNS (from pattern memory) ===\n`;
    prompt += `Recent confirmed patterns for this specialist:\n`;
    for (const p of patternMemory) {
      prompt += `- [${p.outcome || 'pending'}] ${p.anomalySignature.metric} (deviation: ${p.anomalySignature.deviation}%)`;
      if (p.confirmedRootCause) prompt += ` → Root cause: ${p.confirmedRootCause}`;
      if (p.interventionApplied) prompt += ` → Intervention: ${p.interventionApplied}`;
      if (p.learningNote) prompt += ` | Note: ${p.learningNote}`;
      prompt += `\n`;
    }
    prompt += `\nConsider these historical patterns when analyzing current data. Flag recurring issues.\n\n`;
  }

  // Other active specialists for cross-specialist signals
  if (otherSpecialists.length > 0) {
    prompt += `OTHER ACTIVE SPECIALISTS (for cross_specialist_signals):\n`;
    for (const s of otherSpecialists) {
      prompt += `  - ${s}\n`;
    }
    prompt += "\n";
  }

  prompt += dbDataText;

  return prompt;
}
