import {
  Specialist,
  SpecialistInsight,
  SpecialistRecommendation,
  ExecutiveSummary,
  RootCauseAnalysis,
  BusinessImpact,
  CrossSpecialistSignal
} from '@/types/specialist';
import { SPECIALIST_IDS } from '@/data/agentIdMap';

// ============================================
// TRANSPORTX AI SPECIALISTS - JANUARY 2026 DATA
// ============================================

/** Format IDR using Indonesian units: Rb (Ribu), Jt (Juta), M (Miliar), T (Triliun) */
export const formatIDR = (value: number) => {
  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}Jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}Rb`;
  return `Rp ${value}`;
};

export const IDR_TO_USD = 15400; // Approximate conversion rate

// ============================================
// 1. OTP SPECIALIST (On-Time Performance)
// ============================================
export const OTP_SPECIALIST: Specialist = {
  id: SPECIALIST_IDS.OTP,
  name: 'OTP Specialist',
  handle: 'otp',
  description: 'Monitors on-time delivery performance across all routes and drivers. Identifies systemic delays and provides actionable recommendations.',
  templateId: 'template-logistics',
  domain: 'supply-chain',
  status: 'active',
  createdBy: 'system',
  createdAt: '2025-12-01T00:00:00Z',
  lastActiveAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  lastInsightAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  monitoringScope: {
    dataSources: ['fact_driver_log', 'fact_trip', 'dim_driver', 'dim_route'],
    refreshRate: 'hourly',
    metrics: ['is_on_time', 'delay_minutes'],
    dimensions: ['driver_id', 'route_id', 'employment_type', 'day_of_week'],
  },
  monitoringRules: [
    { id: 'otp-driver', name: 'Driver OTP Alert', whenCondition: 'Driver OTP falls below', whenValue: 30, whenUnit: '%', forScope: 'All drivers', severity: 'critical', enabled: true },
    { id: 'otp-route', name: 'Route OTP Alert', whenCondition: 'Route OTP falls below', whenValue: 50, whenUnit: '%', forScope: 'All routes', severity: 'high', enabled: true },
    { id: 'otp-slot', name: 'Time Slot Alert', whenCondition: 'Slot OTP falls below', whenValue: 40, whenUnit: '%', forScope: 'Morning slots', severity: 'high', enabled: true },
  ],
  performance: {
    insightsGenerated: 47,
    actionsRecommended: 28,
    actionsApproved: 23,
    falsePositiveRate: 6,
    valueDelivered: 240_000_000, // Rp 240M
    approvalRate: 82,
  },
};

export const OTP_EXECUTIVE_SUMMARY: ExecutiveSummary = {
  headline: 'Critical OTP at 40.6% - Driver D011 at 15%',
  severity: 'critical',
  valueAtStake: 3_700_000_000, // Rp 3.7B/year
  currency: 'IDR',
  keyFinding: 'One contract driver (D011) has 15% OTP, pulling down fleet average. Morning slots at 29.6% OTP.',
  trend: 'declining',
  comparedToPrevious: -12.4,
};

export const OTP_INSIGHTS: SpecialistInsight[] = [
  {
    id: 'otp-insight-1',
    specialistId: SPECIALIST_IDS.OTP,
    type: 'anomaly',
    severity: 'critical',
    headline: 'Driver D011 at 15% OTP - worst in fleet',
    description: 'Contract driver D011 (Sulaiman Rahman) has the lowest OTP in the fleet at 15%, significantly below the 40.6% fleet average.',
    rootCause: 'Contract employment type with no performance incentives. Assigned to challenging morning slots.',
    confidence: 94,
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['otp_rate', 'delay_minutes'],
    data: { driverId: 'D011', driverName: 'Sulaiman Rahman', otpRate: 15, employmentType: 'contract' },
  },
  {
    id: 'otp-insight-2',
    specialistId: SPECIALIST_IDS.OTP,
    type: 'pattern',
    severity: 'high',
    headline: 'Morning slot at 29.6% OTP',
    description: 'Morning departure slots (06:00-09:00) have 29.6% OTP vs 52.3% for afternoon slots. Traffic congestion is primary driver.',
    rootCause: 'Insufficient buffer time in scheduling for peak traffic hours.',
    confidence: 89,
    detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['otp_rate', 'departure_time'],
    data: { timeSlot: 'morning', otpRate: 29.6, afternoonOtp: 52.3 },
  },
  {
    id: 'otp-insight-3',
    specialistId: SPECIALIST_IDS.OTP,
    type: 'trend',
    severity: 'high',
    headline: 'Route R001 at 35% OTP',
    description: 'Jakarta-Bandung route (R001) underperforming at 35% OTP. Toll road construction causing delays.',
    rootCause: 'External factor: ongoing toll construction between km 42-56.',
    confidence: 87,
    detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: 'acknowledged',
    relatedMetrics: ['otp_rate', 'route_id'],
    data: { routeId: 'R001', routeName: 'Jakarta-Bandung', otpRate: 35 },
  },
  {
    id: 'otp-insight-4',
    specialistId: SPECIALIST_IDS.OTP,
    type: 'pattern',
    severity: 'medium',
    headline: '10.3pt gap: Contract vs Full-time drivers',
    description: 'Contract drivers average 38.2% OTP vs 48.5% for full-time employees. 10.3 percentage point gap.',
    rootCause: 'Contract drivers lack performance incentives and training investment.',
    confidence: 92,
    detectedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['otp_rate', 'employment_type'],
    data: { contractOtp: 38.2, fullTimeOtp: 48.5, gap: 10.3 },
  },
];

export const OTP_RECOMMENDATIONS: SpecialistRecommendation[] = [
  {
    id: 'otp-rec-1',
    specialistId: SPECIALIST_IDS.OTP,
    insightId: 'otp-insight-1',
    title: 'Reassign D011 from morning slots immediately',
    description: 'Move driver D011 to midday/afternoon slots where traffic conditions are more forgiving. Expected OTP improvement: +15-20%.',
    impact: { type: 'efficiency', value: 1_200_000_000, currency: 'IDR', confidence: 88 },
    effort: 'low',
    deadline: '24 hours',
    status: 'proposed',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'otp-rec-2',
    specialistId: SPECIALIST_IDS.OTP,
    insightId: 'otp-insight-2',
    title: 'Add 15-min buffer to morning R001 departures',
    description: 'Adjust scheduled departure times for morning Jakarta-Bandung routes by 15 minutes earlier to account for traffic.',
    impact: { type: 'efficiency', value: 800_000_000, currency: 'IDR', confidence: 82 },
    effort: 'low',
    deadline: '48 hours',
    status: 'proposed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'otp-rec-3',
    specialistId: SPECIALIST_IDS.OTP,
    insightId: 'otp-insight-4',
    title: 'Restrict contract drivers to midday slots',
    description: 'Until performance incentive program is implemented, limit contract driver assignments to 10:00-15:00 slots.',
    impact: { type: 'efficiency', value: 500_000_000, currency: 'IDR', confidence: 75 },
    effort: 'medium',
    deadline: '1 week',
    status: 'proposed',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================
// 2. REVENUE SPECIALIST
// ============================================
export const REVENUE_SPECIALIST: Specialist = {
  id: SPECIALIST_IDS.REVENUE,
  name: 'Revenue Specialist',
  handle: 'revenue',
  description: 'Monitors revenue trends, cancellation patterns, and channel performance. Identifies revenue leakage and growth opportunities.',
  templateId: 'template-revenue',
  domain: 'commercial',
  status: 'active',
  createdBy: 'system',
  createdAt: '2025-11-15T00:00:00Z',
  lastActiveAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  lastInsightAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  monitoringScope: {
    dataSources: ['fact_revenue', 'dim_route', 'dim_customer'],
    refreshRate: 'hourly',
    metrics: ['gross_value_amount', 'ticket_status', 'seat_count'],
    dimensions: ['route_id', 'outlet_id', 'customer_type', 'day_of_week'],
  },
  monitoringRules: [
    { id: 'rev-cancel', name: 'Cancellation Rate Alert', whenCondition: 'Cancellation rate exceeds', whenValue: 30, whenUnit: '%', forScope: 'All routes', severity: 'critical', enabled: true },
    { id: 'rev-channel', name: 'Channel Performance Alert', whenCondition: 'Channel cancellation exceeds', whenValue: 50, whenUnit: '%', forScope: 'Partner channels', severity: 'high', enabled: true },
    { id: 'rev-demand', name: 'Demand Surge Detection', whenCondition: 'Booking rate exceeds', whenValue: 150, whenUnit: '%', forScope: 'Weekend routes', severity: 'medium', enabled: true },
  ],
  performance: {
    insightsGenerated: 64,
    actionsRecommended: 42,
    actionsApproved: 35,
    falsePositiveRate: 7,
    valueDelivered: 520_000_000, // Rp 520M
    approvalRate: 83,
  },
};

export const REVENUE_EXECUTIVE_SUMMARY: ExecutiveSummary = {
  headline: '38% Cancellation Rate - R002 at 51.5%',
  severity: 'critical',
  valueAtStake: 4_000_000_000, // Rp 4B/year
  currency: 'IDR',
  keyFinding: 'Route R002 (Jakarta-Cirebon) has 51.5% cancellation. Partner channel OUT01 at 71.4% cancellation.',
  trend: 'declining',
  comparedToPrevious: -8.2,
};

export const REVENUE_INSIGHTS: SpecialistInsight[] = [
  {
    id: 'rev-insight-1',
    specialistId: SPECIALIST_IDS.REVENUE,
    type: 'anomaly',
    severity: 'critical',
    headline: 'R002 at 51.5% cancellation rate',
    description: 'Jakarta-Cirebon route has the highest cancellation rate in the network at 51.5%, significantly above 38% average.',
    rootCause: 'Service quality issues and OTP problems creating poor customer experience.',
    confidence: 91,
    detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['cancellation_rate', 'gross_value_amount'],
    data: { routeId: 'R002', routeName: 'Jakarta-Cirebon', cancellationRate: 51.5, revenueImpact: 1_200_000_000 },
  },
  {
    id: 'rev-insight-2',
    specialistId: SPECIALIST_IDS.REVENUE,
    type: 'anomaly',
    severity: 'critical',
    headline: 'Channel OUT01 at 71.4% cancellation',
    description: 'Partner outlet OUT01 has 71.4% cancellation rate - nearly 2x the company average.',
    rootCause: 'Partner may be overbooking or customers using as placeholder reservations.',
    confidence: 88,
    detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['cancellation_rate', 'outlet_id'],
    data: { outletId: 'OUT01', cancellationRate: 71.4 },
  },
  {
    id: 'rev-insight-3',
    specialistId: SPECIALIST_IDS.REVENUE,
    type: 'pattern',
    severity: 'high',
    headline: 'Saturday demand 2x weekday - flat pricing',
    description: 'Saturday bookings are 2x higher than weekday average, but pricing remains flat. Revenue optimization opportunity.',
    rootCause: 'No dynamic pricing strategy implemented for peak demand periods.',
    confidence: 94,
    detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'acknowledged',
    relatedMetrics: ['booking_rate', 'day_of_week'],
    data: { saturdayMultiplier: 2.1, pricingStrategy: 'flat' },
  },
];

export const REVENUE_RECOMMENDATIONS: SpecialistRecommendation[] = [
  {
    id: 'rev-rec-1',
    specialistId: SPECIALIST_IDS.REVENUE,
    insightId: 'rev-insight-1',
    title: 'Launch service quality audit on R002',
    description: 'Conduct mystery shopping and customer callbacks to identify specific service failures on Jakarta-Cirebon route.',
    impact: { type: 'revenue', value: 1_500_000_000, currency: 'IDR', confidence: 78 },
    effort: 'medium',
    deadline: '1 week',
    status: 'proposed',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-rec-2',
    specialistId: SPECIALIST_IDS.REVENUE,
    insightId: 'rev-insight-2',
    title: 'Suspend OUT01 partner channel',
    description: 'Temporarily suspend bookings from OUT01 pending review of booking practices and deposit requirements.',
    impact: { type: 'revenue', value: 800_000_000, currency: 'IDR', confidence: 85 },
    effort: 'low',
    deadline: '48 hours',
    status: 'proposed',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-rec-3',
    specialistId: SPECIALIST_IDS.REVENUE,
    insightId: 'rev-insight-3',
    title: 'Implement Saturday surge pricing (+15%)',
    description: 'Apply 15% premium pricing for Saturday departures to capture value from excess demand.',
    impact: { type: 'revenue', value: 600_000_000, currency: 'IDR', confidence: 90 },
    effort: 'low',
    deadline: '1 week',
    status: 'proposed',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================
// 3. NPS SPECIALIST
// ============================================
export const NPS_SPECIALIST: Specialist = {
  id: SPECIALIST_IDS.NPS,
  name: 'NPS Specialist',
  handle: 'nps',
  description: 'Analyzes customer satisfaction trends, promoter/detractor patterns, and identifies service improvement opportunities.',
  templateId: 'template-nps',
  domain: 'customer',
  status: 'active',
  createdBy: 'system',
  createdAt: '2025-11-20T00:00:00Z',
  lastActiveAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  lastInsightAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  monitoringScope: {
    dataSources: ['fact_nps_response', 'fact_nps_response_raw', 'dim_customer', 'dim_route'],
    refreshRate: 'daily',
    metrics: ['nps_score', 'promoters_count', 'detractors_count', 'total_responses'],
    dimensions: ['route_id', 'customer_type', 'month'],
  },
  monitoringRules: [
    { id: 'nps-drop', name: 'NPS Drop Alert', whenCondition: 'NPS drops by', whenValue: 10, whenUnit: 'points', forScope: 'Any route', severity: 'critical', enabled: true },
    { id: 'nps-route', name: 'Route NPS Alert', whenCondition: 'Route NPS falls below', whenValue: 20, whenUnit: 'points', forScope: 'All routes', severity: 'high', enabled: true },
    { id: 'nps-gap', name: 'Route Gap Alert', whenCondition: 'Route NPS gap exceeds', whenValue: 20, whenUnit: 'points', forScope: 'All routes', severity: 'medium', enabled: true },
  ],
  performance: {
    insightsGenerated: 38,
    actionsRecommended: 24,
    actionsApproved: 19,
    falsePositiveRate: 9,
    valueDelivered: 180_000_000, // Rp 180M
    approvalRate: 79,
  },
};

export const NPS_EXECUTIVE_SUMMARY: ExecutiveSummary = {
  headline: 'NPS at 22.7 - Route R002 crashed 32 points',
  severity: 'high',
  valueAtStake: 2_000_000_000, // Rp 2B/year
  currency: 'IDR',
  keyFinding: 'Route R002 NPS crashed from 41.1 to 9.1 (32 points drop). 27.4 point gap between best and worst routes.',
  trend: 'improving',
  comparedToPrevious: 2.9, // improved from 19.8
};

export const NPS_INSIGHTS: SpecialistInsight[] = [
  {
    id: 'nps-insight-1',
    specialistId: SPECIALIST_IDS.NPS,
    type: 'anomaly',
    severity: 'critical',
    headline: 'Route R002 NPS crashed 32 points to 9.1',
    description: 'Jakarta-Cirebon route NPS dropped from 41.1 (Dec) to 9.1 (Jan) - a 32 point collapse.',
    rootCause: 'OTP issues and cancellation problems creating cascade of dissatisfaction.',
    confidence: 95,
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['nps_score', 'route_id'],
    data: { routeId: 'R002', currentNps: 9.1, previousNps: 41.1, drop: 32 },
  },
  {
    id: 'nps-insight-2',
    specialistId: SPECIALIST_IDS.NPS,
    type: 'pattern',
    severity: 'high',
    headline: '27.4pt gap between R001 and R002',
    description: 'Route R001 (Jakarta-Bandung) at 36.5 NPS vs R002 at 9.1 - a 27.4 point service quality gap.',
    rootCause: 'Inconsistent service standards across routes.',
    confidence: 92,
    detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'acknowledged',
    relatedMetrics: ['nps_score', 'route_id'],
    data: { r001Nps: 36.5, r002Nps: 9.1, gap: 27.4 },
  },
  {
    id: 'nps-insight-3',
    specialistId: SPECIALIST_IDS.NPS,
    type: 'trend',
    severity: 'medium',
    headline: '19-point volatility range over 13 months',
    description: 'Company NPS has ranged from 5.7 to 24.7 over the past 13 months. High volatility indicates unstable service.',
    rootCause: 'Lack of standardized service protocols and training.',
    confidence: 88,
    detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['nps_score', 'month'],
    data: { minNps: 5.7, maxNps: 24.7, volatility: 19 },
  },
];

export const NPS_RECOMMENDATIONS: SpecialistRecommendation[] = [
  {
    id: 'nps-rec-1',
    specialistId: SPECIALIST_IDS.NPS,
    insightId: 'nps-insight-1',
    title: 'Launch R002 detractor callback campaign',
    description: 'Contact all detractors from January R002 trips within 48 hours. Offer service recovery and gather detailed feedback.',
    impact: { type: 'revenue', value: 600_000_000, currency: 'IDR', confidence: 72 },
    effort: 'medium',
    deadline: '48 hours',
    status: 'proposed',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'nps-rec-2',
    specialistId: SPECIALIST_IDS.NPS,
    insightId: 'nps-insight-2',
    title: 'Mystery shop R002 route weekly',
    description: 'Implement weekly mystery shopping on R002 to identify specific service failures vs R001 benchmark.',
    impact: { type: 'revenue', value: 400_000_000, currency: 'IDR', confidence: 75 },
    effort: 'medium',
    deadline: '1 week',
    status: 'proposed',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'nps-rec-3',
    specialistId: SPECIALIST_IDS.NPS,
    insightId: 'nps-insight-3',
    title: 'Standardize service protocols across routes',
    description: 'Document and implement R001 best practices across all routes. Include driver briefings and checklists.',
    impact: { type: 'revenue', value: 800_000_000, currency: 'IDR', confidence: 68 },
    effort: 'high',
    deadline: '1 month',
    status: 'proposed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================
// 4. CREW SPECIALIST
// ============================================
export const CREW_SPECIALIST: Specialist = {
  id: SPECIALIST_IDS.CREW,
  name: 'Crew Specialist',
  handle: 'crew',
  description: 'Monitors driver performance and employment type analysis. Identifies training needs and performance gaps.',
  templateId: 'template-logistics',
  domain: 'supply-chain',
  status: 'active',
  createdBy: 'system',
  createdAt: '2025-12-10T00:00:00Z',
  lastActiveAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  lastInsightAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  monitoringScope: {
    dataSources: ['fact_driver_log', 'dim_driver'],
    refreshRate: 'daily',
    metrics: ['is_on_time', 'delay_minutes'],
    dimensions: ['driver_id', 'employment_type', 'experience_years'],
  },
  monitoringRules: [
    { id: 'crew-perf', name: 'Driver Performance Gap', whenCondition: 'Employment type gap exceeds', whenValue: 10, whenUnit: '%', forScope: 'Contract vs Full-time', severity: 'high', enabled: true },
    { id: 'crew-worst', name: 'Bottom Performer Alert', whenCondition: 'Driver OTP falls below', whenValue: 25, whenUnit: '%', forScope: 'All drivers', severity: 'critical', enabled: true },
  ],
  performance: {
    insightsGenerated: 29,
    actionsRecommended: 18,
    actionsApproved: 15,
    falsePositiveRate: 8,
    valueDelivered: 95_000_000, // Rp 95M
    approvalRate: 83,
  },
};

export const CREW_EXECUTIVE_SUMMARY: ExecutiveSummary = {
  headline: '10.3pt contract driver performance gap',
  severity: 'high',
  valueAtStake: 800_000_000, // Rp 0.8B/year
  currency: 'IDR',
  keyFinding: 'Contract drivers at 38.2% OTP vs 48.5% for full-time. 40% of morning assignments are contract drivers.',
  trend: 'stable',
  comparedToPrevious: -1.2,
};

export const CREW_INSIGHTS: SpecialistInsight[] = [
  {
    id: 'crew-insight-1',
    specialistId: SPECIALIST_IDS.CREW,
    type: 'pattern',
    severity: 'high',
    headline: 'Contract drivers at 38.2% OTP vs 48.5% full-time',
    description: '10.3 percentage point gap between contract and full-time driver performance.',
    rootCause: 'Lack of performance incentives and limited training for contract drivers.',
    confidence: 93,
    detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['otp_rate', 'employment_type'],
    data: { contractOtp: 38.2, fullTimeOtp: 48.5, gap: 10.3 },
  },
  {
    id: 'crew-insight-2',
    specialistId: SPECIALIST_IDS.CREW,
    type: 'anomaly',
    severity: 'critical',
    headline: 'D011 (contract) at 15% OTP',
    description: 'Driver D011 has the worst performance in the fleet at 15% OTP. Contract driver assigned to morning slots.',
    rootCause: 'Poor route familiarity and challenging slot assignment.',
    confidence: 96,
    detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['otp_rate', 'driver_id'],
    data: { driverId: 'D011', otpRate: 15, employmentType: 'contract' },
  },
  {
    id: 'crew-insight-3',
    specialistId: SPECIALIST_IDS.CREW,
    type: 'pattern',
    severity: 'medium',
    headline: '40% of morning assignments are contract drivers',
    description: 'Contract drivers overrepresented in challenging morning slots despite lower performance.',
    rootCause: 'Scheduling algorithm not accounting for driver capability.',
    confidence: 89,
    detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'acknowledged',
    relatedMetrics: ['assignment_count', 'time_slot'],
    data: { morningContractPct: 40, afternoonContractPct: 22 },
  },
];

export const CREW_RECOMMENDATIONS: SpecialistRecommendation[] = [
  {
    id: 'crew-rec-1',
    specialistId: SPECIALIST_IDS.CREW,
    insightId: 'crew-insight-2',
    title: 'Immediate reassignment of D011',
    description: 'Remove D011 from morning slots and assign to midday routes with experienced driver mentorship.',
    impact: { type: 'efficiency', value: 300_000_000, currency: 'IDR', confidence: 90 },
    effort: 'low',
    deadline: '24 hours',
    status: 'proposed',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'crew-rec-2',
    specialistId: SPECIALIST_IDS.CREW,
    insightId: 'crew-insight-1',
    title: 'Launch performance incentive for contract drivers',
    description: 'Implement OTP-linked bonus program for contract drivers: +Rp 50K per trip for 90%+ OTP.',
    impact: { type: 'efficiency', value: 350_000_000, currency: 'IDR', confidence: 75 },
    effort: 'medium',
    deadline: '2 weeks',
    status: 'proposed',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'crew-rec-3',
    specialistId: SPECIALIST_IDS.CREW,
    insightId: 'crew-insight-3',
    title: 'Restrict contract drivers to midday slots',
    description: 'Update scheduling algorithm to prioritize full-time drivers for morning and evening peak slots.',
    impact: { type: 'efficiency', value: 200_000_000, currency: 'IDR', confidence: 82 },
    effort: 'medium',
    deadline: '1 week',
    status: 'proposed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================
// 5. CONVERSION SPECIALIST
// ============================================
export const CONVERSION_SPECIALIST: Specialist = {
  id: SPECIALIST_IDS.CONVERSION,
  name: 'Conversion Specialist',
  handle: 'conversion',
  description: 'Analyzes booking funnel performance, drop-off points, and channel-specific conversion rates.',
  templateId: 'template-revenue',
  domain: 'commercial',
  status: 'active',
  createdBy: 'system',
  createdAt: '2025-12-05T00:00:00Z',
  lastActiveAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  lastInsightAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  monitoringScope: {
    dataSources: ['fact_funnel', 'dim_customer'],
    refreshRate: 'hourly',
    metrics: ['homepage_flag', 'trip_input_page_flag', 'seat_option_page_flag', 'booking_page_flag', 'order_id'],
    dimensions: ['channel_id', 'customer_type'],
  },
  monitoringRules: [
    { id: 'conv-rate', name: 'Conversion Rate Alert', whenCondition: 'Conversion rate falls below', whenValue: 20, whenUnit: '%', forScope: 'All channels', severity: 'high', enabled: true },
    { id: 'conv-drop', name: 'Funnel Drop Alert', whenCondition: 'Stage drop rate exceeds', whenValue: 40, whenUnit: '%', forScope: 'Any stage', severity: 'high', enabled: true },
    { id: 'conv-mobile', name: 'Mobile Gap Alert', whenCondition: 'Mobile vs Web gap exceeds', whenValue: 10, whenUnit: '%', forScope: 'Conversion rate', severity: 'medium', enabled: true },
  ],
  performance: {
    insightsGenerated: 42,
    actionsRecommended: 28,
    actionsApproved: 22,
    falsePositiveRate: 10,
    valueDelivered: 175_000_000, // Rp 175M
    approvalRate: 79,
  },
};

export const CONVERSION_EXECUTIVE_SUMMARY: ExecutiveSummary = {
  headline: '22% conversion - 78% sessions lost',
  severity: 'high',
  valueAtStake: 1_500_000_000, // Rp 1.5B/year
  currency: 'IDR',
  keyFinding: 'Seat selection (37.6% drop) and checkout (39.7% drop) are major leakage points. Mobile app at 17.4% vs Web 28.4%.',
  trend: 'stable',
  comparedToPrevious: 0.8,
};

export const CONVERSION_INSIGHTS: SpecialistInsight[] = [
  {
    id: 'conv-insight-1',
    specialistId: SPECIALIST_IDS.CONVERSION,
    type: 'pattern',
    severity: 'high',
    headline: 'Seat selection: 37.6% drop (price shock)',
    description: 'Major abandonment at seat selection stage. Users see total price for first time and abandon.',
    rootCause: 'Price not shown upfront, causing sticker shock at seat selection.',
    confidence: 87,
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['funnel_conversion', 'seat_option_page_flag'],
    data: { dropRate: 37.6, stage: 'seat_selection' },
  },
  {
    id: 'conv-insight-2',
    specialistId: SPECIALIST_IDS.CONVERSION,
    type: 'pattern',
    severity: 'high',
    headline: 'Checkout: 39.7% drop (payment issues)',
    description: 'Highest drop-off at checkout stage. Payment gateway errors and limited payment options.',
    rootCause: 'No e-wallet options (GoPay, OVO, Dana). Payment gateway timeouts.',
    confidence: 84,
    detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'acknowledged',
    relatedMetrics: ['funnel_conversion', 'booking_page_flag'],
    data: { dropRate: 39.7, stage: 'checkout' },
  },
  {
    id: 'conv-insight-3',
    specialistId: SPECIALIST_IDS.CONVERSION,
    type: 'anomaly',
    severity: 'high',
    headline: 'Mobile app at 17.4% vs Web at 28.4%',
    description: '11 percentage point gap between mobile app and web conversion. Mobile UX issues.',
    rootCause: 'Payment flow on mobile app has additional friction and timeout issues.',
    confidence: 91,
    detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: 'new',
    relatedMetrics: ['conversion_rate', 'channel_id'],
    data: { mobileConversion: 17.4, webConversion: 28.4, gap: 11 },
  },
];

export const CONVERSION_RECOMMENDATIONS: SpecialistRecommendation[] = [
  {
    id: 'conv-rec-1',
    specialistId: SPECIALIST_IDS.CONVERSION,
    insightId: 'conv-insight-1',
    title: 'Show total price before seat selection',
    description: 'Display estimated total price on trip options page to prevent price shock at seat selection.',
    impact: { type: 'revenue', value: 450_000_000, currency: 'IDR', confidence: 80 },
    effort: 'medium',
    deadline: '2 weeks',
    status: 'proposed',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'conv-rec-2',
    specialistId: SPECIALIST_IDS.CONVERSION,
    insightId: 'conv-insight-2',
    title: 'Add e-wallet payment options (GoPay, OVO)',
    description: 'Integrate GoPay and OVO payment methods. Expected 15% lift in checkout completion.',
    impact: { type: 'revenue', value: 600_000_000, currency: 'IDR', confidence: 85 },
    effort: 'high',
    deadline: '1 month',
    status: 'proposed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'conv-rec-3',
    specialistId: SPECIALIST_IDS.CONVERSION,
    insightId: 'conv-insight-3',
    title: 'Fix mobile payment flow',
    description: 'Address timeout issues and reduce payment form steps on mobile app.',
    impact: { type: 'revenue', value: 400_000_000, currency: 'IDR', confidence: 78 },
    effort: 'medium',
    deadline: '3 weeks',
    status: 'proposed',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================
// CROSS-SPECIALIST CORRELATIONS
// ============================================
export const CROSS_SPECIALIST_SIGNALS: CrossSpecialistSignal[] = [
  {
    sourceSpecialistId: SPECIALIST_IDS.OTP,
    targetSpecialistId: SPECIALIST_IDS.NPS,
    correlationStrength: 0.85,
    causalLink: 'Poor OTP (40.6%) is driving low NPS scores. Routes with <50% OTP have 15pt lower NPS.',
  },
  {
    sourceSpecialistId: SPECIALIST_IDS.NPS,
    targetSpecialistId: SPECIALIST_IDS.REVENUE,
    correlationStrength: 0.78,
    causalLink: 'Low NPS leads to high cancellations. R002 NPS crash (9.1) correlates with 51.5% cancellation.',
  },
  {
    sourceSpecialistId: SPECIALIST_IDS.CREW,
    targetSpecialistId: SPECIALIST_IDS.OTP,
    correlationStrength: 0.82,
    causalLink: 'Contract driver gap (10.3pt) directly impacts OTP. D011 at 15% is pulling fleet average down.',
  },
  {
    sourceSpecialistId: SPECIALIST_IDS.CONVERSION,
    targetSpecialistId: SPECIALIST_IDS.REVENUE,
    correlationStrength: 0.65,
    causalLink: '78% session loss represents missed revenue. Fixing checkout could recover Rp 1.5B annually.',
  },
];

// Epicenter routes - appearing across multiple specialists
export const EPICENTER_ROUTES = [
  {
    routeId: 'R002',
    routeName: 'Jakarta-Cirebon',
    affectedSpecialists: ['OTP Specialist', 'NPS Specialist', 'Revenue Specialist'],
    findings: [
      { specialist: 'OTP', metric: 'OTP Rate', value: '35%' },
      { specialist: 'NPS', metric: 'NPS Score', value: '9.1' },
      { specialist: 'Revenue', metric: 'Cancellation Rate', value: '51.5%' },
    ],
    totalValueAtStake: 3_500_000_000, // Combined impact
    recommendation: 'Coordinated intervention required - service quality audit, driver reassignment, customer recovery.',
  },
];

// ============================================
// AGGREGATE EXPORTS
// ============================================
export const TRANSPORTX_SPECIALISTS: Specialist[] = [
  OTP_SPECIALIST,
  REVENUE_SPECIALIST,
  NPS_SPECIALIST,
  CREW_SPECIALIST,
  CONVERSION_SPECIALIST,
];

export const TRANSPORTX_EXECUTIVE_SUMMARIES: Record<string, ExecutiveSummary> = {
  [SPECIALIST_IDS.OTP]: OTP_EXECUTIVE_SUMMARY,
  [SPECIALIST_IDS.REVENUE]: REVENUE_EXECUTIVE_SUMMARY,
  [SPECIALIST_IDS.NPS]: NPS_EXECUTIVE_SUMMARY,
  [SPECIALIST_IDS.CREW]: CREW_EXECUTIVE_SUMMARY,
  [SPECIALIST_IDS.CONVERSION]: CONVERSION_EXECUTIVE_SUMMARY,
};

export const TRANSPORTX_INSIGHTS: SpecialistInsight[] = [
  ...OTP_INSIGHTS,
  ...REVENUE_INSIGHTS,
  ...NPS_INSIGHTS,
  ...CREW_INSIGHTS,
  ...CONVERSION_INSIGHTS,
];

export const TRANSPORTX_RECOMMENDATIONS: SpecialistRecommendation[] = [
  ...OTP_RECOMMENDATIONS,
  ...REVENUE_RECOMMENDATIONS,
  ...NPS_RECOMMENDATIONS,
  ...CREW_RECOMMENDATIONS,
  ...CONVERSION_RECOMMENDATIONS,
];

// Total value at stake
export const TOTAL_VALUE_AT_STAKE = {
  idr: 12_000_000_000, // Rp 12B
  usd: 780_000, // ~$780K
};

// ============================================
// NPS SPECIALIST - ENHANCED DATA FROM JSON FILES
// ============================================

import type {
  NPSPeriodData,
  NPSRootCauseItem,
  VoiceOfCustomer,
  NPSDetailedBusinessImpact,
  NPSRiskProjections,
  NPSEnhancedRecommendation,
  NPSAnalysisData,
} from '@/types/specialist';

// NPS Current Period Data (January 2026)
export const NPS_CURRENT_PERIOD: NPSPeriodData = {
  period: '2026-01',
  periodLabel: 'January 2026',
  overall: {
    totalResponses: 1050,
    promoters: 325,
    passives: 412,
    detractors: 313,
    npsScore: 22.7,
    promoterPct: 31.0,
    detractorPct: 29.8,
  },
  byRoute: {
    R001: {
      routeId: 'R001',
      routeName: 'Jakarta-Bandung',
      responses: 198,
      promoters: 85,
      passives: 68,
      detractors: 45,
      nps: 36.5,
      status: 'strong',
    },
    R002: {
      routeId: 'R002',
      routeName: 'Jakarta-Cirebon',
      responses: 195,
      promoters: 45,
      passives: 78,
      detractors: 72,
      nps: 9.1,
      status: 'crisis',
    },
    R003: {
      routeId: 'R003',
      routeName: 'Bandung-Yogyakarta',
      responses: 215,
      promoters: 62,
      passives: 88,
      detractors: 65,
      nps: 18.6,
      status: 'moderate',
    },
    R004: {
      routeId: 'R004',
      routeName: 'Jakarta-Surabaya',
      responses: 220,
      promoters: 72,
      passives: 92,
      detractors: 56,
      nps: 25.5,
      status: 'good',
    },
    R005: {
      routeId: 'R005',
      routeName: 'Bandung-Semarang',
      responses: 222,
      promoters: 61,
      passives: 86,
      detractors: 75,
      nps: 16.2,
      status: 'below_target',
    },
  },
  byCustomerType: {
    individual: {
      responses: 680,
      promoters: 218,
      passives: 268,
      detractors: 194,
      nps: 23.5,
      pctOfTotal: 65,
    },
    corporate: {
      responses: 370,
      promoters: 107,
      passives: 144,
      detractors: 119,
      nps: 21.1,
      pctOfTotal: 35,
    },
  },
  bySurveyChannel: {
    sms: { responses: 420, nps: 21.5, responseRate: 15.2 },
    app: { responses: 380, nps: 24.8, responseRate: 22.5 },
    email: { responses: 250, nps: 20.8, responseRate: 8.3 },
  },
  trend13Months: [
    { period: '2025-01', nps: 19.5 },
    { period: '2025-02', nps: 15.8 },
    { period: '2025-03', nps: 22.3 },
    { period: '2025-04', nps: 11.9 },
    { period: '2025-05', nps: 20.2 },
    { period: '2025-06', nps: 21.5 },
    { period: '2025-07', nps: 28.6 },
    { period: '2025-08', nps: 25.2 },
    { period: '2025-09', nps: 30.8 },
    { period: '2025-10', nps: 22.5 },
    { period: '2025-11', nps: 15.3 },
    { period: '2025-12', nps: 16.8 },
    { period: '2026-01', nps: 22.7 },
  ],
  routeTrend: {
    R001: { current: 36.5, previous: 21.8, delta: 14.7 },
    R002: { current: 9.1, previous: 12.8, delta: -3.7 },
    R003: { current: 18.6, previous: 15.2, delta: 3.4 },
    R004: { current: 25.5, previous: 20.1, delta: 5.4 },
    R005: { current: 16.2, previous: 14.5, delta: 1.7 },
  },
};

// Root Cause Analysis for R002 Crisis
export const NPS_ROOT_CAUSES_R002: NPSRootCauseItem[] = [
  {
    rank: 1,
    cause: 'OTP Performance Decline',
    contributionPct: 45,
    confidence: 87,
    evidence: [
      'R002 OTP at 38.0% — below fleet average',
      'OTP decline correlates with NPS crash (r=0.78)',
      'Delays averaging 9.2 minutes frustrate passengers',
    ],
    crossSpecialist: 'OTP Specialist confirms R002 at 38% OTP',
  },
  {
    rank: 2,
    cause: 'Driver Service Quality',
    contributionPct: 30,
    confidence: 82,
    evidence: [
      'Verbatim feedback mentions "rude driver" and "unprofessional"',
      'Contract drivers with lower performance on R002',
      'No recent driver training conducted',
    ],
    crossSpecialist: 'Crew Specialist to investigate',
  },
  {
    rank: 3,
    cause: 'Vehicle Comfort Issues',
    contributionPct: 15,
    confidence: 75,
    evidence: [
      'Verbatim mentions of "uncomfortable seats" and "dirty vehicle"',
      'R002 served by older fleet segment',
      'Maintenance schedule adherence unknown',
    ],
    crossSpecialist: 'Fleet Specialist to investigate',
  },
  {
    rank: 4,
    cause: 'Price-Value Perception',
    contributionPct: 10,
    confidence: 70,
    evidence: [
      'R002 ticket price (Rp 225K) perceived as high for service received',
      'Competitor pricing data needed for comparison',
      'Verbatim: "not worth the price"',
    ],
    crossSpecialist: 'Revenue Specialist correlation',
  },
];

// Root Cause Analysis for Overall Volatility
export const NPS_ROOT_CAUSES_VOLATILITY: NPSRootCauseItem[] = [
  {
    rank: 1,
    cause: 'OTP Inconsistency',
    contributionPct: 50,
    confidence: 85,
    evidence: ['OTP swings drive NPS swings with 7-14 day lag'],
  },
  {
    rank: 2,
    cause: 'Seasonal Demand Pressure',
    contributionPct: 25,
    confidence: 75,
    evidence: ['Holiday periods strain capacity, reducing service quality'],
  },
  {
    rank: 3,
    cause: 'Inconsistent Driver Performance',
    contributionPct: 25,
    confidence: 72,
    evidence: ['Mix of high and low performing drivers creates variable experience'],
  },
];

// Voice of Customer Data
export const NPS_VOICE_OF_CUSTOMER: VoiceOfCustomer = {
  detractorThemes: [
    {
      theme: 'Delays and Punctuality',
      frequency: 38,
      percentage: 41,
      sampleVerbatims: [
        'Always late, never on time',
        'Waited 30 minutes past departure time',
        'Delays without any communication',
      ],
      correlation: 'Direct link to OTP Specialist findings',
    },
    {
      theme: 'Driver Behavior',
      frequency: 25,
      percentage: 27,
      sampleVerbatims: [
        'Driver was rude and unhelpful',
        'Unprofessional attitude',
        'Driving too fast, felt unsafe',
      ],
      correlation: 'Link to Crew Specialist',
    },
    {
      theme: 'Vehicle Condition',
      frequency: 18,
      percentage: 19,
      sampleVerbatims: [
        'Seats were uncomfortable',
        'Vehicle was dirty',
        'AC not working properly',
      ],
      correlation: 'Link to Fleet Specialist',
    },
    {
      theme: 'Value for Money',
      frequency: 12,
      percentage: 13,
      sampleVerbatims: [
        'Too expensive for the service',
        'Not worth the price',
        'Competitors are cheaper and better',
      ],
      correlation: 'Link to Revenue Specialist',
    },
  ],
  promoterThemes: [
    {
      theme: 'Convenient Schedule',
      frequency: 45,
      sampleVerbatims: [
        'Great departure times',
        'Frequent trips available',
        'Easy to book',
      ],
    },
    {
      theme: 'Friendly Staff',
      frequency: 32,
      sampleVerbatims: [
        'Driver was very helpful',
        'Staff at counter was friendly',
        'Good customer service',
      ],
    },
  ],
};

// Business Impact Assessment
export const NPS_BUSINESS_IMPACT: NPSDetailedBusinessImpact = {
  customerImpact: {
    totalDetractors: 313,
    atRiskRevenue: 'Rp 156M annually',
    negativeWomReach: 2817,
  },
  operationalImpact: {
    complaintHandlingCost: 'Rp 15M monthly',
    serviceRecoveryCost: 'Rp 8M monthly',
  },
  commercialImpact: {
    routeRevenueAtRisk: 'Rp 50M monthly (R002)',
    overallChurnRisk: '12% of detractors likely to churn',
  },
};

// Risk Projections
export const NPS_RISK_PROJECTIONS: NPSRiskProjections = {
  thirtyDay: {
    npsforecast: 6.0,
    customerLoss: 25,
    revenueImpact: 'Rp 12M',
  },
  ninetyDay: {
    npsForecast: 0,
    netNegativeRisk: true,
    brandDamage: 'Significant word-of-mouth damage (3,000+ people)',
  },
};

// Enhanced Recommendations
export const NPS_ENHANCED_RECOMMENDATIONS: NPSEnhancedRecommendation[] = [
  {
    priority: 1,
    action: 'Launch R002 detractor callback campaign',
    owner: 'CX Manager',
    timing: 'immediate',
    timingLabel: 'Within 48 hours',
    expectedImpact: 'Recover 15-20% of detractors',
    effort: 'medium',
    cost: 'Rp 5M (staff time)',
  },
  {
    priority: 2,
    action: 'Mystery shop R002 route',
    owner: 'Operations Manager',
    timing: 'immediate',
    timingLabel: 'Within 1 week',
    expectedImpact: 'Identify specific service failures',
    effort: 'low',
    cost: 'Rp 2M',
  },
  {
    priority: 3,
    action: 'Cross-reference R002 NPS with OTP data',
    owner: 'Analytics Team',
    timing: 'short_term',
    timingLabel: 'Within 1 week',
    expectedImpact: 'Quantify OTP-NPS correlation',
    effort: 'low',
    cost: 'None',
  },
  {
    priority: 4,
    action: 'Driver service training for R002 crew',
    owner: 'HR Manager',
    timing: 'short_term',
    timingLabel: 'Within 2 weeks',
    expectedImpact: 'Improve driver behavior scores',
    effort: 'medium',
    cost: 'Rp 15M',
  },
  {
    priority: 5,
    action: 'Analyze R001 improvement drivers for replication',
    owner: 'CX Manager',
    timing: 'short_term',
    timingLabel: 'Within 2 weeks',
    expectedImpact: 'Apply learnings to other routes',
    effort: 'low',
    cost: 'None',
  },
  {
    priority: 6,
    action: 'Implement real-time NPS alerts for drops >5 points',
    owner: 'Analytics Team',
    timing: 'medium_term',
    timingLabel: 'Within 1 month',
    expectedImpact: 'Faster response to emerging issues',
    effort: 'medium',
    cost: 'Rp 10M',
  },
];

// ============================================
// HELPER FUNCTIONS FOR DETAIL PAGE
// ============================================

// Metric type hints for chart adaptation
const METRIC_TYPE_MAP: Record<string, 'percentage' | 'score' | 'currency' | 'count'> = {
  is_on_time: 'percentage',
  otp_rate: 'percentage',
  delay_minutes: 'count',
  cancellation_rate: 'percentage',
  gross_value_amount: 'currency',
  ticket_status: 'count',
  seat_count: 'count',
  nps_score: 'score',
  promoters_count: 'count',
  detractors_count: 'count',
  total_responses: 'count',
  booking_rate: 'count',
  conversion_rate: 'percentage',
  utilization_rate: 'percentage',
};

// Specialist-specific baseline values for trend generation
const METRIC_BASELINES: Record<string, Record<string, { value: number; unit: string; label: string }>> = {
  [SPECIALIST_IDS.OTP]: {
    is_on_time: { value: 40.6, unit: '%', label: 'OTP Rate' },
    delay_minutes: { value: 8.2, unit: 'min', label: 'Avg Delay' },
  },
  [SPECIALIST_IDS.REVENUE]: {
    gross_value_amount: { value: 2_400_000_000, unit: 'IDR', label: 'Monthly Revenue' },
    ticket_status: { value: 38, unit: '%', label: 'Cancellation Rate' },
  },
  [SPECIALIST_IDS.NPS]: {
    nps_score: { value: 22.7, unit: 'pts', label: 'NPS Score' },
    total_responses: { value: 1050, unit: '', label: 'Total Responses' },
  },
  [SPECIALIST_IDS.CREW]: {
    is_on_time: { value: 48.5, unit: '%', label: 'Crew OTP Rate' },
  },
  [SPECIALIST_IDS.CONVERSION]: {
    conversion_rate: { value: 22, unit: '%', label: 'Conversion Rate' },
  },
};

/**
 * Generate 30 days of mock metric trend data for a specialist
 */
export function generateMetricsTrend(
  specialistId: string,
  dateRange: '7d' | '30d' | '90d' = '30d',
): { date: string; value: number; metricLabel: string; metricType: 'percentage' | 'score' | 'currency' | 'count' }[] {
  const baselines = METRIC_BASELINES[specialistId];
  if (!baselines) return [];

  // Use the first metric as the primary trend
  const metricKey = Object.keys(baselines)[0];
  const baseline = baselines[metricKey];
  const metricType = METRIC_TYPE_MAP[metricKey] || 'count';

  const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const data: { date: string; value: number; metricLabel: string; metricType: typeof metricType }[] = [];
  const now = new Date();

  // Seed a deterministic-ish random based on specialist ID
  let seed = specialistId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  seed += rangeDays; // vary by date range
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = rangeDays - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate value with realistic variance
    const variance = metricType === 'currency'
      ? baseline.value * 0.08 * (pseudoRandom() - 0.5)
      : metricType === 'score'
        ? (pseudoRandom() - 0.4) * 6
        : (pseudoRandom() - 0.45) * 12;

    // Add a slight trend (worsening toward recent for critical specialists)
    const midpoint = Math.floor(rangeDays / 2);
    const trendFactor = metricType === 'currency' ? 1 : (i > midpoint ? 1.03 : 0.98);

    let value = baseline.value * trendFactor + variance;
    if (metricType === 'percentage') value = Math.max(0, Math.min(100, value));
    if (metricType === 'score') value = Math.max(-100, Math.min(100, value));
    if (metricType === 'count') value = Math.max(0, value);

    data.push({
      date: date.toISOString().split('T')[0],
      value: metricType === 'currency' ? Math.round(value) : parseFloat(value.toFixed(1)),
      metricLabel: baseline.label,
      metricType,
    });
  }

  return data;
}

export interface ActivityLogEntry {
  id: string;
  runDate: string;
  triggerType: 'CronJob' | 'Alert' | 'Manual';
  metricsHealth: 'healthy' | 'warning' | 'critical';
  insightSummary: string;
  requiresAction: boolean;
  actionCount?: number;
}

/**
 * Build activity log from insights + synthetic cron entries
 */
export function buildActivityLog(specialistId: string): ActivityLogEntry[] {
  const insights = TRANSPORTX_INSIGHTS.filter(i => i.specialistId === specialistId);
  const recommendations = TRANSPORTX_RECOMMENDATIONS.filter(r => r.specialistId === specialistId);
  const specialist = TRANSPORTX_SPECIALISTS.find(s => s.id === specialistId);

  const entries: ActivityLogEntry[] = [];

  // Convert real insights into alert-triggered entries
  insights.forEach((insight, idx) => {
    const relatedRecs = recommendations.filter(r => r.insightId === insight.id);
    entries.push({
      id: `log-${insight.id}`,
      runDate: insight.detectedAt,
      triggerType: 'Alert',
      metricsHealth: insight.severity === 'critical' ? 'critical' : insight.severity === 'high' ? 'warning' : 'healthy',
      insightSummary: insight.headline,
      requiresAction: relatedRecs.length > 0,
      actionCount: relatedRecs.length,
    });
  });

  // Add synthetic CronJob entries (scheduled checks that found nothing alarming)
  const refreshRate = specialist?.monitoringScope.refreshRate || 'hourly';
  const intervalMs = refreshRate === 'hourly' ? 60 * 60 * 1000 : refreshRate === 'daily' ? 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
  const now = Date.now();

  for (let i = 1; i <= 5; i++) {
    const runTime = new Date(now - i * intervalMs * (1.5 + Math.random()));
    // Skip if we already have an insight-based entry near this time
    const hasNearby = entries.some(e => Math.abs(new Date(e.runDate).getTime() - runTime.getTime()) < intervalMs * 0.5);
    if (!hasNearby) {
      entries.push({
        id: `log-cron-${specialistId}-${i}`,
        runDate: runTime.toISOString(),
        triggerType: 'CronJob',
        metricsHealth: 'healthy',
        insightSummary: 'Scheduled check — no anomalies detected',
        requiresAction: false,
      });
    }
  }

  // Sort by date descending (most recent first)
  return entries.sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime());
}

export interface ContextPanelData {
  monitoring: {
    metricName: string;
    metricKey: string;
  };
  state: 'healthy' | 'degraded' | 'critical';
  confidence: number;
  lastChecked: string;
  impactScope: {
    label: string;
    value: string;
  }[];
  whatChanged: {
    text: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }[];
}

/**
 * Derive context panel data from existing specialist data
 */
export function deriveContextPanel(specialistId: string): ContextPanelData | null {
  const specialist = TRANSPORTX_SPECIALISTS.find(s => s.id === specialistId);
  const summary = TRANSPORTX_EXECUTIVE_SUMMARIES[specialistId];
  const insights = TRANSPORTX_INSIGHTS.filter(i => i.specialistId === specialistId);

  if (!specialist) return null;

  // Primary metric
  const metricKey = specialist.monitoringScope.metrics[0] || 'metric';
  const baselines = METRIC_BASELINES[specialistId];
  const metricLabel = baselines?.[metricKey]?.label || metricKey.replace(/_/g, ' ');

  // State from executive summary severity
  const state: ContextPanelData['state'] = summary?.severity === 'critical'
    ? 'critical'
    : summary?.severity === 'high'
      ? 'degraded'
      : 'healthy';

  // Confidence from highest insight
  const confidence = insights.length > 0
    ? Math.max(...insights.map(i => i.confidence))
    : 0;

  // Impact scope from insights data
  const impactScope: ContextPanelData['impactScope'] = [];

  // Extract unique dimensions from insights
  const routeIds = new Set<string>();
  const driverIds = new Set<string>();
  insights.forEach(insight => {
    if (insight.data?.routeId) routeIds.add(insight.data.routeId as string);
    if (insight.data?.driverId) driverIds.add(insight.data.driverId as string);
  });

  if (routeIds.size > 0) impactScope.push({ label: 'Affected Routes', value: String(routeIds.size) });
  if (driverIds.size > 0) impactScope.push({ label: 'Affected Drivers', value: String(driverIds.size) });

  // Add dimension info
  const dimensions = specialist.monitoringScope.dimensions || [];
  if (dimensions.length > 0) {
    impactScope.push({ label: 'Dimensions', value: dimensions.map(d => d.replace(/_/g, ' ')).join(', ') });
  }

  // What changed from insight headlines
  const whatChanged = insights.slice(0, 4).map(i => ({
    text: i.headline,
    severity: i.severity,
  }));

  return {
    monitoring: { metricName: metricLabel, metricKey },
    state,
    confidence,
    lastChecked: specialist.lastActiveAt || new Date().toISOString(),
    impactScope,
    whatChanged,
  };
}

/**
 * Get north star metrics and breakdown data for a specialist
 */
export function getNorthStarMetrics(specialistId: string): {
  northStar: { label: string; value: string; unit: string; trend: number; trendLabel: string }[];
  drivers: string[];
  breakdown: { dimension: string; items: { label: string; value: string; status: 'critical' | 'warning' | 'healthy' }[] }[];
} {
  const specialist = TRANSPORTX_SPECIALISTS.find(s => s.id === specialistId);
  const summary = TRANSPORTX_EXECUTIVE_SUMMARIES[specialistId];
  const insights = TRANSPORTX_INSIGHTS.filter(i => i.specialistId === specialistId);

  if (!specialist) return { northStar: [], drivers: [], breakdown: [] };

  const baselines = METRIC_BASELINES[specialistId] || {};
  const northStar = Object.entries(baselines).map(([key, b]) => ({
    label: b.label,
    value: b.unit === 'IDR' ? formatIDR(b.value) : `${b.value}`,
    unit: b.unit === 'IDR' ? '' : b.unit,
    trend: summary?.comparedToPrevious ?? 0,
    trendLabel: summary?.trend === 'declining' ? 'vs prev period' : summary?.trend === 'improving' ? 'vs prev period' : '',
  }));

  const drivers = specialist.monitoringScope.dimensions?.map(d =>
    d.replace(/_/g, ' ').replace(/\bid\b/gi, '').trim()
  ).filter(Boolean) || [];

  // Build breakdown from insight data
  const breakdown: { dimension: string; items: { label: string; value: string; status: 'critical' | 'warning' | 'healthy' }[] }[] = [];

  if (specialistId === SPECIALIST_IDS.OTP) {
    breakdown.push({
      dimension: 'By Driver',
      items: [
        { label: 'D011 (Contract)', value: '15%', status: 'critical' },
        { label: 'D001 (Full-time)', value: '55%', status: 'healthy' },
        { label: 'D003 (Full-time)', value: '48%', status: 'warning' },
        { label: 'Fleet Average', value: '40.6%', status: 'warning' },
      ],
    });
    breakdown.push({
      dimension: 'By Time Slot',
      items: [
        { label: 'Morning (06-09)', value: '29.6%', status: 'critical' },
        { label: 'Midday (10-14)', value: '52.3%', status: 'healthy' },
        { label: 'Afternoon (15-18)', value: '45.1%', status: 'warning' },
      ],
    });
    breakdown.push({
      dimension: 'By Route',
      items: [
        { label: 'R001 Jakarta-Bandung', value: '35%', status: 'critical' },
        { label: 'R002 Jakarta-Cirebon', value: '42%', status: 'warning' },
        { label: 'R003 Bandung-Garut', value: '52%', status: 'healthy' },
      ],
    });
  } else if (specialistId === SPECIALIST_IDS.REVENUE) {
    breakdown.push({
      dimension: 'By Route',
      items: [
        { label: 'R002 Jakarta-Cirebon', value: '51.5% cancel', status: 'critical' },
        { label: 'R001 Jakarta-Bandung', value: '28% cancel', status: 'warning' },
        { label: 'R003 Bandung-Garut', value: '18% cancel', status: 'healthy' },
      ],
    });
    breakdown.push({
      dimension: 'By Channel',
      items: [
        { label: 'OUT01 (Partner)', value: '71.4% cancel', status: 'critical' },
        { label: 'Online Direct', value: '22% cancel', status: 'healthy' },
        { label: 'Counter', value: '15% cancel', status: 'healthy' },
      ],
    });
  } else if (specialistId === SPECIALIST_IDS.NPS) {
    breakdown.push({
      dimension: 'By Route',
      items: [
        { label: 'R001 Jakarta-Bandung', value: '36.5', status: 'healthy' },
        { label: 'R003 Bandung-Garut', value: '28.3', status: 'warning' },
        { label: 'R002 Jakarta-Cirebon', value: '9.1', status: 'critical' },
      ],
    });
    breakdown.push({
      dimension: 'By Customer Type',
      items: [
        { label: 'Individual', value: '20.1', status: 'warning' },
        { label: 'Corporate', value: '28.4', status: 'warning' },
      ],
    });
  }

  return { northStar, drivers, breakdown };
}

/**
 * Generate a TL;DR narrative that synthesizes findings into a readable paragraph.
 * This is the "AI-generated summary" that connects dots across insights.
 */
export function generateTLDR(specialistId: string): string {
  const summary = TRANSPORTX_EXECUTIVE_SUMMARIES[specialistId];
  const insights = TRANSPORTX_INSIGHTS.filter(i => i.specialistId === specialistId);
  const recommendations = TRANSPORTX_RECOMMENDATIONS.filter(r => r.specialistId === specialistId);
  const correlations = CROSS_SPECIALIST_SIGNALS.filter(
    s => s.sourceSpecialistId === specialistId || s.targetSpecialistId === specialistId,
  );

  if (!summary || insights.length === 0) return '';

  const pending = recommendations.filter(r => r.status === 'proposed');
  const topInsight = insights[0];
  const totalImpact = pending.reduce((sum, r) => sum + r.impact.value, 0);

  // Build narrative connecting: situation → root cause → impact → action
  const parts: string[] = [];

  // Situation
  parts.push(`${summary.headline}.`);

  // Key finding with root cause
  if (topInsight.rootCause) {
    parts.push(`The primary driver is ${topInsight.rootCause.toLowerCase().replace(/\.$/, '')}.`);
  }

  // Cross-specialist connection
  if (correlations.length > 0) {
    const strongest = correlations.sort((a, b) => b.correlationStrength - a.correlationStrength)[0];
    parts.push(`This is connected: ${strongest.causalLink.split('.')[0]}.`);
  }

  // Action orientation
  if (pending.length > 0) {
    parts.push(
      `${pending.length} action${pending.length > 1 ? 's' : ''} recommended with ${formatIDR(totalImpact)} combined potential impact. Highest priority: ${pending[0].title.toLowerCase()}.`,
    );
  }

  return parts.join(' ');
}

/**
 * Generate a TL;DR for a date range — synthesizes multiple runs.
 * In production this would aggregate from a DB. For mock data we combine all insights.
 */
export function generateDateRangeTLDR(specialistId: string): string {
  const specialist = TRANSPORTX_SPECIALISTS.find(s => s.id === specialistId);
  const summary = TRANSPORTX_EXECUTIVE_SUMMARIES[specialistId];
  const insights = TRANSPORTX_INSIGHTS.filter(i => i.specialistId === specialistId);
  const recommendations = TRANSPORTX_RECOMMENDATIONS.filter(r => r.specialistId === specialistId);

  if (!specialist || !summary) return '';

  const totalRuns = (specialist.performance?.insightsGenerated ?? 0);
  const approvalRate = specialist.performance?.approvalRate ?? 0;
  const valueDelivered = specialist.performance?.valueDelivered ?? 0;

  return `Over the selected period, ${specialist.name} completed ${totalRuns} analysis runs, generating ${insights.length} key findings and ${recommendations.length} recommendations. The approval rate is ${approvalRate}%, with ${formatIDR(valueDelivered)} in value already delivered. The most persistent issue remains: ${summary.headline.toLowerCase()}. Trend direction: ${summary.trend} (${summary.comparedToPrevious !== undefined ? (summary.comparedToPrevious > 0 ? '+' : '') + summary.comparedToPrevious + '%' : 'stable'} vs previous period).`;
}

/**
 * Get root cause analysis data for a specialist.
 * NPS specialist has structured root cause data; others derive from insight rootCause fields.
 */
export interface RootCauseDataItem {
  rank: number;
  cause: string;
  contributionPct: number;
  confidence: number;
  evidence: string[];
}

export function getRootCauseData(specialistId: string): RootCauseDataItem[] {
  // NPS specialist has rich structured root cause data
  if (specialistId === SPECIALIST_IDS.NPS) {
    return NPS_ROOT_CAUSES_R002.map(rc => ({
      rank: rc.rank,
      cause: rc.cause,
      contributionPct: rc.contributionPct,
      confidence: rc.confidence,
      evidence: rc.evidence,
    }));
  }

  // For other specialists: derive from insight rootCause fields
  const insights = TRANSPORTX_INSIGHTS.filter(i => i.specialistId === specialistId);
  if (insights.length === 0) return [];

  // Weight by severity and confidence
  const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const totalWeight = insights.reduce((sum, i) => sum + (severityWeight[i.severity] || 1), 0);

  return insights
    .filter(i => i.rootCause)
    .sort((a, b) => (severityWeight[b.severity] || 1) - (severityWeight[a.severity] || 1))
    .map((insight, idx) => {
      const weight = severityWeight[insight.severity] || 1;
      const pct = Math.round((weight / totalWeight) * 100);
      return {
        rank: idx + 1,
        cause: insight.rootCause!,
        contributionPct: pct,
        confidence: insight.confidence,
        evidence: [insight.description, insight.headline],
      };
    });
}

/**
 * Generate uptime timeline data for the Agent Status visualization.
 * Produces realistic uptime patterns with clustered maintenance/downtime windows.
 * Slots before the specialist was created are marked 'no_data' (gray).
 */
export function generateTimelineData(
  specialistId: string,
  dateRange: '7d' | '30d' | '90d',
  granularity: 'hourly' | 'daily',
): import('@/types/specialist').TimelineSegment[] {
  // Force daily for 90d to avoid too many blocks
  const effectiveGranularity = dateRange === '90d' ? 'daily' : granularity;

  const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const slotMs = effectiveGranularity === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const totalSlots = effectiveGranularity === 'hourly' ? rangeDays * 24 : rangeDays;

  // Deterministic pseudo-random seeded from specialist ID + dateRange + granularity
  let seed = specialistId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  seed += dateRange.length * 7 + (effectiveGranularity === 'hourly' ? 13 : 37);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const now = Date.now();
  const startTime = now - rangeDays * 24 * 60 * 60 * 1000;

  // Check specialist createdAt — slots before this are 'no_data'
  const specialist = TRANSPORTX_SPECIALISTS.find(s => s.id === specialistId);
  const createdAtMs = specialist ? new Date(specialist.createdAt).getTime() : 0;

  type Status = 'active' | 'paused' | 'not_working' | 'no_data';
  const segments: import('@/types/specialist').TimelineSegment[] = [];

  let currentNonActiveRun = 0;
  let currentNonActiveStatus: Status = 'active';

  for (let i = 0; i < totalSlots; i++) {
    const slotStart = startTime + i * slotMs;
    const timestamp = new Date(slotStart).toISOString();

    // Before specialist existed → no data
    if (slotStart < createdAtMs) {
      segments.push({ timestamp, status: 'no_data', durationMs: slotMs });
      continue;
    }

    let status: Status = 'active';

    if (currentNonActiveRun > 0) {
      status = currentNonActiveStatus;
      currentNonActiveRun--;
    } else {
      const r = pseudoRandom();
      if (r < 0.03) {
        status = 'not_working';
        currentNonActiveStatus = 'not_working';
        currentNonActiveRun = Math.floor(pseudoRandom() * 3);
      } else if (r < 0.08) {
        status = 'paused';
        currentNonActiveStatus = 'paused';
        currentNonActiveRun = Math.floor(pseudoRandom() * 4);
      }
    }

    segments.push({ timestamp, status, durationMs: slotMs });
  }

  return segments;
}

/**
 * Calculate uptime percentage from timeline segments.
 * Only counts slots that have data (excludes 'no_data').
 */
export function calculateUptimePercentage(
  segments: import('@/types/specialist').TimelineSegment[],
): number {
  const withData = segments.filter(s => s.status !== 'no_data');
  if (withData.length === 0) return 100;
  const totalDuration = withData.reduce((sum, s) => sum + s.durationMs, 0);
  const activeDuration = withData
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.durationMs, 0);
  return Math.round((activeDuration / totalDuration) * 1000) / 10;
}

/**
 * Generate metrics health timeline data for the Metrics Health visualization.
 * Produces realistic health status patterns reflecting metric monitoring results.
 * Slots before the specialist was created are marked 'no_data' (gray).
 */
export function generateMetricsHealthTimeline(
  specialistId: string,
  dateRange: '7d' | '30d' | '90d',
  granularity: 'hourly' | 'daily',
): import('@/types/specialist').MetricsHealthSegment[] {
  // Force daily for 90d
  const effectiveGranularity = dateRange === '90d' ? 'daily' : granularity;

  const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const slotMs = effectiveGranularity === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const totalSlots = effectiveGranularity === 'hourly' ? rangeDays * 24 : rangeDays;

  // Deterministic pseudo-random — different seed from agent status
  let seed = specialistId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  seed += dateRange.length * 11 + (effectiveGranularity === 'hourly' ? 29 : 53);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const now = Date.now();
  const startTime = now - rangeDays * 24 * 60 * 60 * 1000;

  // Check specialist createdAt
  const specialist = TRANSPORTX_SPECIALISTS.find(s => s.id === specialistId);
  const createdAtMs = specialist ? new Date(specialist.createdAt).getTime() : 0;

  type Status = 'healthy' | 'warning' | 'critical' | 'no_data';
  const segments: import('@/types/specialist').MetricsHealthSegment[] = [];

  let currentNonHealthyRun = 0;
  let currentNonHealthyStatus: Status = 'healthy';

  for (let i = 0; i < totalSlots; i++) {
    const slotStart = startTime + i * slotMs;
    const timestamp = new Date(slotStart).toISOString();

    // Before specialist existed → no data
    if (slotStart < createdAtMs) {
      segments.push({ timestamp, status: 'no_data', durationMs: slotMs });
      continue;
    }

    let status: Status = 'healthy';

    if (currentNonHealthyRun > 0) {
      status = currentNonHealthyStatus;
      currentNonHealthyRun--;
    } else {
      const r = pseudoRandom();
      if (r < 0.04) {
        status = 'critical';
        currentNonHealthyStatus = 'critical';
        currentNonHealthyRun = Math.floor(pseudoRandom() * 3) + 1;
      } else if (r < 0.12) {
        status = 'warning';
        currentNonHealthyStatus = 'warning';
        currentNonHealthyRun = Math.floor(pseudoRandom() * 4) + 1;
      }
    }

    segments.push({ timestamp, status, durationMs: slotMs });
  }

  return segments;
}

/**
 * Calculate healthy percentage from metrics health timeline segments.
 * Only counts slots that have data (excludes 'no_data').
 */
export function calculateHealthyPercentage(
  segments: import('@/types/specialist').MetricsHealthSegment[],
): number {
  const withData = segments.filter(s => s.status !== 'no_data');
  if (withData.length === 0) return 100;
  const totalDuration = withData.reduce((sum, s) => sum + s.durationMs, 0);
  const healthyDuration = withData
    .filter(s => s.status === 'healthy')
    .reduce((sum, s) => sum + s.durationMs, 0);
  return Math.round((healthyDuration / totalDuration) * 1000) / 10;
}

// Full NPS Analysis Data
export const NPS_FULL_ANALYSIS: NPSAnalysisData = {
  analysisId: 'NPS-2026-01-001',
  generatedAt: '2026-02-04T11:00:00Z',
  periodAnalyzed: 'January 2026 vs December 2025',
  confidence: 89,
  currentPeriod: NPS_CURRENT_PERIOD,
  rootCauseAnalysis: {
    forR002Crisis: NPS_ROOT_CAUSES_R002,
    forOverallVolatility: NPS_ROOT_CAUSES_VOLATILITY,
  },
  voiceOfCustomer: NPS_VOICE_OF_CUSTOMER,
  businessImpact: NPS_BUSINESS_IMPACT,
  riskProjections: NPS_RISK_PROJECTIONS,
  recommendations: NPS_ENHANCED_RECOMMENDATIONS,
  crossSpecialistSignals: {
    fromOtpSpecialist: {
      signal: 'R002 OTP at 38%, confirming delay-driven dissatisfaction',
      action: 'Coordinate R002 OTP improvement with NPS recovery',
    },
    fromRevenueSpecialist: {
      signal: 'R002 has 51.5% cancellation rate',
      correlation: 'Low NPS → High cancellation confirmed',
    },
    toCrewSpecialist: {
      alert: 'R002 drivers flagged for service quality issues',
      recommendation: 'Prioritize R002 driver training',
    },
  },
};
