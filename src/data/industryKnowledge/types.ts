// Industry Knowledge Base Types

import { Industry, BusinessModel, StrategicGoal } from '@/types/companyProfile';

export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count' | 'ratio';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type EvidenceSource = 'research' | 'industry-standard' | 'best-practice';

export interface GoalRelevance {
  impact: ImpactLevel;
  reasoning: string;
}

export interface Benchmark {
  value: string;
  percentile: string;
  source: string;
  year: number;
  notes?: string;
}

export interface MetricPattern {
  id: string;
  columnPatterns: string[]; // Regex patterns as strings for serialization
  suggestedMetricName: string;
  description: string;
  suggestedAggregation: Aggregation;
  classification: 'required' | 'recommended' | 'optional';
  indicatorType: 'leading' | 'lagging' | 'coincident';
  relevanceByGoal: Partial<Record<StrategicGoal, GoalRelevance>>;
  benchmark?: Benchmark;
  relatedMetrics: string[]; // IDs of related metric patterns
  formula?: string; // Optional formula description
  unit?: string; // e.g., '%', '$', 'days'
}

export interface LagPeriod {
  min: number;
  max: number;
  typical: number;
}

export interface RelationshipTemplate {
  id: string;
  sourceMetricPattern: string; // MetricPattern ID
  targetMetricPattern: string; // MetricPattern ID
  relationshipType: 'leads' | 'lags' | 'correlates';
  typicalLagDays?: LagPeriod;
  confidence: ConfidenceLevel;
  reasoning: string;
  evidenceSource: EvidenceSource;
}

export interface BusinessModelConfig {
  id: BusinessModel;
  label: string;
  description: string;
  priorityMetrics: string[]; // MetricPattern IDs
  additionalRelationships?: string[]; // RelationshipTemplate IDs
}

export interface ContextQuestion {
  id: string;
  question: string;
  description?: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  relevantForModels?: BusinessModel[];
  impactOnSuggestions?: string;
}

export interface NorthStarRecommendation {
  metricId: string;
  reasoning: string;
}

export interface IndustryKnowledge {
  id: Industry;
  displayName: string;
  description: string;
  icon: string;
  
  // Business model specific knowledge
  businessModels: BusinessModelConfig[];
  
  // Core knowledge
  metricPatterns: MetricPattern[];
  relationshipTemplates: RelationshipTemplate[];
  
  // Progressive context questions
  contextQuestions: ContextQuestion[];
  
  // North Star recommendations by goal
  northStarRecommendations: Partial<Record<StrategicGoal, NorthStarRecommendation>>;
}
