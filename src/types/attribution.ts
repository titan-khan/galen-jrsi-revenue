// Impact attribution types for MECE performance justification

export type ImpactCategory = 
  | 'galen-growth'      // Growth drivers from agent recommendations
  | 'galen-risk'        // Risk mitigation from agent alerts
  | 'external-seasonal'  // Seasonal factors
  | 'external-market'    // Market/competitor factors
  | 'external-other'     // Other external factors
  | 'unexplained';       // Residual variance

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AttributionEntry {
  id: string;
  category: ImpactCategory;
  label: string;
  value: number;
  percentage: number;
  confidence: ConfidenceLevel;
  sourceType?: 'recommendation' | 'alert' | 'external' | 'calculated';
  sourceId?: string;
  description?: string;
  methodology?: string;
}

export type DetectionSource = 'agent' | 'manual' | 'system';

export interface ExternalFactor {
  id: string;
  name: string;
  category: 'seasonal' | 'market' | 'competitor' | 'regulatory' | 'other';
  estimatedImpact: number;
  impactRange?: { min: number; max: number };
  confidence: ConfidenceLevel;
  source: string;
  dateRange: { start: string; end: string };
  isIncluded: boolean;
  // Agent-driven fields
  detectionSource: DetectionSource;
  evidence?: string;
  agentId?: string;
  agentName?: string;
  isChallenged?: boolean;
  challengeReason?: string;
  challengedAt?: string;
  challengedBy?: string;
}

export interface AttributionChainStep {
  level: 'action' | 'metric' | 'north-star';
  id: string;
  name: string;
  value: number;
  valueFormatted: string;
  contributionPercentage: number;
}

export interface AttributionChain {
  actionItemId: string;
  actionItemTitle: string;
  chain: AttributionChainStep[];
  totalContribution: number;
  confidence: ConfidenceLevel;
}

export interface PerformancePeriod {
  start: string;
  end: string;
  label: string;
}

export interface PerformanceSummary {
  id: string;
  period: PerformancePeriod;
  metricName: string;
  metricUnit: string;
  startValue: number;
  endValue: number;
  totalChange: number;
  totalChangePercentage: number;
  attributions: AttributionEntry[];
  galenTotal: number;
  galenPercentage: number;
  externalTotal: number;
  externalPercentage: number;
  unexplainedTotal: number;
  unexplainedPercentage: number;
  overallConfidence: ConfidenceLevel;
  generatedAt: string;
  // Synced ROI metrics
  predictedImpact: number;
  realizedImpact: number;
  overallROI: number;
}

export interface WaterfallDataPoint {
  name: string;
  value: number;
  category: ImpactCategory | 'start' | 'end';
  fill: string;
  isTotal?: boolean;
  runningTotal?: number;
}

export interface IssueTreeNode {
  id: string;
  label: string;
  value?: number;
  valueFormatted?: string;
  percentage?: number;
  category?: ImpactCategory;
  children?: IssueTreeNode[];
  isExpanded?: boolean;
}

// Category display configuration
export const CATEGORY_CONFIG: Record<ImpactCategory, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  'galen-growth': {
    label: 'Growth Drivers',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    icon: 'TrendingUp',
  },
  'galen-risk': {
    label: 'Risk Mitigation',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500',
    icon: 'Shield',
  },
  'external-seasonal': {
    label: 'Seasonality',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-400',
    icon: 'Calendar',
  },
  'external-market': {
    label: 'Market Factors',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500',
    icon: 'Globe',
  },
  'external-other': {
    label: 'Other External',
    color: 'text-slate-500 dark:text-slate-500',
    bgColor: 'bg-slate-300',
    icon: 'MoreHorizontal',
  },
  'unexplained': {
    label: 'Unexplained Variance',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-400',
    icon: 'HelpCircle',
  },
};
