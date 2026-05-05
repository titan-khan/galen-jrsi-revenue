// Shared utilities and cross-industry patterns

import { MetricPattern, RelationshipTemplate } from './types';

// Cross-industry metric patterns that apply to most businesses
export const sharedMetricPatterns: MetricPattern[] = [
  {
    id: 'shared-revenue',
    columnPatterns: ['revenue', 'sales', 'income', 'earnings'],
    suggestedMetricName: 'Total Revenue',
    description: 'Total revenue generated from all sources',
    suggestedAggregation: 'sum',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'Direct measure of revenue performance' },
      'accelerate-growth': { impact: 'high', reasoning: 'Revenue growth is the primary growth indicator' }
    },
    relatedMetrics: ['shared-profit', 'shared-customers']
  },
  {
    id: 'shared-profit',
    columnPatterns: ['profit', 'margin', 'ebitda', 'net.*income'],
    suggestedMetricName: 'Profit/Margin',
    description: 'Profitability after costs',
    suggestedAggregation: 'sum',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: 'Direct measure of profitability' },
      'reduce-costs': { impact: 'high', reasoning: 'Profit increases as costs decrease' }
    },
    relatedMetrics: ['shared-revenue', 'shared-costs']
  },
  {
    id: 'shared-customers',
    columnPatterns: ['customer', 'client', 'account', 'user'],
    suggestedMetricName: 'Total Customers',
    description: 'Number of active customers or accounts',
    suggestedAggregation: 'count',
    classification: 'required',
    indicatorType: 'lagging',
    relevanceByGoal: {
      'accelerate-growth': { impact: 'high', reasoning: 'Customer growth is a primary growth indicator' },
      'expand-market-share': { impact: 'high', reasoning: 'More customers = larger market share' }
    },
    relatedMetrics: ['shared-revenue', 'shared-new-customers']
  },
  {
    id: 'shared-new-customers',
    columnPatterns: ['new.*customer', 'acquisition', 'signup', 'registration'],
    suggestedMetricName: 'New Customers',
    description: 'Number of new customers acquired',
    suggestedAggregation: 'count',
    classification: 'recommended',
    indicatorType: 'lagging',
    relevanceByGoal: {
      'accelerate-growth': { impact: 'high', reasoning: 'New customer acquisition drives growth' },
      'expand-market-share': { impact: 'high', reasoning: 'New customers expand market presence' }
    },
    relatedMetrics: ['shared-customers', 'shared-cac']
  },
  {
    id: 'shared-cac',
    columnPatterns: ['cac', 'acquisition.*cost', 'cost.*acquire'],
    suggestedMetricName: 'Customer Acquisition Cost',
    description: 'Average cost to acquire a new customer',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'CAC is often the largest growth-related cost' },
      'improve-margins': { impact: 'high', reasoning: 'Lower CAC improves unit economics' }
    },
    relatedMetrics: ['shared-new-customers', 'shared-ltv']
  },
  {
    id: 'shared-ltv',
    columnPatterns: ['ltv', 'clv', 'lifetime.*value', 'customer.*value'],
    suggestedMetricName: 'Customer Lifetime Value',
    description: 'Total value expected from a customer over their lifetime',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'LTV represents total customer revenue potential' },
      'reduce-churn': { impact: 'high', reasoning: 'Retention directly increases LTV' }
    },
    relatedMetrics: ['shared-cac', 'shared-retention']
  },
  {
    id: 'shared-retention',
    columnPatterns: ['retention', 'churn', 'attrition'],
    suggestedMetricName: 'Customer Retention Rate',
    description: 'Percentage of customers retained over time',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Retention is the inverse of churn' },
      'increase-revenue': { impact: 'high', reasoning: 'Retained customers drive recurring revenue' }
    },
    relatedMetrics: ['shared-ltv', 'shared-nps']
  },
  {
    id: 'shared-nps',
    columnPatterns: ['nps', 'net.*promoter', 'satisfaction', 'csat'],
    suggestedMetricName: 'Net Promoter Score',
    description: 'Customer satisfaction and loyalty score',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'leading',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'NPS directly measures satisfaction' },
      'reduce-churn': { impact: 'high', reasoning: 'Promoters have much lower churn' }
    },
    relatedMetrics: ['shared-retention', 'shared-referrals']
  },
  {
    id: 'shared-costs',
    columnPatterns: ['cost', 'expense', 'spend', 'opex'],
    suggestedMetricName: 'Total Costs/Expenses',
    description: 'Total operating costs and expenses',
    suggestedAggregation: 'sum',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Direct measure of cost performance' },
      'improve-margins': { impact: 'high', reasoning: 'Lower costs improve margins' }
    },
    relatedMetrics: ['shared-revenue', 'shared-profit']
  },
  {
    id: 'shared-employee-count',
    columnPatterns: ['employee', 'headcount', 'staff', 'fte'],
    suggestedMetricName: 'Employee Count',
    description: 'Number of employees or full-time equivalents',
    suggestedAggregation: 'count',
    classification: 'optional',
    indicatorType: 'coincident',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'medium', reasoning: 'Revenue per employee shows productivity' },
      'reduce-costs': { impact: 'medium', reasoning: 'Headcount is often the largest cost' }
    },
    relatedMetrics: ['shared-costs', 'shared-revenue']
  }
];

// Cross-industry relationship patterns
export const sharedRelationshipTemplates: RelationshipTemplate[] = [
  {
    id: 'shared-rel-1',
    sourceMetricPattern: 'shared-nps',
    targetMetricPattern: 'shared-retention',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 60 },
    confidence: 'high',
    reasoning: 'NPS is a leading indicator of retention. Promoters stay longer, detractors churn.',
    evidenceSource: 'research'
  },
  {
    id: 'shared-rel-2',
    sourceMetricPattern: 'shared-new-customers',
    targetMetricPattern: 'shared-revenue',
    relationshipType: 'leads',
    typicalLagDays: { min: 0, max: 30, typical: 14 },
    confidence: 'high',
    reasoning: 'New customers generate revenue shortly after acquisition.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'shared-rel-3',
    sourceMetricPattern: 'shared-retention',
    targetMetricPattern: 'shared-ltv',
    relationshipType: 'leads',
    typicalLagDays: { min: 90, max: 180, typical: 120 },
    confidence: 'high',
    reasoning: 'Higher retention directly increases customer lifetime value over time.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'shared-rel-4',
    sourceMetricPattern: 'shared-cac',
    targetMetricPattern: 'shared-profit',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'Higher CAC reduces profit margins; they are inversely correlated.',
    evidenceSource: 'industry-standard'
  }
];

// Utility functions for pattern matching
export function matchColumnPattern(columnName: string, patterns: string[]): boolean {
  const normalizedName = columnName.toLowerCase().replace(/[_\-\s]/g, '');
  return patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\s+/g, '.*'), 'i');
    return regex.test(normalizedName) || regex.test(columnName);
  });
}

export function findMatchingPatterns(
  columnNames: string[],
  metricPatterns: MetricPattern[]
): Array<{ column: string; pattern: MetricPattern; matchScore: number }> {
  const matches: Array<{ column: string; pattern: MetricPattern; matchScore: number }> = [];
  
  for (const column of columnNames) {
    for (const pattern of metricPatterns) {
      if (matchColumnPattern(column, pattern.columnPatterns)) {
        // Calculate match score based on pattern specificity
        const matchScore = pattern.columnPatterns.some(p => 
          column.toLowerCase().includes(p.replace(/\.\*/g, ''))
        ) ? 1 : 0.7;
        
        matches.push({ column, pattern, matchScore });
      }
    }
  }
  
  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// Goal priority weights for sorting suggestions
export const GOAL_PRIORITY_WEIGHTS: Record<string, number> = {
  'increase-revenue': 10,
  'accelerate-growth': 9,
  'reduce-churn': 8,
  'improve-margins': 7,
  'reduce-costs': 6,
  'optimize-operations': 5,
  'improve-customer-satisfaction': 4,
  'expand-market-share': 3,
  'improve-efficiency': 2
};

export function calculateGoalRelevanceScore(
  pattern: MetricPattern,
  primaryGoal: string,
  secondaryGoals: string[]
): number {
  let score = 0;
  
  // Primary goal has highest weight
  if (pattern.relevanceByGoal[primaryGoal as keyof typeof pattern.relevanceByGoal]) {
    const relevance = pattern.relevanceByGoal[primaryGoal as keyof typeof pattern.relevanceByGoal];
    score += relevance?.impact === 'high' ? 30 : relevance?.impact === 'medium' ? 20 : 10;
  }
  
  // Secondary goals have medium weight
  for (const goal of secondaryGoals) {
    if (pattern.relevanceByGoal[goal as keyof typeof pattern.relevanceByGoal]) {
      const relevance = pattern.relevanceByGoal[goal as keyof typeof pattern.relevanceByGoal];
      score += relevance?.impact === 'high' ? 15 : relevance?.impact === 'medium' ? 10 : 5;
    }
  }
  
  // Classification weight
  score += pattern.classification === 'required' ? 20 : pattern.classification === 'recommended' ? 10 : 0;
  
  return score;
}
