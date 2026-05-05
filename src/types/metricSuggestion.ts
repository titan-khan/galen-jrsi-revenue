// Metric Suggestion Types - AI-powered metric discovery

import type { Aggregation } from "./metric";
import type { StrategicGoal } from "./companyProfile";

export type SuggestionConfidence = 'high' | 'medium' | 'low';
export type SuggestionClassification = 'required' | 'recommended' | 'optional';
export type ComplexityLevel = 'simple' | 'moderate' | 'advanced';
export type IndicatorType = 'leading' | 'lagging' | 'coincident';
export type SuggestionSource = 'ai-suggested' | 'industry-pattern' | 'schema-detected' | 'user-created';

export interface GoalAlignment {
  goal: StrategicGoal;
  relevance: string; // Why this metric matters for this goal
  impact: 'high' | 'medium' | 'low';
}

export interface MetricSuggestion {
  id: string;
  
  // Basic info
  suggestedName: string;
  description: string;
  
  // Source mapping
  sourceTable: string;
  sourceColumn: string;
  suggestedAggregation: Aggregation;
  suggestedDateColumn: string;
  
  // Classification
  classification: SuggestionClassification;
  confidence: SuggestionConfidence;
  complexityLevel: ComplexityLevel;
  
  // Indicator type
  indicatorType: IndicatorType;
  
  // The "Why" - relevance explanations
  reasoning: string; // General reasoning for this suggestion
  goalAlignments: GoalAlignment[]; // How it aligns with user's goals
  industryContext?: string; // Industry-specific reasoning
  
  // Benchmark (when available)
  benchmark?: {
    value: string;
    label: string;
    source: string;
    percentile?: string; // e.g., "Top quartile", "Median", "75th percentile"
  };
  
  // UI state
  isSelected: boolean;
  isCustomized: boolean;
  
  // Customizations (if user modified the suggestion)
  customizations?: {
    name?: string;
    aggregation?: Aggregation;
    filters?: string[];
  };
}

export interface RelationshipSuggestion {
  id: string;
  
  // Metrics involved
  sourceMetricId: string;
  sourceMetricName: string;
  targetMetricId: string;
  targetMetricName: string;
  
  // Relationship details
  relationshipType: 'leads' | 'lags' | 'correlates';
  suggestedLagDays?: number;
  
  // Confidence & evidence
  confidence: 'schema-based' | 'industry-pattern' | 'data-validated';
  reasoning: string;
  
  // UI state
  isConfirmed: boolean;
  isDismissed: boolean;
  
  // User notes
  userNotes?: string;
}

// Context question for progressive context collection
export interface ContextQuestion {
  id: string;
  question: string;
  type: 'single-select' | 'multi-select' | 'text';
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  relevantForIndustries?: string[];
  relevantForModels?: string[];
  impactDescription: string; // What answering this improves
}

// Context questions for progressive collection
export const CONTEXT_QUESTIONS: ContextQuestion[] = [
  {
    id: 'revenue-model',
    question: 'How do customers pay you?',
    type: 'multi-select',
    options: [
      { value: 'subscription', label: 'Monthly/Annual Subscription', description: 'Recurring billing' },
      { value: 'usage', label: 'Usage-Based', description: 'Pay for what you use' },
      { value: 'one-time', label: 'One-Time Purchase', description: 'Single transaction' },
      { value: 'marketplace', label: 'Marketplace Fees', description: 'Commission on transactions' }
    ],
    impactDescription: 'Helps suggest the right revenue metrics (MRR vs GMV vs ARPU)'
  },
  {
    id: 'growth-stage',
    question: 'What best describes your current focus?',
    type: 'single-select',
    options: [
      { value: 'pmf', label: 'Finding Product-Market Fit', description: 'Early validation' },
      { value: 'growth', label: 'Scaling Growth', description: 'Proven model, expanding' },
      { value: 'efficiency', label: 'Optimizing Efficiency', description: 'Mature, focused on margins' },
      { value: 'expansion', label: 'Market Expansion', description: 'New segments or regions' }
    ],
    impactDescription: 'Prioritizes metrics based on your stage (growth vs efficiency metrics)'
  },
  {
    id: 'sales-cycle',
    question: 'How long is your typical sales cycle?',
    type: 'single-select',
    options: [
      { value: 'self-serve', label: 'Self-Serve', description: 'Minutes to hours' },
      { value: 'short', label: '1-4 Weeks', description: 'Quick sales process' },
      { value: 'medium', label: '1-3 Months', description: 'Standard B2B cycle' },
      { value: 'enterprise', label: '3-12 Months', description: 'Enterprise sales' }
    ],
    relevantForModels: ['subscription', 'b2b'],
    impactDescription: 'Adjusts lag periods for leading indicator relationships'
  }
];
