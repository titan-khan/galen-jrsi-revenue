export type MetricStatus = "healthy" | "warning" | "critical";
export type Aggregation = "sum" | "avg" | "count" | "min" | "max";
export type TimeGranularity = "day" | "week" | "month" | "quarter" | "year";
export type SparklineType = "cumulative" | "non-cumulative";
export type ValueSentiment = "up-good" | "up-bad";
export type MetricDomain =
  // Generic / legacy
  | 'Revenue' | 'Cost' | 'Fee' | 'Margin' | 'Operational' | 'Performance'
  // JRSI (road safety / accidents)
  | 'Accident Overview' | 'Financial' | 'Vehicle' | 'TRL Risk' | 'Cause Analysis' | 'Data Quality' | 'Time Analysis'
  // PKB Palangka Raya pilot
  | 'Compliance' | 'Treatment' | 'SWDKLLJ' | 'Demographic' | 'Claims' | 'Safety' | 'Risk' | 'Cause' | 'Temporal'
  // Governance
  | 'Governance';
export type MetricType = 'actionable' | 'result' | 'observational' | 'experimental';

export interface MetricFilter {
  dimension: string;
  operator: string;
  value: string;
}

export interface MetricTarget {
  value: number;
  label?: string;
  period?: string;
}

export interface MetricDefinition {
  id: string;
  
  // Basic Info
  name: string;
  description: string;
  dataSource: string;
  
  // Configuration
  measure: string;
  aggregation: Aggregation;
  sparklineType: SparklineType;
  dateField: string;
  timeGranularity: TimeGranularity;
  valueSentiment: ValueSentiment;
  filters: MetricFilter[];
  adjustableFilters: string[];
  insightTypes: {
    trend: boolean;
    comparison: boolean;
    anomaly: boolean;
  };
  
  // Optional Target
  target?: MetricTarget;
  
  // Catalog Info
  category: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  
  // User-specific
  isFollowing: boolean;

  // Domain & hierarchy (for tree / browse)
  domain?: MetricDomain;
  metricType?: MetricType;
  parentMetricId?: string | null;
  direction?: 'up_is_good' | 'down_is_good' | 'neutral';

  // Display Data (computed for cards)
  displayData: {
    filterContext: string;
    comparisonLabel: string; // e.g. "vs Dec 2025" or "vs Jan 2025 (YoY)"
    currentValue: string;
    changePercent: number;
    changeAbsolute: string;
    status: MetricStatus;
    sparklineData: Array<{ month: string; value: number }>;
    insight: { text: string; boldParts: string[] };
    targetProgress?: number;
  };
}

// --- Metric Tree (Relationships tab) ---

export interface MetricTreeNode {
  metricId: string;
  parentMetricId: string | null;
  children: string[];
  level: number;
}

// --- AI Summary (Following tab) ---

export interface AISummaryData {
  agentName: string;
  timestamp: string;
  paragraph: string;
  boldParts: string[];
  positiveChanges: string[];
  negativeChanges: string[];
  topRisers: Array<{ metricId: string; name: string; changePercent: number }>;
  needsAttention: Array<{ metricId: string; name: string; changePercent: number }>;
}

// --- AI Suggestions ---

export interface AISuggestionItem {
  id: string;
  metricId: string;
  metricName: string;
  domain: MetricDomain;
  confidence: number;
  value: string;
  changePercent: number;
  why: string;
  relatedMetricPath: string[];
  accentType: 'warning' | 'info';
}

// --- Metric Certification (mirrors meta.metric_certification rows) ---

export type CertificationLevel = 'gold' | 'silver' | 'bronze';

export interface MetricCertification {
  metricId: string;
  metricName: string;
  metricSlug: string;
  businessDomain: string;
  certificationLevel: CertificationLevel;
  confidenceScore: number | null;
  certifiedAt: string | null;
  certifiedBy: string | null;
  lastValidatedAt: string | null;
  governanceSource: string | null;
  ownerTeam: string | null;
  notes: string | null;
}
