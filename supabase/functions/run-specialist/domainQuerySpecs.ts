// =============================================================================
// Domain → Query Specs Mapping
// Maps specialist domains to their Supabase query configurations.
//
// Supports multiple projects:
//   LogistiQ 3PL (oxotsdusfrtzjsugkszu): fact_orders, dim_client, dim_warehouse, ...
//   Bank OP KPR (eohyektwumoufngzjvmz): kpr_applications, v_kpr_weekly_funnel, ...
//
// Each domain case queries tables specific to that project's schema.
// The edge function is deployed per-project, so only the matching domain
// case will ever execute — but ALL cases are kept in a single codebase.
// =============================================================================

import type { QueryContextSpec, QueryScope, SpecialistConfig } from "./types.ts";

export const ROLLING_13M_FLOOR = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 13);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
})();

// ── Shared fact_orders spec (LogistiQ domains) ──

function factOrdersSpec(selectCols: string[]): QueryContextSpec {
  return {
    table: "fact_orders",
    select: selectCols,
    dateField: "order_date",
    filters: [
      { field: "order_date", operator: "gte", value: ROLLING_13M_FLOOR },
    ],
    orderBy: { field: "order_date", ascending: false },
    limit: 1000,
  };
}

/** Apply a QueryScope to query specs — replaces hardcoded date floors with dynamic ranges,
 *  injects dimension filters, and adjusts limits. Schema-agnostic: uses each spec's dateField hint. */
export function applyScopeToSpecs(specs: QueryContextSpec[], scope?: QueryScope): QueryContextSpec[] {
  if (!scope) return specs;

  return specs.map(spec => {
    const patched = { ...spec, filters: [...(spec.filters || [])] };

    // Time scope: replace existing gte filter on dateField, or add one
    if (scope.time?.start && spec.dateField) {
      const idx = patched.filters.findIndex(f => f.field === spec.dateField && f.operator === 'gte');
      if (idx >= 0) {
        patched.filters[idx] = { ...patched.filters[idx], value: scope.time.start };
      } else {
        patched.filters.push({ field: spec.dateField, operator: 'gte', value: scope.time.start });
      }
    }
    if (scope.time?.end && spec.dateField) {
      const idx = patched.filters.findIndex(f => f.field === spec.dateField && f.operator === 'lte');
      if (idx >= 0) {
        patched.filters[idx] = { ...patched.filters[idx], value: scope.time.end };
      } else {
        patched.filters.push({ field: spec.dateField, operator: 'lte', value: scope.time.end });
      }
    }

    // Dimension filters: apply as eq/in filters
    if (scope.filters) {
      for (const [field, value] of Object.entries(scope.filters)) {
        // Only apply if this table has this column in its select list (or selects *)
        if (spec.select.includes('*') || spec.select.includes(field)) {
          if (Array.isArray(value)) {
            patched.filters.push({ field, operator: 'in', value });
          } else {
            patched.filters.push({ field, operator: 'eq', value });
          }
        }
      }
    }

    // Dynamic limit override
    if (scope.limit && !spec.limit) {
      patched.limit = scope.limit;
    }

    return patched;
  });
}

export function getQuerySpecsForDomain(
  domain: string,
  _config: SpecialistConfig,
): QueryContextSpec[] {
  const specs: QueryContextSpec[] = [];

  // Always include business dictionary (gracefully returns [] if table doesn't exist)
  specs.push({
    table: "metadata_business_dictionary",
    select: ["term", "business_definition", "agent_guidance"],
    limit: 40,
  });

  switch (domain) {
    // ── Operations / Supply-Chain (LogistiQ) ──
    case "supply-chain":
      specs.push(
        factOrdersSpec([
          "order_id", "order_date", "order_status", "is_returned",
          "client_id", "warehouse_id", "delivery_partner_id",
          "channel_type", "avg_delivery_hours",
          "num_items", "quantity", "total_weight_kg",
          "shipping_cost", "returns_cost",
          "total_fulfillment_fee", "logistiq_revenue", "logistiq_direct_costs",
          "contribution_margin", "contribution_margin_pct",
          "storage_days", "pallets_used",
        ]),
        {
          table: "dim_warehouse",
          select: [
            "warehouse_id", "warehouse_name", "warehouse_location",
            "total_capacity_pallets", "rent_per_month",
            "has_kitting_facility", "has_qc_station",
          ],
        },
        {
          table: "dim_delivery_partner",
          select: [
            "delivery_partner_id", "partner_name", "service_type",
            "base_rate_per_kg", "avg_delivery_hours",
            "coverage_area", "is_active",
          ],
        },
        {
          table: "dim_client",
          select: [
            "client_id", "client_name", "industry",
            "storage_type_primary", "target_orders_monthly",
          ],
        }
      );
      break;

    // ── Revenue / Commercial (LogistiQ) ──
    case "commercial":
      specs.push(
        factOrdersSpec([
          "order_id", "order_date", "order_status", "is_returned",
          "client_id", "channel_type",
          "gmv", "total_cogs",
          "logistiq_revenue", "logistiq_direct_costs",
          "contribution_margin", "contribution_margin_pct",
          "total_fulfillment_fee",
          "receiving_fee", "storage_fee", "pick_pack_fee",
          "kitting_fee", "qc_inspection_fee", "special_packaging_fee",
          "shipping_cost", "returns_cost",
          "num_items", "quantity",
        ]),
        {
          table: "dim_client",
          select: [
            "client_id", "client_name", "industry",
            "storage_type_primary", "monthly_min_commitment",
            "target_orders_monthly", "avg_aov_target",
            "special_requirements",
          ],
        },
        {
          table: "dim_channel",
          select: [
            "channel_id", "channel_name", "channel_type",
          ],
        }
      );
      break;

    // ── Customer Experience (LogistiQ) ──
    case "customer":
      specs.push(
        factOrdersSpec([
          "order_id", "order_date", "order_status", "is_returned",
          "client_id", "channel_type",
          "avg_delivery_hours",
          "gmv", "logistiq_revenue", "logistiq_direct_costs",
          "contribution_margin", "contribution_margin_pct",
          "shipping_cost", "returns_cost",
          "num_items", "quantity",
        ]),
        {
          table: "dim_client",
          select: [
            "client_id", "client_name", "industry",
            "target_orders_monthly", "special_requirements",
          ],
        },
        {
          table: "dim_delivery_partner",
          select: [
            "delivery_partner_id", "partner_name", "service_type",
            "avg_delivery_hours", "is_active",
          ],
        }
      );
      break;

    // ── Finance / Cost Optimization (LogistiQ) ──
    case "finance":
      specs.push(
        factOrdersSpec([
          "order_id", "order_date", "order_status", "is_returned",
          "client_id", "warehouse_id", "delivery_partner_id",
          "gmv", "total_cogs",
          "receiving_fee", "storage_fee", "pick_pack_fee",
          "kitting_fee", "qc_inspection_fee", "special_packaging_fee",
          "total_fulfillment_fee",
          "shipping_cost", "returns_cost",
          "logistiq_revenue", "logistiq_direct_costs",
          "contribution_margin", "contribution_margin_pct",
          "storage_days", "pallets_used",
          "total_weight_kg",
        ]),
        {
          table: "dim_warehouse",
          select: [
            "warehouse_id", "warehouse_name", "warehouse_location",
            "total_capacity_pallets", "rent_per_month",
            "has_kitting_facility", "has_qc_station",
          ],
        },
        {
          table: "dim_client",
          select: [
            "client_id", "client_name", "industry",
            "monthly_min_commitment", "avg_aov_target",
          ],
        },
        {
          table: "dim_delivery_partner",
          select: [
            "delivery_partner_id", "partner_name", "service_type",
            "base_rate_per_kg", "avg_delivery_hours",
            "coverage_area", "is_active",
          ],
        }
      );
      break;

    // ── LogistiQ Revenue (full 3PL view) ──
    case "logistiq-revenue":
      specs.push(
        factOrdersSpec([
          "order_id", "order_date", "order_status",
          "is_returned", "num_items", "quantity", "total_weight_kg",
          "client_id", "channel_type",
          "warehouse_id", "delivery_partner_id",
          "gmv", "total_cogs",
          "receiving_fee", "storage_fee", "pick_pack_fee",
          "kitting_fee", "qc_inspection_fee", "special_packaging_fee",
          "total_fulfillment_fee", "shipping_cost", "returns_cost",
          "logistiq_revenue", "logistiq_direct_costs",
          "contribution_margin", "contribution_margin_pct",
          "storage_days", "pallets_used",
        ]),
        {
          table: "dim_client",
          select: [
            "client_id", "client_name", "industry", "storage_type_primary",
            "monthly_min_commitment", "target_orders_monthly", "avg_aov_target",
            "special_requirements",
          ],
        },
        {
          table: "dim_warehouse",
          select: [
            "warehouse_id", "warehouse_name", "warehouse_location",
            "total_capacity_pallets", "rent_per_month",
            "has_kitting_facility", "has_qc_station",
          ],
        }
      );
      break;

    // ── Banking / KPR Mortgage ──
    // Column names verified against actual DB schema (2026-03-25):
    //   v_kpr_weekly_funnel: week_number, channel, total_leads, funded, ...
    //   kpr_applications: application_id, lead_created_date, channel, ...
    case "banking":
      specs.push(
        {
          table: "v_kpr_weekly_funnel",
          select: ["*"],
          dateField: "week_number",
          orderBy: { field: "week_number", ascending: false },
          limit: 52,
        },
        {
          table: "kpr_applications",
          select: ["*"],
          dateField: "lead_created_date",
          orderBy: { field: "lead_created_date", ascending: false },
          limit: 1000,
        },
        {
          table: "kpr_weekly_targets",
          select: ["*"],
          dateField: "week_number",
          limit: 52,
        },
        {
          table: "v_kpr_channel_summary",
          select: ["*"],
          limit: 50,
        },
        {
          table: "kpr_dimensional_breakdown",
          select: ["*"],
          limit: 500,
        },
        {
          table: "kpr_weekly_metrics",
          select: ["*"],
          limit: 200,
        },
        {
          table: "kpr_weekly_channel_metrics",
          select: ["*"],
          limit: 200,
        },
      );
      break;

    // ── JRSI Road Safety ──
    case "road-safety":
      specs.push(
        {
          table: "jrsi irsms example",
          select: [
            "idKecelakaan", "tanggal", "waktu", "hari", "isWeekend", "monthYear", "hourBucket",
            "provinsi", "kabupatenKota", "kecamatan",
            "severityMax", "jumlahMd", "jumlahLl", "totalKorban", "bobotLaka",
            "kasusLaka", "sifatKecelakaan", "lakajol",
            "jumlahKendaraan", "kendaraanSepedaMotor", "kendaraanMobilPenumpang", "kendaraanTruk",
            "extractedBrand", "extractedModel", "extractedBrandModel",
            "extractedCauses", "extracted4mCategories",
            "surfaceCondName", "weatherName", "roadLight", "roadGeometry",
            "statusJalan", "fungsiJalan", "gpsLuN", "gpsLsN",
            "jumlahKlaimA", "jumlahKlaimB",
            "deskripsiKecelakaan",
          ],
          dateField: "tanggal",
          orderBy: { field: "tanggal", ascending: false },
          limit: 500,
        },
        {
          table: "metric_definitions",
          select: ["id", "name", "definition", "formula", "domain", "computed_value", "notes"],
          filters: [{ field: "workspace_id", operator: "eq", value: "32ef0116-97ea-4f39-ad9b-9a978862b9a2" }],
          limit: 50,
        }
      );
      break;

    // ── JRSI Insurance & Claims ──
    case "insurance":
      specs.push(
        {
          table: "jrsi irsms example",
          select: [
            "idKecelakaan", "tanggal", "monthYear", "kabupatenKota",
            "severityMax", "jumlahMd", "jumlahLl", "totalKorban",
            "sifatKecelakaan", "jumlahBerkas",
            "jumlahKlaimA", "jumlahGl", "jumlahKlaimB",
            "flagTotalMismatch", "flagKendaraanMismatch",
          ],
          dateField: "tanggal",
          orderBy: { field: "tanggal", ascending: false },
          limit: 500,
        }
      );
      break;

    // ── JRSI Data Operations ──
    case "data-ops":
      specs.push(
        {
          table: "jrsi irsms example",
          select: [
            "idKecelakaan", "tanggal", "gpsLuN", "gpsLsN",
            "extractedBrand", "extractedModel", "extractedCauses", "extracted4mCategories",
            "extractedRuasJalan", "extractedKm",
            "jumlahKendaraan", "kendaraanSepedaMotor", "kendaraanMobilPenumpang",
            "kendaraanTruk", "kendaraanPickup",
            "flagTotalMismatch", "flagKendaraanMismatch", "flagIdFormatAnomaly",
          ],
          dateField: "tanggal",
          orderBy: { field: "tanggal", ascending: false },
          limit: 500,
        }
      );
      break;

    default:
      // ── GUARDRAIL: Unknown domain → fail loudly instead of silently returning empty ──
      console.error(`[DOMAIN GUARDRAIL] ⚠️ Unknown domain "${domain}" — no query specs defined. Known domains: road-safety, insurance, data-ops, supply-chain, commercial, customer, finance, logistiq-revenue, banking`);
      break;
  }

  return specs;
}
