// Company Profile Types - Business Context Intelligence System

export type Industry = 'saas' | 'retail' | 'bfsi' | 'logistics' | 'healthcare' | 'manufacturing' | 'other';
export type CompanyStage = 'startup' | 'growth' | 'mature' | 'enterprise';
export type CustomerType = 'b2b' | 'b2c' | 'b2b2c' | 'mixed';

// Business model options per industry
export type SaaSBusinessModel = 'subscription' | 'usage-based' | 'hybrid' | 'marketplace' | 'freemium';
export type RetailBusinessModel = 'online' | 'omnichannel' | 'marketplace' | 'd2c' | 'b2b-wholesale';
export type BFSIBusinessModel = 'retail-banking' | 'lending' | 'insurance' | 'wealth-management' | 'payments';
export type LogisticsBusinessModel = '3pl' | 'last-mile' | 'freight' | 'warehousing' | 'courier';
export type HealthcareBusinessModel = 'provider' | 'payer' | 'pharma' | 'digital-health' | 'medical-devices';
export type ManufacturingBusinessModel = 'discrete' | 'process' | 'mixed-mode' | 'make-to-order' | 'make-to-stock';

export type BusinessModel = 
  | SaaSBusinessModel 
  | RetailBusinessModel 
  | BFSIBusinessModel 
  | LogisticsBusinessModel
  | HealthcareBusinessModel
  | ManufacturingBusinessModel
  | string; // Allow custom models

// Sales motion for SaaS/B2B
export type SalesMotion = 'plg' | 'sales-led' | 'hybrid' | 'partner-led';

// Strategic goals
export type StrategicGoal = 
  | 'increase-revenue'
  | 'reduce-churn'
  | 'improve-margins'
  | 'accelerate-growth'
  | 'optimize-operations'
  | 'improve-customer-satisfaction'
  | 'expand-market-share'
  | 'reduce-costs'
  | 'improve-efficiency';

export interface BusinessUnit {
  id: string;
  name: string;
  industry?: Industry;
  businessModels?: BusinessModel[];
}

export interface CompanyProfile {
  id: string;
  name: string;
  
  // Industry & Business Model (supports hybrid)
  industry: Industry;
  businessModels: BusinessModel[];
  
  // Company characteristics
  stage: CompanyStage;
  customerType: CustomerType;
  salesMotion?: SalesMotion;
  
  // Strategic context
  primaryGoal: StrategicGoal;
  secondaryGoals: StrategicGoal[];
  
  // Time context
  fiscalYearStart: number; // Month 1-12
  
  // North Star
  northStarMetricId?: string;
  
  // Enterprise features
  businessUnits?: BusinessUnit[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Industry Knowledge Types

export interface MetricPattern {
  columnPatterns: string[]; // regex patterns to match column names
  suggestedMetricName: string;
  suggestedAggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  classification: 'required' | 'recommended' | 'optional';
  indicatorType: 'leading' | 'lagging' | 'coincident';
  description: string;
  relevanceByGoal: Partial<Record<StrategicGoal, string>>; // goal -> why it matters
}

export interface RelationshipTemplate {
  sourceMetricPattern: string;
  targetMetricPattern: string;
  relationshipType: 'leads' | 'lags' | 'correlates';
  typicalLagDays?: number;
  description: string;
}

export interface IndustryKnowledge {
  industry: Industry;
  displayName: string;
  description: string;
  icon: string;
  
  // Business model options for this industry
  businessModelOptions: Array<{
    value: BusinessModel;
    label: string;
    description: string;
  }>;
  
  // Metric patterns specific to this industry
  metricPatterns: MetricPattern[];
  
  // Relationship templates
  relationshipTemplates: RelationshipTemplate[];
  
  // Industry-specific questions for context collection
  contextQuestions: Array<{
    id: string;
    question: string;
    options: string[];
    relevantForModels?: BusinessModel[];
  }>;
}

// Default company profile for new users
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  id: 'default',
  name: 'My Company',
  industry: 'saas',
  businessModels: ['subscription'],
  stage: 'growth',
  customerType: 'b2b',
  salesMotion: 'hybrid',
  primaryGoal: 'increase-revenue',
  secondaryGoals: ['reduce-churn', 'improve-margins'],
  fiscalYearStart: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Display labels for UI
export const INDUSTRY_LABELS: Record<Industry, string> = {
  saas: 'SaaS / Software',
  retail: 'Retail / E-commerce',
  bfsi: 'Banking & Financial Services',
  logistics: 'Logistics & Supply Chain',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
  other: 'Other',
};

export const STAGE_LABELS: Record<CompanyStage, string> = {
  startup: 'Startup (Pre-PMF)',
  growth: 'Growth Stage',
  mature: 'Mature / Established',
  enterprise: 'Enterprise',
};

export const GOAL_LABELS: Record<StrategicGoal, string> = {
  'increase-revenue': 'Increase Revenue',
  'reduce-churn': 'Reduce Churn',
  'improve-margins': 'Improve Margins',
  'accelerate-growth': 'Accelerate Growth',
  'optimize-operations': 'Optimize Operations',
  'improve-customer-satisfaction': 'Improve Customer Satisfaction',
  'expand-market-share': 'Expand Market Share',
  'reduce-costs': 'Reduce Costs',
  'improve-efficiency': 'Improve Efficiency',
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  b2b: 'B2B (Business)',
  b2c: 'B2C (Consumer)',
  b2b2c: 'B2B2C (Both)',
  mixed: 'Mixed',
};
