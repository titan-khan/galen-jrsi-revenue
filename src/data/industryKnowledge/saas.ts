// SaaS Industry Knowledge Base

import { IndustryKnowledge, MetricPattern, RelationshipTemplate, ContextQuestion } from './types';

export const saasMetricPatterns: MetricPattern[] = [
  // === REQUIRED METRICS ===
  {
    id: 'saas-mrr',
    columnPatterns: ['mrr', 'monthly.*revenue', 'recurring.*revenue', 'subscription.*revenue'],
    suggestedMetricName: 'Monthly Recurring Revenue (MRR)',
    description: 'Total predictable monthly revenue from active subscriptions',
    suggestedAggregation: 'sum',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'MRR directly measures your primary revenue goal' },
      'accelerate-growth': { impact: 'high', reasoning: 'MRR growth rate is the key indicator of business momentum' },
      'reduce-churn': { impact: 'medium', reasoning: 'MRR decline signals customer loss' },
      'improve-margins': { impact: 'medium', reasoning: 'MRR per customer affects unit economics' }
    },
    benchmark: { value: '15-20%', percentile: 'Top quartile MoM growth', source: 'OpenView SaaS Benchmarks', year: 2024 },
    relatedMetrics: ['saas-arr', 'saas-nrr', 'saas-churn']
  },
  {
    id: 'saas-arr',
    columnPatterns: ['arr', 'annual.*revenue', 'yearly.*recurring'],
    suggestedMetricName: 'Annual Recurring Revenue (ARR)',
    description: 'Annualized value of recurring revenue (MRR × 12)',
    suggestedAggregation: 'sum',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '$',
    formula: 'MRR × 12',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'ARR is the standard measure for SaaS company valuation' },
      'accelerate-growth': { impact: 'high', reasoning: 'ARR growth is the primary metric for fundraising and strategy' }
    },
    benchmark: { value: '40-60%', percentile: 'Top quartile YoY growth (Series A-B)', source: 'Bessemer State of the Cloud', year: 2024 },
    relatedMetrics: ['saas-mrr', 'saas-nrr']
  },
  {
    id: 'saas-active-users',
    columnPatterns: ['dau', 'mau', 'active.*user', 'user.*active', 'daily.*user', 'monthly.*user'],
    suggestedMetricName: 'Active Users (DAU/MAU)',
    description: 'Number of users actively engaging with the product',
    suggestedAggregation: 'count',
    classification: 'required',
    indicatorType: 'leading',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Active usage is the strongest predictor of retention' },
      'accelerate-growth': { impact: 'high', reasoning: 'User growth drives future revenue' },
      'increase-revenue': { impact: 'medium', reasoning: 'More active users = more expansion opportunities' }
    },
    benchmark: { value: '13-20%', percentile: 'Good DAU/MAU ratio', source: 'Mixpanel Product Benchmarks', year: 2024 },
    relatedMetrics: ['saas-activation', 'saas-feature-adoption', 'saas-churn']
  },
  {
    id: 'saas-churn',
    columnPatterns: ['churn', 'cancel', 'attrition', 'customer.*loss'],
    suggestedMetricName: 'Customer Churn Rate',
    description: 'Percentage of customers lost over a period',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Direct measure of your churn reduction goal' },
      'increase-revenue': { impact: 'high', reasoning: 'Reducing churn has 5-25x more impact than acquisition' },
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Churn indicates customer dissatisfaction' }
    },
    benchmark: { value: '<2%', percentile: 'Top quartile monthly churn', source: 'ProfitWell Benchmarks', year: 2024 },
    relatedMetrics: ['saas-nrr', 'saas-active-users', 'saas-nps']
  },
  {
    id: 'saas-nrr',
    columnPatterns: ['nrr', 'ndr', 'net.*retention', 'net.*dollar', 'revenue.*retention'],
    suggestedMetricName: 'Net Revenue Retention (NRR)',
    description: 'Revenue retained from existing customers including expansion and contraction',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    formula: '(Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'NRR >100% means revenue grows without new customers' },
      'reduce-churn': { impact: 'high', reasoning: 'NRR captures net impact of churn and expansion' },
      'improve-margins': { impact: 'medium', reasoning: 'High NRR reduces dependency on expensive acquisition' }
    },
    benchmark: { value: '>120%', percentile: 'Top decile (enterprise SaaS)', source: 'KeyBanc SaaS Survey', year: 2024 },
    relatedMetrics: ['saas-mrr', 'saas-churn', 'saas-expansion']
  },

  // === RECOMMENDED METRICS ===
  {
    id: 'saas-cac',
    columnPatterns: ['cac', 'acquisition.*cost', 'customer.*acquisition', 'cost.*acquire'],
    suggestedMetricName: 'Customer Acquisition Cost (CAC)',
    description: 'Total cost to acquire a new customer',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    formula: 'Total Sales & Marketing Spend / New Customers Acquired',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: 'CAC directly impacts profitability' },
      'reduce-costs': { impact: 'high', reasoning: 'Lowering CAC is a primary cost reduction lever' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Efficient CAC enables faster scaling' }
    },
    benchmark: { value: '<$500', percentile: 'SMB SaaS benchmark', source: 'SaaS Capital', year: 2024 },
    relatedMetrics: ['saas-ltv', 'saas-ltv-cac', 'saas-cac-payback']
  },
  {
    id: 'saas-ltv',
    columnPatterns: ['ltv', 'clv', 'lifetime.*value', 'customer.*value'],
    suggestedMetricName: 'Customer Lifetime Value (LTV)',
    description: 'Total revenue expected from a customer over their lifetime',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    formula: 'ARPU × Gross Margin / Churn Rate',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'LTV represents total customer revenue potential' },
      'reduce-churn': { impact: 'high', reasoning: 'Lower churn directly increases LTV' },
      'improve-margins': { impact: 'medium', reasoning: 'LTV improvement shows unit economics health' }
    },
    benchmark: { value: '>$15,000', percentile: 'Healthy SMB SaaS', source: 'ChartMogul', year: 2024 },
    relatedMetrics: ['saas-cac', 'saas-ltv-cac', 'saas-arpu']
  },
  {
    id: 'saas-ltv-cac',
    columnPatterns: ['ltv.*cac', 'ltv:cac', 'ltv/cac'],
    suggestedMetricName: 'LTV:CAC Ratio',
    description: 'Ratio of customer lifetime value to acquisition cost',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    formula: 'LTV / CAC',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: 'LTV:CAC >3 indicates healthy unit economics' },
      'accelerate-growth': { impact: 'high', reasoning: 'Higher ratio means more efficient growth' },
      'reduce-costs': { impact: 'medium', reasoning: 'Improving ratio reduces cost per dollar revenue' }
    },
    benchmark: { value: '>3:1', percentile: 'Healthy threshold', source: 'David Skok / For Entrepreneurs', year: 2024 },
    relatedMetrics: ['saas-ltv', 'saas-cac']
  },
  {
    id: 'saas-cac-payback',
    columnPatterns: ['payback', 'cac.*payback', 'months.*recover'],
    suggestedMetricName: 'CAC Payback Period',
    description: 'Months to recover customer acquisition cost',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: 'months',
    formula: 'CAC / (ARPU × Gross Margin)',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'high', reasoning: 'Shorter payback improves capital efficiency' },
      'improve-margins': { impact: 'high', reasoning: 'Quick payback reduces cash burn' },
      'reduce-costs': { impact: 'medium', reasoning: 'Lower payback means faster ROI on marketing' }
    },
    benchmark: { value: '<12', percentile: 'Target months for SMB', source: 'Tomasz Tunguz', year: 2024 },
    relatedMetrics: ['saas-cac', 'saas-arpu']
  },
  {
    id: 'saas-trial-conversion',
    columnPatterns: ['trial.*convert', 'conversion.*rate', 'free.*paid', 'trial.*rate'],
    suggestedMetricName: 'Trial-to-Paid Conversion Rate',
    description: 'Percentage of trial users who become paying customers',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'leading',
    unit: '%',
    relevanceByGoal: {
      'accelerate-growth': { impact: 'high', reasoning: 'Higher conversion accelerates customer acquisition' },
      'increase-revenue': { impact: 'high', reasoning: 'More conversions = more paying customers' },
      'reduce-costs': { impact: 'medium', reasoning: 'Better conversion reduces CAC' }
    },
    benchmark: { value: '15-25%', percentile: 'Good range for freemium', source: 'OpenView', year: 2024 },
    relatedMetrics: ['saas-activation', 'saas-cac', 'saas-time-to-value']
  },
  {
    id: 'saas-activation',
    columnPatterns: ['activation', 'aha.*moment', 'first.*value', 'onboard.*complete'],
    suggestedMetricName: 'Activation Rate',
    description: 'Percentage of new users reaching their first "aha moment"',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'leading',
    unit: '%',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Activated users have 3-5x better retention' },
      'accelerate-growth': { impact: 'high', reasoning: 'Higher activation improves entire funnel' },
      'improve-customer-satisfaction': { impact: 'medium', reasoning: 'Quick value delivery increases satisfaction' }
    },
    benchmark: { value: '>40%', percentile: 'Target for PLG companies', source: 'Amplitude', year: 2024 },
    relatedMetrics: ['saas-trial-conversion', 'saas-time-to-value', 'saas-feature-adoption']
  },
  {
    id: 'saas-feature-adoption',
    columnPatterns: ['feature.*adopt', 'feature.*use', 'feature.*engage'],
    suggestedMetricName: 'Feature Adoption Rate',
    description: 'Percentage of users using key product features',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'leading',
    unit: '%',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Multi-feature users have lowest churn' },
      'increase-revenue': { impact: 'medium', reasoning: 'Feature usage drives expansion revenue' },
      'improve-customer-satisfaction': { impact: 'medium', reasoning: 'Feature value increases satisfaction' }
    },
    benchmark: { value: '>60%', percentile: 'For core features', source: 'Pendo', year: 2024 },
    relatedMetrics: ['saas-active-users', 'saas-activation', 'saas-nps']
  },

  // === OPTIONAL METRICS ===
  {
    id: 'saas-expansion',
    columnPatterns: ['expansion', 'upsell', 'cross.*sell', 'upgrade'],
    suggestedMetricName: 'Expansion Revenue',
    description: 'Additional revenue from existing customers through upsells/cross-sells',
    suggestedAggregation: 'sum',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'Expansion is the most efficient revenue source' },
      'improve-margins': { impact: 'high', reasoning: 'Expansion has near-zero acquisition cost' }
    },
    benchmark: { value: '>30%', percentile: 'Of new ARR from expansion', source: 'Bessemer', year: 2024 },
    relatedMetrics: ['saas-nrr', 'saas-arpu']
  },
  {
    id: 'saas-contraction',
    columnPatterns: ['contraction', 'downgrade', 'reduction'],
    suggestedMetricName: 'Contraction Revenue',
    description: 'Revenue lost from customer downgrades',
    suggestedAggregation: 'sum',
    classification: 'optional',
    indicatorType: 'leading',
    unit: '$',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Contraction often precedes full churn' },
      'increase-revenue': { impact: 'medium', reasoning: 'Contraction directly reduces revenue' }
    },
    relatedMetrics: ['saas-nrr', 'saas-churn']
  },
  {
    id: 'saas-arpu',
    columnPatterns: ['arpu', 'arpa', 'average.*revenue.*user', 'revenue.*per.*user'],
    suggestedMetricName: 'Average Revenue Per User (ARPU)',
    description: 'Average monthly revenue generated per user/account',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '$',
    formula: 'MRR / Total Active Customers',
    relevanceByGoal: {
      'increase-revenue': { impact: 'medium', reasoning: 'Higher ARPU increases revenue without new customers' },
      'improve-margins': { impact: 'medium', reasoning: 'Higher ARPU improves unit economics' }
    },
    benchmark: { value: 'Varies', percentile: 'Depends on segment', source: 'Industry specific', year: 2024 },
    relatedMetrics: ['saas-mrr', 'saas-ltv', 'saas-expansion']
  },
  {
    id: 'saas-time-to-value',
    columnPatterns: ['time.*value', 'ttv', 'time.*first', 'onboard.*time'],
    suggestedMetricName: 'Time to Value (TTV)',
    description: 'Time for new users to experience first meaningful value',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'leading',
    unit: 'days',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Faster TTV dramatically improves retention' },
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Quick value = happy customers' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Faster TTV improves trial conversion' }
    },
    benchmark: { value: '<7', percentile: 'Target days for PLG', source: 'OpenView', year: 2024 },
    relatedMetrics: ['saas-activation', 'saas-trial-conversion']
  },
  {
    id: 'saas-nps',
    columnPatterns: ['nps', 'net.*promoter', 'recommend.*score'],
    suggestedMetricName: 'Net Promoter Score (NPS)',
    description: 'Customer loyalty and satisfaction score (-100 to +100)',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'leading',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'NPS directly measures satisfaction' },
      'reduce-churn': { impact: 'high', reasoning: 'Detractors have 2-3x higher churn' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Promoters drive referral growth' }
    },
    benchmark: { value: '>50', percentile: 'Good NPS for SaaS', source: 'Delighted', year: 2024 },
    relatedMetrics: ['saas-churn', 'saas-feature-adoption']
  },
  {
    id: 'saas-magic-number',
    columnPatterns: ['magic.*number', 'sales.*efficiency'],
    suggestedMetricName: 'SaaS Magic Number',
    description: 'Sales efficiency metric measuring ARR growth per S&M dollar',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    formula: 'Net New ARR / Prior Quarter S&M Spend',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'high', reasoning: 'Measures go-to-market efficiency' },
      'accelerate-growth': { impact: 'high', reasoning: '>0.75 signals time to invest in growth' },
      'improve-margins': { impact: 'medium', reasoning: 'Higher number means better ROI on sales spend' }
    },
    benchmark: { value: '>0.75', percentile: 'Signal to invest more', source: 'Scale VP', year: 2024 },
    relatedMetrics: ['saas-arr', 'saas-cac']
  },
  {
    id: 'saas-quick-ratio',
    columnPatterns: ['quick.*ratio', 'growth.*efficiency'],
    suggestedMetricName: 'SaaS Quick Ratio',
    description: 'Ratio of revenue growth to revenue churn',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    formula: '(New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)',
    relevanceByGoal: {
      'accelerate-growth': { impact: 'high', reasoning: 'Quick ratio >4 indicates efficient growth' },
      'reduce-churn': { impact: 'high', reasoning: 'Denominator captures all revenue losses' },
      'increase-revenue': { impact: 'medium', reasoning: 'Measures net revenue momentum' }
    },
    benchmark: { value: '>4', percentile: 'Healthy growth indicator', source: 'Mamoon Hamid', year: 2024 },
    relatedMetrics: ['saas-nrr', 'saas-churn', 'saas-expansion']
  }
];

export const saasRelationshipTemplates: RelationshipTemplate[] = [
  {
    id: 'saas-rel-1',
    sourceMetricPattern: 'saas-active-users',
    targetMetricPattern: 'saas-mrr',
    relationshipType: 'leads',
    typicalLagDays: { min: 14, max: 30, typical: 21 },
    confidence: 'high',
    reasoning: 'Active user growth typically translates to MRR growth within 2-4 weeks as engaged users convert and expand.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'saas-rel-2',
    sourceMetricPattern: 'saas-feature-adoption',
    targetMetricPattern: 'saas-churn',
    relationshipType: 'leads',
    typicalLagDays: { min: 21, max: 45, typical: 30 },
    confidence: 'high',
    reasoning: 'Low feature adoption is a leading indicator of churn. Users who don\'t adopt core features are 3x more likely to churn.',
    evidenceSource: 'research'
  },
  {
    id: 'saas-rel-3',
    sourceMetricPattern: 'saas-nrr',
    targetMetricPattern: 'saas-mrr',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'NRR directly correlates with MRR growth. Companies with >100% NRR grow revenue without acquiring new customers.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'saas-rel-4',
    sourceMetricPattern: 'saas-cac',
    targetMetricPattern: 'saas-ltv',
    relationshipType: 'lags',
    typicalLagDays: { min: 90, max: 180, typical: 120 },
    confidence: 'medium',
    reasoning: 'CAC investments take 3-6 months to validate through observed LTV as customer cohorts mature.',
    evidenceSource: 'best-practice'
  },
  {
    id: 'saas-rel-5',
    sourceMetricPattern: 'saas-trial-conversion',
    targetMetricPattern: 'saas-mrr',
    relationshipType: 'leads',
    typicalLagDays: { min: 14, max: 45, typical: 30 },
    confidence: 'high',
    reasoning: 'Trial conversion rate changes impact MRR within the trial period length as new customers start paying.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'saas-rel-6',
    sourceMetricPattern: 'saas-activation',
    targetMetricPattern: 'saas-churn',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 60 },
    confidence: 'high',
    reasoning: 'Users who fail to activate in their first week have 60% higher churn over the following 90 days.',
    evidenceSource: 'research'
  },
  {
    id: 'saas-rel-7',
    sourceMetricPattern: 'saas-nps',
    targetMetricPattern: 'saas-churn',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 60 },
    confidence: 'high',
    reasoning: 'Detractors (NPS 0-6) are 2-3x more likely to churn within 90 days compared to promoters.',
    evidenceSource: 'research'
  },
  {
    id: 'saas-rel-8',
    sourceMetricPattern: 'saas-expansion',
    targetMetricPattern: 'saas-nrr',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'Expansion revenue is a direct component of NRR. Higher expansion immediately improves retention metrics.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'saas-rel-9',
    sourceMetricPattern: 'saas-contraction',
    targetMetricPattern: 'saas-churn',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 45 },
    confidence: 'high',
    reasoning: 'Customers who downgrade are 4x more likely to churn completely within 90 days.',
    evidenceSource: 'research'
  },
  {
    id: 'saas-rel-10',
    sourceMetricPattern: 'saas-time-to-value',
    targetMetricPattern: 'saas-trial-conversion',
    relationshipType: 'leads',
    typicalLagDays: { min: 7, max: 21, typical: 14 },
    confidence: 'high',
    reasoning: 'Faster time to value directly improves trial conversion. Each day reduction can improve conversion by 2-5%.',
    evidenceSource: 'best-practice'
  }
];

export const saasContextQuestions: ContextQuestion[] = [
  {
    id: 'saas-pricing-model',
    question: 'What is your primary pricing model?',
    description: 'This affects which revenue metrics are most relevant',
    options: [
      { value: 'seat-based', label: 'Per-seat/user pricing' },
      { value: 'usage-based', label: 'Usage-based pricing' },
      { value: 'flat-rate', label: 'Flat monthly/annual rate' },
      { value: 'hybrid', label: 'Hybrid (base + usage)' }
    ],
    impactOnSuggestions: 'Seat-based prioritizes user metrics; usage-based prioritizes consumption metrics'
  },
  {
    id: 'saas-sales-motion',
    question: 'How do customers typically buy your product?',
    options: [
      { value: 'self-serve', label: 'Self-serve (credit card)' },
      { value: 'sales-assisted', label: 'Sales-assisted' },
      { value: 'enterprise', label: 'Enterprise (contract)' },
      { value: 'mixed', label: 'Mixed motion' }
    ],
    impactOnSuggestions: 'Self-serve emphasizes PLG metrics; sales-led emphasizes pipeline metrics'
  },
  {
    id: 'saas-trial-type',
    question: 'What type of trial/free tier do you offer?',
    options: [
      { value: 'free-trial', label: 'Time-limited free trial' },
      { value: 'freemium', label: 'Freemium (free tier forever)' },
      { value: 'demo-only', label: 'Demo/POC only' },
      { value: 'none', label: 'No trial/free option' }
    ],
    relevantForModels: ['freemium', 'subscription'],
    impactOnSuggestions: 'Trial types change conversion funnel metrics'
  },
  {
    id: 'saas-contract-length',
    question: 'What is your typical contract length?',
    options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'annual', label: 'Annual' },
      { value: 'multi-year', label: 'Multi-year' },
      { value: 'mixed', label: 'Mix of terms' }
    ],
    impactOnSuggestions: 'Contract length affects churn measurement and cohort analysis windows'
  }
];

export const saasKnowledge: IndustryKnowledge = {
  id: 'saas',
  displayName: 'SaaS / Software',
  description: 'Software-as-a-Service and subscription software businesses',
  icon: 'Cloud',
  
  businessModels: [
    {
      id: 'subscription',
      label: 'Subscription',
      description: 'Traditional SaaS with monthly/annual subscriptions',
      priorityMetrics: ['saas-mrr', 'saas-arr', 'saas-churn', 'saas-nrr', 'saas-ltv-cac']
    },
    {
      id: 'usage-based',
      label: 'Usage-Based',
      description: 'Pay-as-you-go pricing based on consumption',
      priorityMetrics: ['saas-mrr', 'saas-active-users', 'saas-expansion', 'saas-nrr', 'saas-arpu']
    },
    {
      id: 'freemium',
      label: 'Freemium',
      description: 'Free tier with paid upgrades',
      priorityMetrics: ['saas-active-users', 'saas-trial-conversion', 'saas-activation', 'saas-mrr', 'saas-feature-adoption']
    },
    {
      id: 'hybrid',
      label: 'Hybrid',
      description: 'Combination of subscription and usage-based',
      priorityMetrics: ['saas-mrr', 'saas-arpu', 'saas-expansion', 'saas-nrr', 'saas-active-users']
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      description: 'Platform connecting buyers and sellers',
      priorityMetrics: ['saas-active-users', 'saas-mrr', 'saas-nrr', 'saas-churn']
    }
  ],

  metricPatterns: saasMetricPatterns,
  relationshipTemplates: saasRelationshipTemplates,
  contextQuestions: saasContextQuestions,

  northStarRecommendations: {
    'increase-revenue': {
      metricId: 'saas-arr',
      reasoning: 'ARR is the standard SaaS valuation metric and directly measures revenue growth'
    },
    'reduce-churn': {
      metricId: 'saas-nrr',
      reasoning: 'NRR captures net revenue impact of churn, contraction, and expansion together'
    },
    'accelerate-growth': {
      metricId: 'saas-mrr',
      reasoning: 'MRR growth rate is the clearest indicator of business momentum'
    },
    'improve-margins': {
      metricId: 'saas-ltv-cac',
      reasoning: 'LTV:CAC ratio shows unit economics health and margin sustainability'
    },
    'improve-efficiency': {
      metricId: 'saas-magic-number',
      reasoning: 'Magic number measures sales efficiency and helps optimize go-to-market spend'
    },
    'improve-customer-satisfaction': {
      metricId: 'saas-nps',
      reasoning: 'NPS directly measures customer satisfaction and loyalty'
    }
  }
};
