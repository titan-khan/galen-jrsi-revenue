// Specialist Domain Categories
//
// PKB pilot uses two domains aligned with the compliance + revenue-recovery
// pillars. Legacy values are kept so JRSI/transport specialists in the codebase
// (and any historic DB rows) continue to type-check.
export type SpecialistDomain =
  // PKB pilot (primary)
  | 'compliance'
  | 'revenue-recovery'
  // Deprecated PKB domain — kept for any legacy rows that might still reference it
  | 'governance'
  // Legacy (JRSI / transport)
  | 'supply-chain'
  | 'commercial'
  | 'customer'
  | 'finance'
  | 'road-safety'
  | 'insurance'
  | 'data-ops';

// Specialist status — simple binary model
export type SpecialistStatus =
  | 'active'      // Running, monitoring
  | 'paused';     // Temporarily stopped

// Agent timeline status for uptime visualization
export type AgentTimelineStatus = 'active' | 'paused' | 'not_working' | 'no_data';

export interface TimelineSegment {
  timestamp: string;
  status: AgentTimelineStatus;
  durationMs: number;
}

// Metrics health timeline status for metrics health visualization
export type MetricsHealthStatus = 'healthy' | 'warning' | 'critical' | 'no_data';

export interface MetricsHealthSegment {
  timestamp: string;
  status: MetricsHealthStatus;
  durationMs: number;
}

// Monitoring rule configuration
export interface MonitoringRule {
  id: string;
  name: string;

  // When condition - e.g., "Actual lift < Planned lift by"
  whenCondition: string;
  whenValue: number;
  whenUnit?: string; // e.g., '%', 'days', 'units'

  // For scope (optional)
  forScope?: string;
  forOptions?: string[];

  // After timing (optional)
  afterValue?: number;
  afterUnit?: string; // 'days', 'hours', 'minutes'
  afterDescription?: string;

  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;

  // AI recommendation (optional)
  reason?: string; // Why this rule is recommended
}

// Insight types (findings from specialist)
export type InsightType = 'anomaly' | 'trend' | 'pattern' | 'risk';
export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';
export type InsightStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed';

export interface SpecialistInsight {
  id: string;
  specialistId: string;
  type: InsightType;
  severity: InsightSeverity;
  headline: string;
  description?: string;
  rootCause?: string;
  rootCauseRanks?: number[];  // ranks of root causes this insight maps to
  confidence: number;
  detectedAt: string;
  status: InsightStatus;
  relatedMetrics?: string[];
  data?: Record<string, unknown>;
}

// Recommendation structure
export type RecommendationStatus = 'proposed' | 'approved' | 'rejected' | 'executed' | 'measured';

export interface RecommendationImpact {
  type: 'revenue' | 'cost' | 'risk' | 'efficiency';
  value: number;
  currency?: string;
  confidence: number;
}

/** McKinsey-style structured recommendation breakdown */
export interface StructuredRecommendationContent {
  currentState: string;
  targetState: string;
  calculation: {
    lineItems: string[];
    assumptions?: string[];
    result: string;
  };
  quarterlyImpact: string;
  tactics: string[];
  /** Things that could go wrong (downside vs the upside in quarterlyImpact) */
  riskFactors?: string[];
  /** Post-implementation KPIs to monitor — how do we know it worked? */
  successMetrics?: string[];
  /** Prerequisite blockers: data access, MoU, budget, multi-instansi coordination */
  dependencies?: string[];
}

/** PIC (Penanggung Jawab) — who's accountable for executing this action */
export interface RecommendationAssignee {
  name: string;
  role: string;
  unit?: string; // e.g. "Bidang PKB", "UPTD Palangka Raya"
}

export type RecommendationActivityAction =
  | 'created'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'measured'
  | 'reassigned';

export interface RecommendationActivityEntry {
  id: string;
  action: RecommendationActivityAction;
  actor?: string;
  note?: string;
  createdAt: string;
}

export interface SpecialistRecommendation {
  id: string;
  insightId?: string;
  specialistId: string;
  title: string;
  description: string;
  /** McKinsey-style structured content (null for legacy runs → falls back to description prose) */
  structuredContent?: StructuredRecommendationContent;
  impact: RecommendationImpact;
  effort: 'low' | 'medium' | 'high';
  deadline?: string;
  status: RecommendationStatus;
  rootCauseRank?: number;                       // which root cause this addresses
  actionScope?: 'strategic' | 'tactical';       // strategic vs tactical categorization
  relatedInsightIds?: string[];                 // insight IDs this recommendation addresses
  approver?: string;
  approvedAt?: string;
  executedAt?: string;
  createdAt: string;
  // ── Governance fields (PKB pilot) ──
  /** PIC — who will execute this action */
  assignee?: RecommendationAssignee;
  /** Note captured at approval */
  approvalNote?: string;
  /** Reason captured at rejection */
  rejectedNote?: string;
  approvedBy?: string;
  rejectedBy?: string;
  /** Audit trail (created → approved/rejected → reassigned → executed → measured) */
  activityLog?: RecommendationActivityEntry[];
  /** Platform-first CTA: if LLM recommends creating a Galen specialist for ongoing monitoring */
  galenAction?: {
    type: 'create_specialist';
    suggestedName: string;
    suggestedBusinessView: BusinessView;
    suggestedMetrics: string[];
    suggestedDescription: string;
  } | null;
}

// Specialist performance tracking
export interface SpecialistPerformance {
  insightsGenerated: number;
  actionsRecommended: number;
  actionsApproved: number;
  falsePositiveRate: number;
  valueDelivered: number;
  approvalRate: number;
}

// Scope-level filter applied to a specialist's monitoring queries.
// Distinct from MetricFilter in `metric.ts` (which is per-metric-definition).
// MonitoringFilter constrains every metric the specialist watches.
//
// NOTE: A mirror of this type lives at
// `supabase/functions/run-specialist/types.ts` because the Deno edge function
// can't import from src/. Keep them in sync.
export interface MonitoringFilter {
  id: string;
  /** Dimension id — must match a DimensionDefinition.id from pkbRegistry. */
  dimension: string;
  operator: 'eq' | 'in' | 'neq' | 'gte' | 'lte' | 'between';
  value: string | string[] | { min: string; max: string };
}

// Monitoring scope configuration
export interface MonitoringScope {
  dataSources: string[];
  refreshRate: string;
  metrics: string[];
  dimensions?: string[];
  filters?: MonitoringFilter[];
}

// Main Specialist interface
export interface Specialist {
  id: string;
  name: string;
  handle: string;  // e.g. 'otp' displays as @otp
  description: string;
  domain: SpecialistDomain;
  templateId: string;
  status: SpecialistStatus;
  
  // What it monitors
  monitoringScope: MonitoringScope;
  
  // Rules it follows
  monitoringRules: MonitoringRule[];

  // Performance metrics
  performance: SpecialistPerformance;
  
  // New creation wizard fields
  businessView?: BusinessView;
  useCaseId?: string;
  metrics?: MetricConfig[];
  drivers?: MetricConfig[];
  knowledgeBase?: KnowledgeBaseConfig;
  notifications?: NotificationConfig;

  // Timestamps
  createdAt: string;
  createdBy: string;
  lastActiveAt?: string;
  lastInsightAt?: string;
}

// Template for hiring new specialists
export interface SpecialistTemplate {
  id: string;
  name: string;
  handle: string;  // default handle for new specialists
  description: string;
  icon: string;
  domain: SpecialistDomain;
  monitors: string[];
  detects: string[];
  recommends: string[];
  defaultRules?: Partial<MonitoringRule>[];
}

// Domain configuration for UI
export interface DomainConfig {
  id: SpecialistDomain;
  name: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

// Team-level performance aggregation
export interface TeamPerformance {
  totalSpecialists: number;
  activeSpecialists: number;
  insightsGenerated: number;
  actionsRecommended: number;
  approvalRate: number;
  valueDelivered: number;
  pendingApprovals: number;
}

// ============================================
// BUSINESS VIEW & USE CASE TYPES (Creation Wizard)
// ============================================

// Business View categories (replaces domain-based template selection)
//
// PKB pilot business views are 3 MECE lenses (Compliance Health,
// Revenue & Arrears, Treatment Execution). Geographic and vehicle
// dimensions are NOT separate views — they are drivers used inside
// any of the three. Legacy values are kept so older code paths
// still type-check.
export type BusinessView =
  // PKB pilot (primary, MECE)
  | 'compliance-health'
  | 'revenue-arrears'
  | 'treatment-execution'
  // PKB pilot (deprecated — old slugs, kept for migration safety)
  | 'data-trust'
  | 'compliance-pyramid'
  | 'revenue-recovery'
  | 'geographic-coverage'
  | 'vehicle-segmentation'
  | 'data-governance'
  // Legacy generic
  | 'revenue'
  | 'operations'
  | 'customer-experience'
  | 'cost-optimization'
  | 'risk-compliance'
  | 'fleet-assets'
  // Legacy JRSI
  | 'accident-monitoring'
  | 'risk-mapping'
  | 'vehicle-intelligence'
  | 'santunan-claims'
  | 'cause-analysis'
  | 'data-quality';

// Use Case definition — auto-generates metrics, dimensions & rules.
//
// defaultDimensions = breakdown axes (e.g. 'kabupaten_id', 'segmen_kepatuhan')
//   → ids in PKB_AVAILABLE_DIMENSIONS, populate monitoringScope.dimensions
// defaultDrivers = true driver metrics (other measures suspected to move the
//   monitored metric — NOT grouping axes)
export interface UseCase {
  id: string;
  name: string;
  description: string;
  businessView: BusinessView;
  defaultMetrics: MetricConfig[];
  defaultDimensions?: string[];
  defaultDrivers: MetricConfig[];
  defaultRules: Partial<MonitoringRule>[];
}

// Metric chip (for main metrics & key drivers)
export interface MetricConfig {
  id: string;
  name: string;
  isCustom?: boolean; // true if user-added
}

// Knowledge Base configuration
export interface KnowledgeBaseConfig {
  files: KnowledgeFile[];
  instructions: string;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  size: number;       // bytes
  type: string;       // MIME type
  uploadedAt: string;
}

// Notification configuration
export interface NotificationConfig {
  channels: {
    inApp: boolean;
    email: boolean;
    slack: boolean;
  };
  emailRecipients?: string[];
  frequency: 'realtime' | 'daily' | 'weekly';
  severityFilter: ('critical' | 'high' | 'medium' | 'low')[];
  quietHours?: {
    enabled: boolean;
    from: string; // HH:mm
    to: string;
  };
}

// Business View UI config
export interface BusinessViewConfig {
  id: BusinessView;
  name: string;
  icon: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

// ============================================
// ANALYSIS RESULT TYPES (for pre-populated data)
// ============================================

// Executive summary for specialist findings
export interface ExecutiveSummary {
  headline: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  valueAtStake: number;
  currency: 'IDR' | 'USD';
  keyFinding: string;
  trend: 'improving' | 'declining' | 'stable';
  comparedToPrevious: number; // percentage change
}

// Root cause analysis with confidence
export interface RootCauseAnalysis {
  id: string;
  description: string;
  confidence: number; // 0-100
  evidenceCount: number;
  relatedInsights: string[];
}

// Business impact calculation
export interface BusinessImpact {
  valueAtStake: number;
  currency: 'IDR' | 'USD';
  timeframe: 'yearly' | 'monthly' | 'quarterly';
  breakdown?: {
    category: string;
    value: number;
    percentage: number;
  }[];
}

// Cross-specialist correlation signals
export interface CrossSpecialistSignal {
  sourceSpecialistId: string;
  targetSpecialistId: string;
  /** Display name for the target specialist (resolved from ID or from DB name field) */
  targetSpecialistName?: string;
  correlationStrength: number; // 0-1
  causalLink: string;
}

// Full analysis result structure
export interface SpecialistAnalysisResult {
  specialistId: string;
  analysisDate: string;
  executiveSummary: ExecutiveSummary;
  insights: SpecialistInsight[];
  recommendations: SpecialistRecommendation[];
  rootCauses: RootCauseAnalysis[];
  businessImpact: BusinessImpact;
  crossSignals: CrossSpecialistSignal[];
}

// ============================================
// NPS-SPECIFIC DETAILED TYPES
// ============================================

// NPS Overall Metrics
export interface NPSOverallMetrics {
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  npsScore: number;
  promoterPct: number;
  detractorPct: number;
}

// NPS Route Metrics
export interface NPSRouteMetrics {
  routeId: string;
  routeName: string;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;
  status: 'strong' | 'good' | 'moderate' | 'below_target' | 'crisis';
}

// NPS Customer Segment Metrics
export interface NPSSegmentMetrics {
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;
  pctOfTotal?: number;
}

// NPS Channel Metrics
export interface NPSChannelMetrics {
  responses: number;
  nps: number;
  responseRate: number;
}

// NPS Trend Point
export interface NPSTrendPoint {
  period: string;
  nps: number;
}

// NPS Route Trend
export interface NPSRouteTrend {
  current: number;
  previous: number;
  delta: number;
}

// Full NPS Period Data
export interface NPSPeriodData {
  period: string;
  periodLabel: string;
  overall: NPSOverallMetrics;
  byRoute: Record<string, NPSRouteMetrics>;
  byCustomerType: Record<string, NPSSegmentMetrics>;
  bySurveyChannel: Record<string, NPSChannelMetrics>;
  trend13Months: NPSTrendPoint[];
  routeTrend: Record<string, NPSRouteTrend>;
}

// Root Cause Item with structured evidence
export interface NPSRootCauseItem {
  rank: number;
  cause: string;
  contributionPct: number;
  confidence: number;
  evidence: string[];
  crossSpecialist?: string;
}

// Theme with verbatim samples
export interface ThemeWithVerbatims {
  theme: string;
  frequency: number;
  percentage?: number;
  sampleVerbatims: string[];
  correlation?: string;
}

// Voice of Customer
export interface VoiceOfCustomer {
  detractorThemes: ThemeWithVerbatims[];
  promoterThemes: ThemeWithVerbatims[];
}

// Detailed Business Impact
export interface NPSDetailedBusinessImpact {
  customerImpact: {
    totalDetractors: number;
    atRiskRevenue: string;
    negativeWomReach: number;
  };
  operationalImpact: {
    complaintHandlingCost: string;
    serviceRecoveryCost: string;
  };
  commercialImpact: {
    routeRevenueAtRisk: string;
    overallChurnRisk: string;
  };
}

// Risk Projections
export interface NPSRiskProjections {
  thirtyDay: {
    npsforecast: number;
    customerLoss: number;
    revenueImpact: string;
  };
  ninetyDay: {
    npsForecast: number;
    netNegativeRisk: boolean;
    brandDamage: string;
  };
}

// Enhanced Recommendation with timing and owner
export interface NPSEnhancedRecommendation {
  priority: number;
  action: string;
  owner: string;
  timing: 'immediate' | 'short_term' | 'medium_term';
  timingLabel: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  cost: string;
}

// Full NPS Analysis Data
export interface NPSAnalysisData {
  analysisId: string;
  generatedAt: string;
  periodAnalyzed: string;
  confidence: number;
  currentPeriod: NPSPeriodData;
  rootCauseAnalysis: {
    forR002Crisis: NPSRootCauseItem[];
    forOverallVolatility: NPSRootCauseItem[];
  };
  voiceOfCustomer: VoiceOfCustomer;
  businessImpact: NPSDetailedBusinessImpact;
  riskProjections: NPSRiskProjections;
  recommendations: NPSEnhancedRecommendation[];
  crossSpecialistSignals: {
    fromOtpSpecialist: { signal: string; action: string };
    fromRevenueSpecialist: { signal: string; correlation: string };
    toCrewSpecialist: { alert: string; recommendation: string };
  };
}
