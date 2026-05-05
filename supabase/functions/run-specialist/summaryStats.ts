// =============================================================================
// Summary Statistics — Computes aggregated metrics from raw DB rows
// =============================================================================

export function computeSummaryStats(data: Record<string, unknown>): void {
  computeRevenueStats(data);
  computeNpsStats(data);
  computeTripStats(data);
  computeFunnelStats(data);
  computeVehicleRevenueStats(data);
  computeLogistiqStats(data);
  computeBankingKprStats(data);
}

// ─── Revenue ────────────────────────────────────────────────────────

function computeRevenueStats(data: Record<string, unknown>): void {
  const revenue = data["fact_revenue"] as { gross_value_amount?: number; booking_datetime?: string; origin_city?: string; destination_city?: string; ticket_status?: string }[] | undefined;
  if (!Array.isArray(revenue) || revenue.length === 0) return;

  const activeRevenue = revenue.filter(r => r.ticket_status !== 'cancelled');
  data.totalRevenue = activeRevenue.reduce((s, r) => s + (r.gross_value_amount || 0), 0);
  data.transactionCount = activeRevenue.length;
  data.cancelledCount = revenue.length - activeRevenue.length;
  data.cancellationRate = Math.round(((revenue.length - activeRevenue.length) / revenue.length) * 100);

  const byMonth = new Map<string, { revenue: number; count: number; cancelled: number }>();
  for (const r of revenue) {
    const m = (r.booking_datetime || "").slice(0, 7);
    if (!m) continue;
    const e = byMonth.get(m) || { revenue: 0, count: 0, cancelled: 0 };
    e.revenue += r.gross_value_amount || 0;
    e.count++;
    if (r.ticket_status === 'cancelled') e.cancelled++;
    byMonth.set(m, e);
  }
  data.revenueByMonth = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, revenue: Math.round(v.revenue), transactions: v.count, cancelled: v.cancelled }));

  const byRoute = new Map<string, number>();
  for (const r of activeRevenue) {
    const route = r.origin_city && r.destination_city ? `${r.origin_city}-${r.destination_city}` : "Unknown";
    byRoute.set(route, (byRoute.get(route) || 0) + (r.gross_value_amount || 0));
  }
  data.revenueByRoute = Array.from(byRoute.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([route, rev]) => ({ route, revenue: Math.round(rev) }));
}

// ─── NPS ────────────────────────────────────────────────────────────

function computeNpsStats(data: Record<string, unknown>): void {
  const nps = data["fact_nps_response"] as { promoters_count?: number; detractors_count?: number; passives_count?: number; total_responses?: number; month?: string; route_id?: string; customer_type?: string }[] | undefined;
  if (!Array.isArray(nps) || nps.length === 0) return;

  const tp = nps.reduce((s, n) => s + (n.promoters_count || 0), 0);
  const td = nps.reduce((s, n) => s + (n.detractors_count || 0), 0);
  const tr = nps.reduce((s, n) => s + (n.total_responses || 0), 0);
  if (tr > 0) {
    data.npsScore = Math.round(((tp - td) / tr) * 100);
    data.promotersPercent = Math.round((tp / tr) * 100);
    data.detractorsPercent = Math.round((td / tr) * 100);
  }

  const byMonth = new Map<string, { p: number; d: number; t: number }>();
  for (const n of nps) {
    const m = n.month || "";
    if (!m) continue;
    const e = byMonth.get(m) || { p: 0, d: 0, t: 0 };
    e.p += n.promoters_count || 0;
    e.d += n.detractors_count || 0;
    e.t += n.total_responses || 0;
    byMonth.set(m, e);
  }
  data.npsByMonth = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      nps: v.t > 0 ? Math.round(((v.p - v.d) / v.t) * 100) : 0,
      responses: v.t,
    }));

  const byRoute = new Map<string, { p: number; d: number; t: number }>();
  for (const n of nps) {
    const rid = n.route_id || "Unknown";
    const e = byRoute.get(rid) || { p: 0, d: 0, t: 0 };
    e.p += n.promoters_count || 0;
    e.d += n.detractors_count || 0;
    e.t += n.total_responses || 0;
    byRoute.set(rid, e);
  }
  data.npsByRoute = Array.from(byRoute.entries())
    .map(([route, v]) => ({
      route,
      nps: v.t > 0 ? Math.round(((v.p - v.d) / v.t) * 100) : 0,
      responses: v.t,
    }));

  const byType = new Map<string, { p: number; d: number; t: number }>();
  for (const n of nps) {
    const ct = n.customer_type || "Unknown";
    const e = byType.get(ct) || { p: 0, d: 0, t: 0 };
    e.p += n.promoters_count || 0;
    e.d += n.detractors_count || 0;
    e.t += n.total_responses || 0;
    byType.set(ct, e);
  }
  data.npsByCustomerType = Array.from(byType.entries())
    .map(([type, v]) => ({
      type,
      nps: v.t > 0 ? Math.round(((v.p - v.d) / v.t) * 100) : 0,
      responses: v.t,
    }));
}

// ─── Trips / OTP ────────────────────────────────────────────────────

function computeTripStats(data: Record<string, unknown>): void {
  const trips = data["fact_trip"] as { is_on_time?: boolean; trip_date?: string; delay_minutes?: number; route_id?: string; driver_id?: string; trip_status?: string }[] | undefined;
  if (!Array.isArray(trips) || trips.length === 0) return;

  const completedTrips = trips.filter(t => t.trip_status !== 'cancelled');
  const onTime = completedTrips.filter((t) => t.is_on_time).length;
  data.totalTrips = completedTrips.length;
  data.onTimeTrips = onTime;
  data.otpPercent = Math.round((onTime / completedTrips.length) * 100);
  data.avgDelayMinutes = Math.round(
    completedTrips.reduce((s, t) => s + (t.delay_minutes || 0), 0) / completedTrips.length
  );

  const byMonth = new Map<string, { total: number; onTime: number; delay: number }>();
  for (const t of completedTrips) {
    const m = (t.trip_date || "").slice(0, 7);
    if (!m) continue;
    const e = byMonth.get(m) || { total: 0, onTime: 0, delay: 0 };
    e.total++;
    if (t.is_on_time) e.onTime++;
    e.delay += t.delay_minutes || 0;
    byMonth.set(m, e);
  }
  data.otpByMonth = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      otpPercent: Math.round((v.onTime / v.total) * 100),
      trips: v.total,
      avgDelay: Math.round(v.delay / v.total),
    }));

  const byRoute = new Map<string, { total: number; onTime: number; delay: number }>();
  for (const t of completedTrips) {
    const rid = t.route_id || "Unknown";
    const e = byRoute.get(rid) || { total: 0, onTime: 0, delay: 0 };
    e.total++;
    if (t.is_on_time) e.onTime++;
    e.delay += t.delay_minutes || 0;
    byRoute.set(rid, e);
  }
  data.otpByRoute = Array.from(byRoute.entries())
    .map(([route, v]) => ({
      route,
      otpPercent: Math.round((v.onTime / v.total) * 100),
      trips: v.total,
      avgDelay: Math.round(v.delay / v.total),
    }));

  const byDriver = new Map<string, { total: number; onTime: number; delay: number }>();
  for (const t of completedTrips) {
    const did = t.driver_id || "Unknown";
    const e = byDriver.get(did) || { total: 0, onTime: 0, delay: 0 };
    e.total++;
    if (t.is_on_time) e.onTime++;
    e.delay += t.delay_minutes || 0;
    byDriver.set(did, e);
  }
  data.otpByDriver = Array.from(byDriver.entries())
    .sort(([, a], [, b]) => (a.onTime / a.total) - (b.onTime / b.total))
    .slice(0, 20)
    .map(([driver, v]) => ({
      driver,
      otpPercent: Math.round((v.onTime / v.total) * 100),
      trips: v.total,
      avgDelay: Math.round(v.delay / v.total),
    }));
}

// ─── Funnel ─────────────────────────────────────────────────────────

function computeFunnelStats(data: Record<string, unknown>): void {
  const funnel = data["fact_funnel"] as { homepage_flag?: boolean; booking_page_flag?: boolean; trip_input_page_flag?: boolean; trip_option_page_flag?: boolean; seat_option_page_flag?: boolean }[] | undefined;
  if (!Array.isArray(funnel) || funnel.length === 0) return;

  data.totalSessions = funnel.length;
  data.homepageVisits = funnel.filter((f) => f.homepage_flag).length;
  data.tripInputVisits = funnel.filter((f) => f.trip_input_page_flag).length;
  data.tripOptionVisits = funnel.filter((f) => f.trip_option_page_flag).length;
  data.seatOptionVisits = funnel.filter((f) => f.seat_option_page_flag).length;
  data.completedBookings = funnel.filter((f) => f.booking_page_flag).length;
  data.conversionRate = Math.round(
    ((data.completedBookings as number) / (data.totalSessions as number)) * 100
  );

  const stages = [
    data.totalSessions as number,
    data.homepageVisits as number,
    data.tripInputVisits as number,
    data.tripOptionVisits as number,
    data.seatOptionVisits as number,
    data.completedBookings as number,
  ];
  const stageNames = ["Sessions", "Homepage", "Trip Input", "Trip Options", "Seat Selection", "Booking Complete"];
  data.funnelStages = stageNames.map((name, i) => ({
    stage: name,
    count: stages[i],
    dropOffPct: i > 0 && stages[i - 1] > 0
      ? Math.round(((stages[i - 1] - stages[i]) / stages[i - 1]) * 100)
      : 0,
  }));
}

// ─── Vehicle Revenue ────────────────────────────────────────────────

function computeVehicleRevenueStats(data: Record<string, unknown>): void {
  const vrev = data["fact_vehicle_revenue"] as { total_revenue?: number; operating_cost?: number; fleet_id?: string }[] | undefined;
  if (!Array.isArray(vrev) || vrev.length === 0) return;

  data.totalVehicleRevenue = vrev.reduce((s, v) => s + (Number(v.total_revenue) || 0), 0);
  data.totalOperatingCost = vrev.reduce((s, v) => s + (Number(v.operating_cost) || 0), 0);
  data.fleetMargin = data.totalVehicleRevenue
    ? Math.round(((data.totalVehicleRevenue as number - (data.totalOperatingCost as number)) / (data.totalVehicleRevenue as number)) * 100)
    : 0;
}

// ─── LogistiQ Revenue ───────────────────────────────────────────────

function computeLogistiqStats(data: Record<string, unknown>): void {
  // Support both "logistiq_orders_flat" (legacy) and "fact_orders" (domain query specs)
  const lqOrders = (data["logistiq_orders_flat"] || data["fact_orders"]) as {
    order_id?: string; order_month?: string; order_date?: string;
    client_id?: string; client_name?: string;
    is_returned?: boolean; gmv?: number; logistiq_revenue?: number;
    logistiq_direct_costs?: number; contribution_margin?: number;
    contribution_margin_pct?: number; shipping_cost?: number; returns_cost?: number;
    receiving_fee?: number; storage_fee?: number; pick_pack_fee?: number;
    qc_inspection_fee?: number; special_packaging_fee?: number;
    warehouse_id?: string; delivery_partner_id?: string;
  }[] | undefined;
  const lqClients = (data["logistiq_dim_clients"] || data["dim_client"]) as {
    client_id?: string; client_name?: string; monthly_min_commitment?: number;
    target_orders_monthly?: number; avg_aov_target?: number;
  }[] | undefined;

  if (!Array.isArray(lqOrders) || lqOrders.length === 0) return;

  // Helper: derive month from order_month or order_date
  const getMonth = (o: { order_month?: string; order_date?: string }) =>
    o.order_month || (o.order_date ? o.order_date.slice(0, 7) : "Unknown");

  // Overall KPIs
  const totalRev = lqOrders.reduce((s, o) => s + (Number(o.logistiq_revenue) || 0), 0);
  const totalCosts = lqOrders.reduce((s, o) => s + (Number(o.logistiq_direct_costs) || 0), 0);
  const totalCM = lqOrders.reduce((s, o) => s + (Number(o.contribution_margin) || 0), 0);
  const totalGMV = lqOrders.reduce((s, o) => s + (Number(o.gmv) || 0), 0);
  const returnedOrders = lqOrders.filter(o => o.is_returned).length;
  const negCMOrders = lqOrders.filter(o => (Number(o.contribution_margin) || 0) < 0);

  data.logistiqTotalRevenue = Math.round(totalRev);
  data.logistiqTotalDirectCosts = Math.round(totalCosts);
  data.logistiqTotalCM = Math.round(totalCM);
  data.logistiqAvgCMPct = lqOrders.length > 0
    ? Math.round((totalCM / totalRev) * 1000) / 10
    : 0;
  data.logistiqOrderCount = lqOrders.length;
  data.logistiqTotalGMV = Math.round(totalGMV);
  data.logistiqReturnRate = Math.round((returnedOrders / lqOrders.length) * 1000) / 10;
  data.logistiqNegativeCMCount = negCMOrders.length;

  // By client
  const byClient = new Map<string, {
    name: string; orders: number; revenue: number; cm: number; gmv: number;
    returned: number; shipping: number; returns_cost: number;
  }>();
  for (const o of lqOrders) {
    const cid = o.client_id || "Unknown";
    const e = byClient.get(cid) || { name: o.client_name || cid, orders: 0, revenue: 0, cm: 0, gmv: 0, returned: 0, shipping: 0, returns_cost: 0 };
    e.orders++;
    e.revenue += Number(o.logistiq_revenue) || 0;
    e.cm += Number(o.contribution_margin) || 0;
    e.gmv += Number(o.gmv) || 0;
    e.shipping += Number(o.shipping_cost) || 0;
    e.returns_cost += Number(o.returns_cost) || 0;
    if (o.is_returned) e.returned++;
    byClient.set(cid, e);
  }
  data.logistiqByClient = Array.from(byClient.entries()).map(([cid, v]) => ({
    client_id: cid,
    client_name: v.name,
    orders: v.orders,
    revenue: Math.round(v.revenue),
    cm: Math.round(v.cm),
    cm_pct: v.revenue > 0 ? Math.round((v.cm / v.revenue) * 1000) / 10 : 0,
    gmv: Math.round(v.gmv),
    aov: v.orders > 0 ? Math.round(v.gmv / v.orders) : 0,
    return_rate: v.orders > 0 ? Math.round((v.returned / v.orders) * 1000) / 10 : 0,
  }));

  // Commitment comparison
  if (Array.isArray(lqClients)) {
    const byClientMonth = new Map<string, Map<string, { revenue: number; orders: number }>>();
    for (const o of lqOrders) {
      const cid = o.client_id || "Unknown";
      const month = getMonth(o);
      if (!byClientMonth.has(cid)) byClientMonth.set(cid, new Map());
      const cm = byClientMonth.get(cid)!;
      const e = cm.get(month) || { revenue: 0, orders: 0 };
      e.revenue += Number(o.logistiq_revenue) || 0;
      e.orders++;
      cm.set(month, e);
    }

    data.logistiqCommitmentStatus = lqClients.map(c => {
      const cid = c.client_id || "";
      const months = byClientMonth.get(cid);
      const monthlyData = months ? Array.from(months.entries()).map(([m, v]) => ({
        month: m,
        actual_revenue: Math.round(v.revenue),
        target_revenue: c.monthly_min_commitment || 0,
        revenue_pct: (c.monthly_min_commitment || 0) > 0
          ? Math.round((v.revenue / (c.monthly_min_commitment || 1)) * 1000) / 10
          : 0,
        actual_orders: v.orders,
        target_orders: c.target_orders_monthly || 0,
      })).sort((a, b) => a.month.localeCompare(b.month)) : [];

      return {
        client_id: cid,
        client_name: c.client_name || cid,
        monthly_min_commitment: c.monthly_min_commitment || 0,
        target_orders_monthly: c.target_orders_monthly || 0,
        avg_aov_target: c.avg_aov_target || 0,
        monthly: monthlyData,
      };
    });
  }

  // By month
  const byMonth = new Map<string, { orders: number; revenue: number; cm: number; gmv: number; returned: number; shipping: number; returns_cost: number; direct_costs: number; storage_days_sum: number; storage_days_count: number; pallets_used: number }>();
  for (const o of lqOrders) {
    const m = getMonth(o);
    const e = byMonth.get(m) || { orders: 0, revenue: 0, cm: 0, gmv: 0, returned: 0, shipping: 0, returns_cost: 0, direct_costs: 0, storage_days_sum: 0, storage_days_count: 0, pallets_used: 0 };
    e.orders++;
    e.revenue += Number(o.logistiq_revenue) || 0;
    e.cm += Number(o.contribution_margin) || 0;
    e.gmv += Number(o.gmv) || 0;
    e.shipping += Number(o.shipping_cost) || 0;
    e.returns_cost += Number(o.returns_cost) || 0;
    e.direct_costs += Number(o.logistiq_direct_costs) || 0;
    if (o.is_returned) e.returned++;
    if (o.storage_days != null) { e.storage_days_sum += Number(o.storage_days) || 0; e.storage_days_count++; }
    e.pallets_used += Number(o.pallets_used) || 0;
    byMonth.set(m, e);
  }
  data.logistiqByMonth = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      orders: v.orders,
      revenue: Math.round(v.revenue),
      cm: Math.round(v.cm),
      cm_pct: v.revenue > 0 ? Math.round((v.cm / v.revenue) * 1000) / 10 : 0,
      gmv: Math.round(v.gmv),
      return_rate: v.orders > 0 ? Math.round((v.returned / v.orders) * 1000) / 10 : 0,
      shipping_cost: Math.round(v.shipping),
      returns_cost: Math.round(v.returns_cost),
      direct_costs: Math.round(v.direct_costs),
      returns_cost_pct: v.revenue > 0 ? Math.round((v.returns_cost / v.revenue) * 1000) / 10 : 0,
      avg_storage_days: v.storage_days_count > 0 ? Math.round((v.storage_days_sum / v.storage_days_count) * 10) / 10 : 0,
      pallets_used: v.pallets_used,
    }));

  // Fee breakdown (includes cost components beyond fulfillment fees)
  const totalShipping = lqOrders.reduce((s, o) => s + (Number(o.shipping_cost) || 0), 0);
  const totalReturnsCost = lqOrders.reduce((s, o) => s + (Number(o.returns_cost) || 0), 0);
  const feeBreakdown = {
    receiving: lqOrders.reduce((s, o) => s + (Number(o.receiving_fee) || 0), 0),
    storage: lqOrders.reduce((s, o) => s + (Number(o.storage_fee) || 0), 0),
    pick_pack: lqOrders.reduce((s, o) => s + (Number(o.pick_pack_fee) || 0), 0),
    qc_inspection: lqOrders.reduce((s, o) => s + (Number(o.qc_inspection_fee) || 0), 0),
    special_packaging: lqOrders.reduce((s, o) => s + (Number(o.special_packaging_fee) || 0), 0),
    shipping_cost: totalShipping,
    returns_cost: totalReturnsCost,
  };
  data.logistiqFeeBreakdown = Object.fromEntries(
    Object.entries(feeBreakdown).map(([k, v]) => [k, Math.round(v)])
  );
  // Top-level returns cost metrics for anomaly detector
  data.logistiqTotalReturnsCost = Math.round(totalReturnsCost);
  data.logistiqTotalShippingCost = Math.round(totalShipping);
  data.logistiqReturnsCostPctOfRevenue = totalRev > 0
    ? Math.round((totalReturnsCost / totalRev) * 1000) / 10
    : 0;

  // Top/bottom orders by CM
  const sorted = [...lqOrders].sort((a, b) => (Number(a.contribution_margin) || 0) - (Number(b.contribution_margin) || 0));
  data.logistiqBottomOrders = sorted.slice(0, 10).map(o => ({
    order_id: o.order_id, client_id: o.client_id, cm: o.contribution_margin,
    cm_pct: o.contribution_margin_pct, is_returned: o.is_returned,
    revenue: o.logistiq_revenue, shipping: o.shipping_cost, returns_cost: o.returns_cost,
  }));
  data.logistiqTopOrders = sorted.slice(-10).reverse().map(o => ({
    order_id: o.order_id, client_id: o.client_id, cm: o.contribution_margin,
    cm_pct: o.contribution_margin_pct, revenue: o.logistiq_revenue,
  }));
}

// ─── Banking KPR ────────────────────────────────────────────────────

function computeBankingKprStats(data: Record<string, unknown>): void {
  const funnel = data["v_kpr_weekly_funnel"] as {
    week_number?: number; channel?: string;
    total_leads?: number; funded?: number; dropped?: number;
    approved?: number; app_submitted?: number; docs_submitted?: number;
    credit_decided?: number; cancelled_post_approval?: number;
    avg_contact_hours?: number; avg_credit_decision_days?: number;
    avg_review_days?: number; avg_cycle_days_funded?: number;
    total_rework?: number; cases_with_rework?: number;
    total_loan_amount_idr?: number; avg_loan_amount_idr?: number;
    competitor_flag_count?: number;
  }[] | undefined;
  if (!Array.isArray(funnel) || funnel.length === 0) return;

  const totalLeads = funnel.reduce((s, r) => s + (Number(r.total_leads) || 0), 0);
  const totalFunded = funnel.reduce((s, r) => s + (Number(r.funded) || 0), 0);
  const totalDropped = funnel.reduce((s, r) => s + (Number(r.dropped) || 0), 0);
  const totalApproved = funnel.reduce((s, r) => s + (Number(r.approved) || 0), 0);
  const totalRework = funnel.reduce((s, r) => s + (Number(r.total_rework) || 0), 0);
  const casesWithRework = funnel.reduce((s, r) => s + (Number(r.cases_with_rework) || 0), 0);
  const totalCancelled = funnel.reduce((s, r) => s + (Number(r.cancelled_post_approval) || 0), 0);
  const totalDocsSubmitted = funnel.reduce((s, r) => s + (Number(r.docs_submitted) || 0), 0);
  const totalCompetitorFlags = funnel.reduce((s, r) => s + (Number(r.competitor_flag_count) || 0), 0);

  data.kprTotalLeads = totalLeads;
  data.kprTotalFunded = totalFunded;
  data.kprK14ConversionRate = totalLeads > 0 ? Math.round((totalFunded / totalLeads) * 1000) / 10 : 0;
  data.kprDropRate = totalLeads > 0 ? Math.round((totalDropped / totalLeads) * 1000) / 10 : 0;
  data.kprApprovalRate = totalLeads > 0 ? Math.round((totalApproved / totalLeads) * 1000) / 10 : 0;
  data.kprReviewReturnRate = totalDocsSubmitted > 0 ? Math.round((casesWithRework / totalDocsSubmitted) * 1000) / 10 : 0;
  data.kprReworkCount = totalRework;
  data.kprCancellationRate = totalApproved > 0 ? Math.round((totalCancelled / totalApproved) * 1000) / 10 : 0;
  data.kprCompetitorFlagCount = totalCompetitorFlags;

  const validContactHours = funnel.filter(r => r.avg_contact_hours != null && Number(r.avg_contact_hours) > 0);
  const validCreditDays = funnel.filter(r => r.avg_credit_decision_days != null && Number(r.avg_credit_decision_days) > 0);
  const validReviewDays = funnel.filter(r => r.avg_review_days != null && Number(r.avg_review_days) > 0);
  const validCycleDays = funnel.filter(r => r.avg_cycle_days_funded != null && Number(r.avg_cycle_days_funded) > 0);

  data.kprAvgContactHours = validContactHours.length > 0
    ? Math.round(validContactHours.reduce((s, r) => s + Number(r.avg_contact_hours), 0) / validContactHours.length * 10) / 10 : 0;
  data.kprAvgCreditDecisionDays = validCreditDays.length > 0
    ? Math.round(validCreditDays.reduce((s, r) => s + Number(r.avg_credit_decision_days), 0) / validCreditDays.length * 10) / 10 : 0;
  data.kprAvgReviewDays = validReviewDays.length > 0
    ? Math.round(validReviewDays.reduce((s, r) => s + Number(r.avg_review_days), 0) / validReviewDays.length * 10) / 10 : 0;
  data.kprAvgCycleDaysFunded = validCycleDays.length > 0
    ? Math.round(validCycleDays.reduce((s, r) => s + Number(r.avg_cycle_days_funded), 0) / validCycleDays.length * 10) / 10 : 0;

  const byWeek = new Map<number, { leads: number; funded: number; dropped: number; approved: number; rework: number; cancelled: number; docsSubmitted: number; competitorFlags: number }>();
  for (const r of funnel) {
    const w = r.week_number ?? 0;
    const e = byWeek.get(w) || { leads: 0, funded: 0, dropped: 0, approved: 0, rework: 0, cancelled: 0, docsSubmitted: 0, competitorFlags: 0 };
    e.leads += Number(r.total_leads) || 0;
    e.funded += Number(r.funded) || 0;
    e.dropped += Number(r.dropped) || 0;
    e.approved += Number(r.approved) || 0;
    e.rework += Number(r.cases_with_rework) || 0;
    e.cancelled += Number(r.cancelled_post_approval) || 0;
    e.docsSubmitted += Number(r.docs_submitted) || 0;
    e.competitorFlags += Number(r.competitor_flag_count) || 0;
    byWeek.set(w, e);
  }
  data.kprByWeek = Array.from(byWeek.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, v]) => ({
      week: `W${String(week).padStart(2, '0')}`,
      leads: v.leads, funded: v.funded,
      k14_pct: v.leads > 0 ? Math.round((v.funded / v.leads) * 1000) / 10 : 0,
      review_return_rate: v.docsSubmitted > 0 ? Math.round((v.rework / v.docsSubmitted) * 1000) / 10 : 0,
      cancellation_rate: v.approved > 0 ? Math.round((v.cancelled / v.approved) * 1000) / 10 : 0,
      competitor_flags: v.competitorFlags,
    }));

  const byChannel = new Map<string, { leads: number; funded: number; docsSubmitted: number; rework: number; approved: number; cancelled: number }>();
  for (const r of funnel) {
    const ch = r.channel || "Unknown";
    const e = byChannel.get(ch) || { leads: 0, funded: 0, docsSubmitted: 0, rework: 0, approved: 0, cancelled: 0 };
    e.leads += Number(r.total_leads) || 0;
    e.funded += Number(r.funded) || 0;
    e.docsSubmitted += Number(r.docs_submitted) || 0;
    e.rework += Number(r.cases_with_rework) || 0;
    e.approved += Number(r.approved) || 0;
    e.cancelled += Number(r.cancelled_post_approval) || 0;
    byChannel.set(ch, e);
  }
  data.kprByChannel = Array.from(byChannel.entries()).map(([channel, v]) => ({
    channel, leads: v.leads, funded: v.funded,
    k14_pct: v.leads > 0 ? Math.round((v.funded / v.leads) * 1000) / 10 : 0,
    review_return_rate: v.docsSubmitted > 0 ? Math.round((v.rework / v.docsSubmitted) * 1000) / 10 : 0,
    cancellation_rate: v.approved > 0 ? Math.round((v.cancelled / v.approved) * 1000) / 10 : 0,
  }));

  // ── Application-level aggregations by specialist-relevant dimensions ──
  // kpr_applications has rich dimensions (region, review_status, contact_speed_bucket, product_type)
  // that don't exist in v_kpr_weekly_funnel. We compute metric aggregates from application rows
  // so the decomposer can break down metrics by these specialist-specific dimensions.
  const apps = data["kpr_applications"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(apps) && apps.length > 0) {
    type AggBucket = { leads: number; funded: number; docsSubmitted: number; rework: number; approved: number; cancelled: number; contactHoursSum: number; contactHoursCount: number; creditDaysSum: number; creditDaysCount: number; reviewDaysSum: number; reviewDaysCount: number };
    const emptyBucket = (): AggBucket => ({ leads: 0, funded: 0, docsSubmitted: 0, rework: 0, approved: 0, cancelled: 0, contactHoursSum: 0, contactHoursCount: 0, creditDaysSum: 0, creditDaysCount: 0, reviewDaysSum: 0, reviewDaysCount: 0 });

    const accumulate = (b: AggBucket, app: Record<string, unknown>) => {
      b.leads++;
      if (app.final_status === 'funded') b.funded++;
      if (app.documents_submitted_date) b.docsSubmitted++;
      if (Number(app.rework_count) > 0) b.rework++;
      if (app.final_status === 'funded' || app.approved_date) b.approved++;
      if (String(app.final_status).toLowerCase().includes('cancel')) b.cancelled++;
      const ch = Number(app.contact_hours || app.avg_contact_hours);
      if (ch > 0) { b.contactHoursSum += ch; b.contactHoursCount++; }
      const cd = Number(app.credit_decision_days);
      if (cd > 0) { b.creditDaysSum += cd; b.creditDaysCount++; }
      const rd = Number(app.review_days);
      if (rd > 0) { b.reviewDaysSum += rd; b.reviewDaysCount++; }
    };

    const toRow = (dimName: string, dimValue: string, b: AggBucket) => ({
      [dimName]: dimValue,
      leads: b.leads, funded: b.funded,
      k14_pct: b.leads > 0 ? Math.round((b.funded / b.leads) * 1000) / 10 : 0,
      review_return_rate: b.docsSubmitted > 0 ? Math.round((b.rework / b.docsSubmitted) * 1000) / 10 : 0,
      cancellation_rate: b.approved > 0 ? Math.round((b.cancelled / b.approved) * 1000) / 10 : 0,
      avg_contact_hours: b.contactHoursCount > 0 ? Math.round((b.contactHoursSum / b.contactHoursCount) * 10) / 10 : 0,
      avg_credit_decision_days: b.creditDaysCount > 0 ? Math.round((b.creditDaysSum / b.creditDaysCount) * 10) / 10 : 0,
      avg_review_days: b.reviewDaysCount > 0 ? Math.round((b.reviewDaysSum / b.reviewDaysCount) * 10) / 10 : 0,
    });

    // Helper: aggregate apps by a single dimension
    const SKIP_VALUES = new Set(['unknown', 'n/a', 'null', 'undefined', 'none', '']);
    const aggregateByDim = (dimName: string) => {
      const buckets = new Map<string, AggBucket>();
      for (const app of apps) {
        const raw = app[dimName];
        // Skip rows where dimension value is null/empty/N/A — these create meaningless "N/A" segments
        if (raw == null || raw === '') continue;
        const key = String(raw);
        if (SKIP_VALUES.has(key.toLowerCase())) continue;
        if (!buckets.has(key)) buckets.set(key, emptyBucket());
        accumulate(buckets.get(key)!, app);
      }
      return Array.from(buckets.entries())
        .filter(([, b]) => b.leads >= 2) // skip tiny buckets
        .map(([k, b]) => toRow(dimName, k, b));
    };

    // Multi-dimension cross-tab: one row per (channel × region × product_type × review_status × contact_speed_bucket)
    // This enables pyramid drill-down (L1/L2/L3) by providing a single table with all dimensions.
    const crossBuckets = new Map<string, AggBucket & { channel: string; region: string; product_type: string; review_status: string; contact_speed_bucket: string; customer_segment: string }>();
    for (const app of apps) {
      const ch = String(app.channel || 'Unknown');
      const rg = String(app.region || 'Unknown');
      const pt = String(app.product_type || 'Unknown');
      const rs = app.review_status != null && !SKIP_VALUES.has(String(app.review_status).toLowerCase()) ? String(app.review_status) : 'No Review';
      const cs = String(app.contact_speed_bucket || 'Unknown');
      const sg = String(app.customer_segment || 'Unknown');
      const key = `${ch}|${rg}|${pt}|${rs}|${cs}|${sg}`;
      if (!crossBuckets.has(key)) {
        crossBuckets.set(key, { ...emptyBucket(), channel: ch, region: rg, product_type: pt, review_status: rs, contact_speed_bucket: cs, customer_segment: sg });
      }
      accumulate(crossBuckets.get(key)!, app);
    }
    data.kprCrossTab = Array.from(crossBuckets.values())
      .filter(b => b.leads >= 2)
      .map(b => ({
        channel: b.channel, region: b.region, product_type: b.product_type,
        review_status: b.review_status, contact_speed_bucket: b.contact_speed_bucket,
        customer_segment: b.customer_segment,
        leads: b.leads, funded: b.funded,
        k14_pct: b.leads > 0 ? Math.round((b.funded / b.leads) * 1000) / 10 : 0,
        review_return_rate: b.docsSubmitted > 0 ? Math.round((b.rework / b.docsSubmitted) * 1000) / 10 : 0,
        cancellation_rate: b.approved > 0 ? Math.round((b.cancelled / b.approved) * 1000) / 10 : 0,
        avg_contact_hours: b.contactHoursCount > 0 ? Math.round((b.contactHoursSum / b.contactHoursCount) * 10) / 10 : 0,
        avg_credit_decision_days: b.creditDaysCount > 0 ? Math.round((b.creditDaysSum / b.creditDaysCount) * 10) / 10 : 0,
        avg_review_days: b.reviewDaysCount > 0 ? Math.round((b.reviewDaysSum / b.reviewDaysCount) * 10) / 10 : 0,
      }));

    data.kprByRegion = aggregateByDim('region');
    data.kprByProductType = aggregateByDim('product_type');
    data.kprByReviewStatus = aggregateByDim('review_status');
    data.kprByContactSpeed = aggregateByDim('contact_speed_bucket');
    data.kprByCustomerSegment = aggregateByDim('customer_segment');
  }
}

// ─── Format DB Data for Prompt ──────────────────────────────────────

export function formatDbDataForPrompt(dbData: Record<string, unknown>): string {
  const parts: string[] = [];
  parts.push("=== DATABASE QUERY RESULTS (Ground Truth) ===\n");

  // Summary statistics
  const summaryLines: string[] = [];
  if (dbData.totalRevenue !== undefined) {
    summaryLines.push(`Total Revenue: Rp ${(dbData.totalRevenue as number).toLocaleString()} (${dbData.transactionCount} transactions, ${dbData.cancellationRate}% cancellation rate)`);
  }
  if (dbData.npsScore !== undefined) {
    summaryLines.push(`NPS Score: ${dbData.npsScore} (Promoters: ${dbData.promotersPercent}%, Detractors: ${dbData.detractorsPercent}%)`);
  }
  if (dbData.otpPercent !== undefined) {
    summaryLines.push(`OTP: ${dbData.otpPercent}% (${dbData.onTimeTrips}/${dbData.totalTrips} trips on time, avg delay: ${dbData.avgDelayMinutes} min)`);
  }
  if (dbData.conversionRate !== undefined) {
    summaryLines.push(`Funnel Conversion: ${dbData.conversionRate}% (${dbData.completedBookings}/${dbData.totalSessions} sessions)`);
  }
  if (dbData.fleetMargin !== undefined) {
    summaryLines.push(`Fleet Margin: ${dbData.fleetMargin}% (Revenue: Rp ${(dbData.totalVehicleRevenue as number).toLocaleString()}, Cost: Rp ${(dbData.totalOperatingCost as number).toLocaleString()})`);
  }
  if (dbData.logistiqTotalRevenue !== undefined) {
    summaryLines.push(`LogistiQ Fulfillment Revenue: Rp ${(dbData.logistiqTotalRevenue as number).toLocaleString()} (${dbData.logistiqOrderCount} orders)`);
    summaryLines.push(`LogistiQ Contribution Margin: Rp ${(dbData.logistiqTotalCM as number).toLocaleString()} (avg ${dbData.logistiqAvgCMPct}%)`);
    summaryLines.push(`LogistiQ Direct Costs: Rp ${(dbData.logistiqTotalDirectCosts as number).toLocaleString()}`);
    summaryLines.push(`Client GMV (total merchandise value): Rp ${(dbData.logistiqTotalGMV as number).toLocaleString()}`);
    summaryLines.push(`Return Rate: ${dbData.logistiqReturnRate}% | Negative CM Orders: ${dbData.logistiqNegativeCMCount}`);
    if (dbData.logistiqTotalReturnsCost !== undefined) {
      summaryLines.push(`Total Returns Cost: Rp ${(dbData.logistiqTotalReturnsCost as number).toLocaleString()} (${dbData.logistiqReturnsCostPctOfRevenue}% of revenue)`);
      summaryLines.push(`Total Shipping Cost: Rp ${(dbData.logistiqTotalShippingCost as number).toLocaleString()}`);
    }
  }
  if (dbData.kprTotalLeads !== undefined) {
    summaryLines.push(`KPR Pipeline: ${dbData.kprTotalLeads} leads → ${dbData.kprTotalFunded} funded (K14 conversion: ${dbData.kprK14ConversionRate}%)`);
    summaryLines.push(`Review Return Rate (K92): ${dbData.kprReviewReturnRate}% | Rework count: ${dbData.kprReworkCount}`);
    summaryLines.push(`Drop Rate: ${dbData.kprDropRate}% | Approval Rate: ${dbData.kprApprovalRate}%`);
    summaryLines.push(`Cancellation Rate (K47): ${dbData.kprCancellationRate}% | Competitor flags: ${dbData.kprCompetitorFlagCount}`);
    summaryLines.push(`Avg Contact Time (K19): ${dbData.kprAvgContactHours}h | Avg Credit Decision (K22): ${dbData.kprAvgCreditDecisionDays}d | Avg Review (K95): ${dbData.kprAvgReviewDays}d | Avg Cycle (K18): ${dbData.kprAvgCycleDaysFunded}d`);
  }

  if (summaryLines.length > 0) {
    parts.push("KEY METRICS (pre-calculated):");
    for (const line of summaryLines) parts.push(`  • ${line}`);
    parts.push("");
  }

  // Monthly aggregations
  const aggKeys = [
    "revenueByMonth", "npsByMonth", "otpByMonth", "revenueByRoute", "npsByRoute",
    "npsByCustomerType", "otpByRoute", "otpByDriver", "funnelStages",
    "logistiqByClient", "logistiqByMonth", "logistiqCommitmentStatus",
    "logistiqFeeBreakdown", "logistiqBottomOrders", "logistiqTopOrders",
    "kprByWeek", "kprByChannel", "kprByRegion", "kprByProductType",
    "kprByReviewStatus", "kprByContactSpeed", "kprByCustomerSegment", "kprCrossTab",
  ];
  for (const key of aggKeys) {
    if (Array.isArray(dbData[key]) && (dbData[key] as unknown[]).length > 0) {
      parts.push(`${key}: ${JSON.stringify(dbData[key])}`);
    }
  }

  // Raw table data (compact)
  const tableKeys = Object.keys(dbData).filter(
    (k) => k.startsWith("fact_") || k.startsWith("dim_") || k.startsWith("metadata_") || k.startsWith("logistiq_") || k.startsWith("kpr_") || k.startsWith("v_kpr_")
  );
  for (const key of tableKeys) {
    const rows = dbData[key];
    if (!Array.isArray(rows)) continue;
    if (rows.length === 0) {
      parts.push(`\n[${key}]: No data`);
    } else {
      const display = rows.slice(0, 100);
      parts.push(`\n[${key}] (${rows.length} rows, showing ${display.length}):`);
      parts.push(JSON.stringify(display));
    }
  }

  parts.push("\n=== END DATABASE RESULTS ===");
  return parts.join("\n");
}
