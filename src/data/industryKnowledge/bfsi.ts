// Banking, Financial Services & Insurance (BFSI) Industry Knowledge Base

import { IndustryKnowledge, MetricPattern, RelationshipTemplate, ContextQuestion } from './types';

export const bfsiMetricPatterns: MetricPattern[] = [
  // === REQUIRED METRICS ===
  {
    id: 'bfsi-nim',
    columnPatterns: ['nim', 'net.*interest.*margin', 'interest.*margin'],
    suggestedMetricName: 'Net Interest Margin (NIM)',
    description: 'Difference between interest income and interest expenses relative to assets',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    formula: '(Interest Income - Interest Expense) / Average Earning Assets × 100',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'NIM is the primary revenue driver for banks' },
      'improve-margins': { impact: 'high', reasoning: 'NIM directly measures profitability spread' }
    },
    benchmark: { value: '2.5-3.5%', percentile: 'Average for commercial banks', source: 'FDIC', year: 2024 },
    relatedMetrics: ['bfsi-roa', 'bfsi-cost-income']
  },
  {
    id: 'bfsi-npl',
    columnPatterns: ['npl', 'non.*perform', 'bad.*loan', 'delinquent'],
    suggestedMetricName: 'Non-Performing Loan Ratio (NPL)',
    description: 'Percentage of loans that are in default or close to default',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'Non-Performing Loans / Total Loans × 100',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'NPLs directly increase provisioning costs' },
      'improve-margins': { impact: 'high', reasoning: 'High NPL erodes profitability' }
    },
    benchmark: { value: '<2%', percentile: 'Healthy bank threshold', source: 'Basel Committee', year: 2024 },
    relatedMetrics: ['bfsi-provision', 'bfsi-default-rate']
  },
  {
    id: 'bfsi-cost-income',
    columnPatterns: ['cost.*income', 'efficiency.*ratio', 'cir'],
    suggestedMetricName: 'Cost-to-Income Ratio',
    description: 'Operating costs as a percentage of operating income',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'Operating Expenses / Operating Income × 100',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'high', reasoning: 'Cost-to-income directly measures operational efficiency' },
      'reduce-costs': { impact: 'high', reasoning: 'Lower ratio means better cost control' },
      'improve-margins': { impact: 'high', reasoning: 'Efficiency drives profitability' }
    },
    benchmark: { value: '<55%', percentile: 'Good for retail banking', source: 'McKinsey', year: 2024 },
    relatedMetrics: ['bfsi-roa', 'bfsi-nim']
  },
  {
    id: 'bfsi-roa',
    columnPatterns: ['roa', 'return.*asset'],
    suggestedMetricName: 'Return on Assets (ROA)',
    description: 'Net income as a percentage of total assets',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'Net Income / Average Total Assets × 100',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'ROA measures overall asset productivity' },
      'improve-margins': { impact: 'high', reasoning: 'ROA shows profitability efficiency' }
    },
    benchmark: { value: '>1%', percentile: 'Good for banks', source: 'FDIC', year: 2024 },
    relatedMetrics: ['bfsi-nim', 'bfsi-roe']
  },

  // === RECOMMENDED METRICS ===
  {
    id: 'bfsi-cac',
    columnPatterns: ['cac', 'acquisition.*cost', 'customer.*acquisition'],
    suggestedMetricName: 'Customer Acquisition Cost (CAC)',
    description: 'Cost to acquire a new customer',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'CAC is a major cost driver for growth' },
      'improve-margins': { impact: 'medium', reasoning: 'Lower CAC improves unit economics' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Efficient CAC enables faster scaling' }
    },
    benchmark: { value: '<$300', percentile: 'Digital banking average', source: 'Deloitte', year: 2024 },
    relatedMetrics: ['bfsi-ltv', 'bfsi-digital-adoption']
  },
  {
    id: 'bfsi-default-rate',
    columnPatterns: ['default', 'delinquency', 'dq.*rate', 'days.*past.*due'],
    suggestedMetricName: 'Loan Default Rate',
    description: 'Percentage of loans that enter default status',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'leading',
    unit: '%',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Defaults drive write-offs and collection costs' },
      'improve-margins': { impact: 'high', reasoning: 'Lower defaults protect profitability' }
    },
    benchmark: { value: '<3%', percentile: 'Consumer lending benchmark', source: 'Experian', year: 2024 },
    relatedMetrics: ['bfsi-npl', 'bfsi-provision']
  },
  {
    id: 'bfsi-retention',
    columnPatterns: ['retention', 'churn', 'attrition'],
    suggestedMetricName: 'Customer Retention Rate',
    description: 'Percentage of customers retained over a period',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Direct measure of customer retention' },
      'increase-revenue': { impact: 'high', reasoning: 'Retained customers drive recurring revenue' },
      'improve-margins': { impact: 'medium', reasoning: 'Retention reduces acquisition costs' }
    },
    benchmark: { value: '>90%', percentile: 'Annual retention for banks', source: 'Bain & Company', year: 2024 },
    relatedMetrics: ['bfsi-nps', 'bfsi-cross-sell']
  },
  {
    id: 'bfsi-aum',
    columnPatterns: ['aum', 'asset.*under.*manage', 'total.*asset'],
    suggestedMetricName: 'Assets Under Management (AUM)',
    description: 'Total market value of assets managed on behalf of clients',
    suggestedAggregation: 'sum',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'AUM drives fee income for wealth management' },
      'accelerate-growth': { impact: 'high', reasoning: 'AUM growth is the primary growth metric' }
    },
    benchmark: { value: '10-15%', percentile: 'YoY growth target', source: 'PwC', year: 2024 },
    relatedMetrics: ['bfsi-revenue', 'bfsi-nim']
  },
  {
    id: 'bfsi-claims-ratio',
    columnPatterns: ['claims.*ratio', 'loss.*ratio', 'claims.*rate'],
    suggestedMetricName: 'Claims Ratio',
    description: 'Claims paid as a percentage of premiums earned (insurance)',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'Claims Paid / Premiums Earned × 100',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: 'Claims ratio directly impacts underwriting profit' },
      'reduce-costs': { impact: 'high', reasoning: 'Lower claims improves profitability' }
    },
    benchmark: { value: '<70%', percentile: 'Healthy for P&C insurance', source: 'AM Best', year: 2024 },
    relatedMetrics: ['bfsi-combined-ratio', 'bfsi-premium']
  },
  {
    id: 'bfsi-digital-adoption',
    columnPatterns: ['digital.*adopt', 'online.*usage', 'mobile.*usage', 'digital.*channel'],
    suggestedMetricName: 'Digital Adoption Rate',
    description: 'Percentage of customers using digital channels',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'leading',
    unit: '%',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'high', reasoning: 'Digital channels cost 10-20x less than branches' },
      'reduce-costs': { impact: 'high', reasoning: 'Digital adoption reduces cost-to-serve' },
      'improve-customer-satisfaction': { impact: 'medium', reasoning: 'Customers prefer digital convenience' }
    },
    benchmark: { value: '>70%', percentile: 'Target for retail banking', source: 'McKinsey', year: 2024 },
    relatedMetrics: ['bfsi-cac', 'bfsi-cost-income']
  },
  {
    id: 'bfsi-cross-sell',
    columnPatterns: ['cross.*sell', 'product.*per.*customer', 'wallet.*share'],
    suggestedMetricName: 'Cross-Sell Ratio',
    description: 'Average number of products per customer',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'More products = more revenue per customer' },
      'reduce-churn': { impact: 'high', reasoning: 'Multi-product customers have lower churn' },
      'improve-margins': { impact: 'medium', reasoning: 'Cross-sell is low-cost revenue' }
    },
    benchmark: { value: '>2.5', percentile: 'Products per retail customer', source: 'Bain & Company', year: 2024 },
    relatedMetrics: ['bfsi-retention', 'bfsi-ltv']
  },

  // === OPTIONAL METRICS ===
  {
    id: 'bfsi-roe',
    columnPatterns: ['roe', 'return.*equity'],
    suggestedMetricName: 'Return on Equity (ROE)',
    description: 'Net income as a percentage of shareholders equity',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'Net Income / Average Shareholders Equity × 100',
    relevanceByGoal: {
      'increase-revenue': { impact: 'medium', reasoning: 'ROE measures return to shareholders' },
      'improve-margins': { impact: 'medium', reasoning: 'ROE shows capital efficiency' }
    },
    benchmark: { value: '>10%', percentile: 'Good for banks', source: 'FDIC', year: 2024 },
    relatedMetrics: ['bfsi-roa', 'bfsi-nim']
  },
  {
    id: 'bfsi-ltv',
    columnPatterns: ['ltv', 'lifetime.*value', 'clv'],
    suggestedMetricName: 'Customer Lifetime Value (LTV)',
    description: 'Predicted total profit from a customer relationship',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'LTV shows total customer revenue potential' },
      'reduce-churn': { impact: 'medium', reasoning: 'Retention directly increases LTV' }
    },
    relatedMetrics: ['bfsi-cac', 'bfsi-retention', 'bfsi-cross-sell']
  },
  {
    id: 'bfsi-nps',
    columnPatterns: ['nps', 'net.*promoter', 'satisfaction'],
    suggestedMetricName: 'Net Promoter Score (NPS)',
    description: 'Customer loyalty and satisfaction score',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'leading',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'NPS directly measures satisfaction' },
      'reduce-churn': { impact: 'high', reasoning: 'Detractors are more likely to leave' }
    },
    benchmark: { value: '>30', percentile: 'Good for banking', source: 'Bain & Company', year: 2024 },
    relatedMetrics: ['bfsi-retention', 'bfsi-cross-sell']
  },
  {
    id: 'bfsi-provision',
    columnPatterns: ['provision', 'loan.*loss', 'reserve', 'allowance'],
    suggestedMetricName: 'Loan Loss Provision',
    description: 'Amount set aside to cover expected loan losses',
    suggestedAggregation: 'sum',
    classification: 'optional',
    indicatorType: 'leading',
    unit: '$',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Provisions directly impact profitability' },
      'improve-margins': { impact: 'high', reasoning: 'Lower provisions improve bottom line' }
    },
    relatedMetrics: ['bfsi-npl', 'bfsi-default-rate']
  },
  {
    id: 'bfsi-combined-ratio',
    columnPatterns: ['combined.*ratio'],
    suggestedMetricName: 'Combined Ratio (Insurance)',
    description: 'Sum of claims and expense ratios (insurance profitability)',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'Claims Ratio + Expense Ratio',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: '<100% means underwriting profit' },
      'reduce-costs': { impact: 'high', reasoning: 'Lower ratio means better efficiency' }
    },
    benchmark: { value: '<100%', percentile: 'Break-even point', source: 'AM Best', year: 2024 },
    relatedMetrics: ['bfsi-claims-ratio']
  }
];

export const bfsiRelationshipTemplates: RelationshipTemplate[] = [
  {
    id: 'bfsi-rel-1',
    sourceMetricPattern: 'bfsi-npl',
    targetMetricPattern: 'bfsi-cost-income',
    relationshipType: 'leads',
    typicalLagDays: { min: 60, max: 120, typical: 90 },
    confidence: 'high',
    reasoning: 'Rising NPLs lead to increased collection costs and provisions, impacting cost-to-income within 60-90 days.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'bfsi-rel-2',
    sourceMetricPattern: 'bfsi-digital-adoption',
    targetMetricPattern: 'bfsi-cac',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 60 },
    confidence: 'high',
    reasoning: 'Higher digital adoption reduces customer acquisition costs as digital channels cost less than branches.',
    evidenceSource: 'research'
  },
  {
    id: 'bfsi-rel-3',
    sourceMetricPattern: 'bfsi-claims-ratio',
    targetMetricPattern: 'bfsi-combined-ratio',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'Claims ratio is the primary driver of combined ratio for insurance companies.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'bfsi-rel-4',
    sourceMetricPattern: 'bfsi-cross-sell',
    targetMetricPattern: 'bfsi-retention',
    relationshipType: 'leads',
    typicalLagDays: { min: 90, max: 180, typical: 120 },
    confidence: 'high',
    reasoning: 'Customers with 3+ products have 50% lower attrition than single-product customers.',
    evidenceSource: 'research'
  },
  {
    id: 'bfsi-rel-5',
    sourceMetricPattern: 'bfsi-default-rate',
    targetMetricPattern: 'bfsi-npl',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 60 },
    confidence: 'high',
    reasoning: 'Early-stage defaults (30-60 DPD) predict NPL formation within 60-90 days.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'bfsi-rel-6',
    sourceMetricPattern: 'bfsi-nps',
    targetMetricPattern: 'bfsi-retention',
    relationshipType: 'leads',
    typicalLagDays: { min: 90, max: 180, typical: 120 },
    confidence: 'medium',
    reasoning: 'NPS correlates with retention. Promoters have 2-3x better retention than detractors.',
    evidenceSource: 'research'
  },
  {
    id: 'bfsi-rel-7',
    sourceMetricPattern: 'bfsi-nim',
    targetMetricPattern: 'bfsi-roa',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'Net interest margin is the primary driver of ROA for traditional banks.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'bfsi-rel-8',
    sourceMetricPattern: 'bfsi-digital-adoption',
    targetMetricPattern: 'bfsi-cost-income',
    relationshipType: 'leads',
    typicalLagDays: { min: 90, max: 180, typical: 120 },
    confidence: 'high',
    reasoning: 'Digital channel migration reduces cost-to-income as digital transactions cost 10-20x less.',
    evidenceSource: 'research'
  }
];

export const bfsiContextQuestions: ContextQuestion[] = [
  {
    id: 'bfsi-segment',
    question: 'What is your primary business segment?',
    options: [
      { value: 'retail', label: 'Retail/Consumer Banking' },
      { value: 'commercial', label: 'Commercial/SMB Banking' },
      { value: 'wealth', label: 'Wealth Management' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'payments', label: 'Payments/Fintech' }
    ],
    impactOnSuggestions: 'Segment determines which metrics (NIM vs Claims Ratio) are most relevant'
  },
  {
    id: 'bfsi-products',
    question: 'What are your primary products?',
    options: [
      { value: 'deposits', label: 'Deposits/Savings' },
      { value: 'lending', label: 'Lending/Credit' },
      { value: 'investments', label: 'Investments/Wealth' },
      { value: 'insurance', label: 'Insurance Products' },
      { value: 'payments', label: 'Payments/Cards' }
    ],
    impactOnSuggestions: 'Product mix affects revenue and risk metric priorities'
  },
  {
    id: 'bfsi-digital-maturity',
    question: 'How would you describe your digital maturity?',
    options: [
      { value: 'traditional', label: 'Traditional (branch-focused)' },
      { value: 'transitioning', label: 'Transitioning to digital' },
      { value: 'digital-first', label: 'Digital-first' },
      { value: 'digital-only', label: 'Digital-only (neobank)' }
    ],
    impactOnSuggestions: 'Digital maturity affects cost structure and channel metrics'
  }
];

export const bfsiKnowledge: IndustryKnowledge = {
  id: 'bfsi',
  displayName: 'Banking & Financial Services',
  description: 'Banks, credit unions, insurance, and fintech companies',
  icon: 'Landmark',
  
  businessModels: [
    {
      id: 'retail-banking',
      label: 'Retail Banking',
      description: 'Consumer banking services',
      priorityMetrics: ['bfsi-nim', 'bfsi-npl', 'bfsi-cost-income', 'bfsi-retention', 'bfsi-digital-adoption']
    },
    {
      id: 'lending',
      label: 'Lending',
      description: 'Consumer or commercial lending',
      priorityMetrics: ['bfsi-nim', 'bfsi-npl', 'bfsi-default-rate', 'bfsi-cac', 'bfsi-provision']
    },
    {
      id: 'insurance',
      label: 'Insurance',
      description: 'Property, casualty, life, or health insurance',
      priorityMetrics: ['bfsi-claims-ratio', 'bfsi-combined-ratio', 'bfsi-retention', 'bfsi-cross-sell', 'bfsi-cac']
    },
    {
      id: 'wealth-management',
      label: 'Wealth Management',
      description: 'Investment and wealth advisory',
      priorityMetrics: ['bfsi-aum', 'bfsi-retention', 'bfsi-cross-sell', 'bfsi-nps', 'bfsi-ltv']
    },
    {
      id: 'payments',
      label: 'Payments',
      description: 'Payments processing and fintech',
      priorityMetrics: ['bfsi-cost-income', 'bfsi-cac', 'bfsi-retention', 'bfsi-digital-adoption']
    }
  ],

  metricPatterns: bfsiMetricPatterns,
  relationshipTemplates: bfsiRelationshipTemplates,
  contextQuestions: bfsiContextQuestions,

  northStarRecommendations: {
    'increase-revenue': {
      metricId: 'bfsi-nim',
      reasoning: 'Net Interest Margin drives core banking revenue'
    },
    'reduce-churn': {
      metricId: 'bfsi-retention',
      reasoning: 'Customer retention rate directly measures churn reduction'
    },
    'improve-efficiency': {
      metricId: 'bfsi-cost-income',
      reasoning: 'Cost-to-income ratio is the primary efficiency metric for financial services'
    },
    'reduce-costs': {
      metricId: 'bfsi-digital-adoption',
      reasoning: 'Digital channel adoption dramatically reduces cost-to-serve'
    },
    'improve-margins': {
      metricId: 'bfsi-roa',
      reasoning: 'Return on Assets shows overall profitability efficiency'
    },
    'improve-customer-satisfaction': {
      metricId: 'bfsi-nps',
      reasoning: 'NPS measures customer satisfaction and loyalty'
    }
  }
};
