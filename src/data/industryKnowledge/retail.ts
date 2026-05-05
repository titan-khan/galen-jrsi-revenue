// Retail / E-commerce Industry Knowledge Base

import { IndustryKnowledge, MetricPattern, RelationshipTemplate, ContextQuestion } from './types';

export const retailMetricPatterns: MetricPattern[] = [
  // === REQUIRED METRICS ===
  {
    id: 'retail-gmv',
    columnPatterns: ['gmv', 'gross.*merchandise', 'total.*sales', 'revenue', 'sales.*amount'],
    suggestedMetricName: 'Gross Merchandise Value (GMV)',
    description: 'Total value of merchandise sold through the platform',
    suggestedAggregation: 'sum',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'GMV is the primary measure of sales performance' },
      'accelerate-growth': { impact: 'high', reasoning: 'GMV growth rate shows business momentum' },
      'expand-market-share': { impact: 'high', reasoning: 'GMV relative to TAM shows market position' }
    },
    benchmark: { value: '20-30%', percentile: 'YoY growth for e-commerce', source: 'eMarketer', year: 2024 },
    relatedMetrics: ['retail-aov', 'retail-conversion', 'retail-orders']
  },
  {
    id: 'retail-conversion',
    columnPatterns: ['conversion', 'convert.*rate', 'purchase.*rate', 'checkout.*rate'],
    suggestedMetricName: 'Conversion Rate',
    description: 'Percentage of visitors who complete a purchase',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'leading',
    unit: '%',
    formula: 'Orders / Sessions × 100',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'Higher conversion directly increases revenue' },
      'accelerate-growth': { impact: 'high', reasoning: 'Conversion optimization is the fastest growth lever' },
      'improve-efficiency': { impact: 'medium', reasoning: 'Better conversion reduces CAC' }
    },
    benchmark: { value: '2.5-3.5%', percentile: 'Average e-commerce conversion', source: 'Shopify', year: 2024 },
    relatedMetrics: ['retail-cart-abandon', 'retail-traffic', 'retail-gmv']
  },
  {
    id: 'retail-aov',
    columnPatterns: ['aov', 'average.*order', 'order.*value', 'basket.*size', 'cart.*value'],
    suggestedMetricName: 'Average Order Value (AOV)',
    description: 'Average revenue per order',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '$',
    formula: 'Total Revenue / Number of Orders',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'Higher AOV increases revenue without more traffic' },
      'improve-margins': { impact: 'high', reasoning: 'Larger orders often have better margin economics' },
      'reduce-costs': { impact: 'medium', reasoning: 'Higher AOV reduces per-order shipping/handling costs' }
    },
    benchmark: { value: '$80-120', percentile: 'E-commerce average', source: 'Statista', year: 2024 },
    relatedMetrics: ['retail-gmv', 'retail-units-per-order', 'retail-cross-sell']
  },
  {
    id: 'retail-cart-abandon',
    columnPatterns: ['abandon', 'cart.*drop', 'checkout.*exit', 'cart.*rate'],
    suggestedMetricName: 'Cart Abandonment Rate',
    description: 'Percentage of shopping carts that don\'t complete checkout',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'leading',
    unit: '%',
    formula: '(Carts Created - Orders) / Carts Created × 100',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'Reducing abandonment recaptures lost revenue' },
      'improve-customer-satisfaction': { impact: 'medium', reasoning: 'High abandonment signals UX friction' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Lower abandonment improves conversion funnel' }
    },
    benchmark: { value: '<70%', percentile: 'Average is 70%, best-in-class <60%', source: 'Baymard Institute', year: 2024 },
    relatedMetrics: ['retail-conversion', 'retail-checkout-time']
  },

  // === RECOMMENDED METRICS ===
  {
    id: 'retail-cac',
    columnPatterns: ['cac', 'acquisition.*cost', 'customer.*acquisition', 'cpac'],
    suggestedMetricName: 'Customer Acquisition Cost (CAC)',
    description: 'Cost to acquire a new customer',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    formula: 'Marketing Spend / New Customers',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'CAC is often the largest variable cost' },
      'improve-margins': { impact: 'high', reasoning: 'Lower CAC improves unit economics' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Efficient CAC enables faster scaling' }
    },
    benchmark: { value: '<$45', percentile: 'E-commerce average', source: 'Shopify', year: 2024 },
    relatedMetrics: ['retail-cltv', 'retail-roas', 'retail-ltv-cac']
  },
  {
    id: 'retail-repeat-purchase',
    columnPatterns: ['repeat', 'return.*customer', 'repurchase', 'retention.*rate'],
    suggestedMetricName: 'Repeat Purchase Rate',
    description: 'Percentage of customers who make a second purchase',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'reduce-churn': { impact: 'high', reasoning: 'Repeat purchase rate is the inverse of churn' },
      'increase-revenue': { impact: 'high', reasoning: 'Repeat customers drive 40% of revenue' },
      'improve-margins': { impact: 'high', reasoning: 'Repeat customers cost less to acquire' }
    },
    benchmark: { value: '>27%', percentile: 'E-commerce average', source: 'Smile.io', year: 2024 },
    relatedMetrics: ['retail-cltv', 'retail-nps', 'retail-purchase-frequency']
  },
  {
    id: 'retail-inventory-turnover',
    columnPatterns: ['turnover', 'inventory.*turn', 'stock.*turn', 'sell.*through'],
    suggestedMetricName: 'Inventory Turnover',
    description: 'How many times inventory is sold and replaced over a period',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'coincident',
    formula: 'Cost of Goods Sold / Average Inventory',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: 'Faster turnover reduces holding costs' },
      'optimize-operations': { impact: 'high', reasoning: 'Turnover shows inventory management efficiency' },
      'reduce-costs': { impact: 'medium', reasoning: 'Lower inventory reduces storage and capital costs' }
    },
    benchmark: { value: '4-6x', percentile: 'Annual turnover for retail', source: 'NRF', year: 2024 },
    relatedMetrics: ['retail-fill-rate', 'retail-stockout', 'retail-days-inventory']
  },
  {
    id: 'retail-return-rate',
    columnPatterns: ['return', 'refund', 'rma', 'exchange.*rate'],
    suggestedMetricName: 'Return Rate',
    description: 'Percentage of orders that are returned',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: 'Returns significantly erode margins' },
      'reduce-costs': { impact: 'high', reasoning: 'Return processing is expensive' },
      'improve-customer-satisfaction': { impact: 'medium', reasoning: 'High returns may indicate product issues' }
    },
    benchmark: { value: '<20%', percentile: 'E-commerce average (apparel higher)', source: 'NRF', year: 2024 },
    relatedMetrics: ['retail-nps', 'retail-product-quality']
  },
  {
    id: 'retail-cltv',
    columnPatterns: ['cltv', 'clv', 'ltv', 'lifetime.*value', 'customer.*value'],
    suggestedMetricName: 'Customer Lifetime Value (CLTV)',
    description: 'Predicted total revenue from a customer relationship',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '$',
    formula: 'AOV × Purchase Frequency × Customer Lifespan',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'CLTV shows total customer revenue potential' },
      'reduce-churn': { impact: 'high', reasoning: 'Higher retention increases CLTV' },
      'improve-margins': { impact: 'medium', reasoning: 'High CLTV justifies higher acquisition spend' }
    },
    benchmark: { value: '>3x CAC', percentile: 'Healthy ratio', source: 'HubSpot', year: 2024 },
    relatedMetrics: ['retail-cac', 'retail-repeat-purchase', 'retail-aov']
  },
  {
    id: 'retail-nps',
    columnPatterns: ['nps', 'net.*promoter', 'csat', 'satisfaction'],
    suggestedMetricName: 'Net Promoter Score (NPS)',
    description: 'Customer loyalty and satisfaction score',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'leading',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'NPS directly measures satisfaction' },
      'reduce-churn': { impact: 'high', reasoning: 'Detractors are more likely to churn' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Promoters drive word-of-mouth growth' }
    },
    benchmark: { value: '>40', percentile: 'Good for retail', source: 'Bain & Company', year: 2024 },
    relatedMetrics: ['retail-repeat-purchase', 'retail-return-rate']
  },
  {
    id: 'retail-fill-rate',
    columnPatterns: ['fill.*rate', 'in.*stock', 'availability'],
    suggestedMetricName: 'Order Fill Rate',
    description: 'Percentage of orders fulfilled completely from available stock',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'optimize-operations': { impact: 'high', reasoning: 'Fill rate shows inventory management success' },
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Customers expect orders fulfilled completely' },
      'increase-revenue': { impact: 'medium', reasoning: 'Low fill rate means lost sales' }
    },
    benchmark: { value: '>95%', percentile: 'Target for retail', source: 'Supply Chain Digest', year: 2024 },
    relatedMetrics: ['retail-inventory-turnover', 'retail-stockout']
  },

  // === OPTIONAL METRICS ===
  {
    id: 'retail-traffic',
    columnPatterns: ['traffic', 'visitor', 'session', 'unique.*visit'],
    suggestedMetricName: 'Website Traffic',
    description: 'Number of visits/sessions to the online store',
    suggestedAggregation: 'sum',
    classification: 'optional',
    indicatorType: 'leading',
    relevanceByGoal: {
      'accelerate-growth': { impact: 'high', reasoning: 'Traffic is the top of the conversion funnel' },
      'expand-market-share': { impact: 'medium', reasoning: 'Traffic indicates brand awareness' }
    },
    relatedMetrics: ['retail-conversion', 'retail-bounce-rate']
  },
  {
    id: 'retail-roas',
    columnPatterns: ['roas', 'return.*ad', 'ad.*return', 'advertising.*roi'],
    suggestedMetricName: 'Return on Ad Spend (ROAS)',
    description: 'Revenue generated per dollar of advertising spend',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    formula: 'Revenue from Ads / Ad Spend',
    relevanceByGoal: {
      'improve-margins': { impact: 'high', reasoning: 'ROAS measures advertising efficiency' },
      'reduce-costs': { impact: 'high', reasoning: 'Higher ROAS means lower effective CAC' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Good ROAS enables scaling ad spend' }
    },
    benchmark: { value: '>4:1', percentile: 'Good ROAS for e-commerce', source: 'Google', year: 2024 },
    relatedMetrics: ['retail-cac', 'retail-gmv']
  },
  {
    id: 'retail-stockout',
    columnPatterns: ['stockout', 'out.*stock', 'oos'],
    suggestedMetricName: 'Stockout Rate',
    description: 'Percentage of SKUs that are out of stock',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'leading',
    unit: '%',
    relevanceByGoal: {
      'increase-revenue': { impact: 'high', reasoning: 'Stockouts directly cause lost sales' },
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Stockouts frustrate customers' },
      'optimize-operations': { impact: 'medium', reasoning: 'Stockouts indicate planning issues' }
    },
    benchmark: { value: '<5%', percentile: 'Target for retail', source: 'IHL Group', year: 2024 },
    relatedMetrics: ['retail-fill-rate', 'retail-inventory-turnover']
  },
  {
    id: 'retail-purchase-frequency',
    columnPatterns: ['frequency', 'orders.*per', 'purchase.*per'],
    suggestedMetricName: 'Purchase Frequency',
    description: 'Average number of purchases per customer per year',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    relevanceByGoal: {
      'increase-revenue': { impact: 'medium', reasoning: 'Higher frequency increases customer revenue' },
      'reduce-churn': { impact: 'medium', reasoning: 'More frequent buyers are more loyal' }
    },
    relatedMetrics: ['retail-repeat-purchase', 'retail-cltv']
  },
  {
    id: 'retail-units-per-order',
    columnPatterns: ['units.*order', 'items.*order', 'basket.*items'],
    suggestedMetricName: 'Units Per Order',
    description: 'Average number of items per order',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    relevanceByGoal: {
      'increase-revenue': { impact: 'medium', reasoning: 'More units increases AOV' },
      'improve-margins': { impact: 'medium', reasoning: 'Multi-item orders spread shipping costs' }
    },
    relatedMetrics: ['retail-aov', 'retail-cross-sell']
  },
  {
    id: 'retail-cross-sell',
    columnPatterns: ['cross.*sell', 'upsell', 'attach.*rate'],
    suggestedMetricName: 'Cross-Sell Rate',
    description: 'Percentage of orders that include cross-sold items',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'increase-revenue': { impact: 'medium', reasoning: 'Cross-sell increases AOV' },
      'improve-margins': { impact: 'medium', reasoning: 'Incremental sales at low marginal cost' }
    },
    relatedMetrics: ['retail-aov', 'retail-units-per-order']
  }
];

export const retailRelationshipTemplates: RelationshipTemplate[] = [
  {
    id: 'retail-rel-1',
    sourceMetricPattern: 'retail-cart-abandon',
    targetMetricPattern: 'retail-conversion',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'Cart abandonment and conversion are inversely correlated. Every 1% reduction in abandonment typically improves conversion by 0.2-0.3%.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'retail-rel-2',
    sourceMetricPattern: 'retail-nps',
    targetMetricPattern: 'retail-repeat-purchase',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 60 },
    confidence: 'high',
    reasoning: 'High NPS customers are 4-6x more likely to repurchase within 60-90 days.',
    evidenceSource: 'research'
  },
  {
    id: 'retail-rel-3',
    sourceMetricPattern: 'retail-inventory-turnover',
    targetMetricPattern: 'retail-fill-rate',
    relationshipType: 'correlates',
    confidence: 'medium',
    reasoning: 'Healthy inventory turnover correlates with better fill rates, though over-rotation can cause stockouts.',
    evidenceSource: 'best-practice'
  },
  {
    id: 'retail-rel-4',
    sourceMetricPattern: 'retail-traffic',
    targetMetricPattern: 'retail-gmv',
    relationshipType: 'leads',
    typicalLagDays: { min: 0, max: 7, typical: 1 },
    confidence: 'high',
    reasoning: 'Traffic increases translate to GMV almost immediately through the conversion funnel.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'retail-rel-5',
    sourceMetricPattern: 'retail-stockout',
    targetMetricPattern: 'retail-gmv',
    relationshipType: 'leads',
    typicalLagDays: { min: 0, max: 7, typical: 3 },
    confidence: 'high',
    reasoning: 'Stockouts immediately impact GMV. Each 1% stockout rate can reduce sales by 2-4%.',
    evidenceSource: 'research'
  },
  {
    id: 'retail-rel-6',
    sourceMetricPattern: 'retail-return-rate',
    targetMetricPattern: 'retail-repeat-purchase',
    relationshipType: 'leads',
    typicalLagDays: { min: 30, max: 90, typical: 60 },
    confidence: 'medium',
    reasoning: 'High return rates can negatively impact repeat purchase if return experience is poor, or positively if handled well.',
    evidenceSource: 'research'
  },
  {
    id: 'retail-rel-7',
    sourceMetricPattern: 'retail-roas',
    targetMetricPattern: 'retail-cac',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'ROAS and CAC are inversely correlated. Higher ROAS means lower effective acquisition costs.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'retail-rel-8',
    sourceMetricPattern: 'retail-repeat-purchase',
    targetMetricPattern: 'retail-cltv',
    relationshipType: 'leads',
    typicalLagDays: { min: 90, max: 180, typical: 120 },
    confidence: 'high',
    reasoning: 'Repeat purchase rate directly drives CLTV as the multiplier on average purchase value.',
    evidenceSource: 'industry-standard'
  }
];

export const retailContextQuestions: ContextQuestion[] = [
  {
    id: 'retail-channel',
    question: 'What is your primary sales channel?',
    options: [
      { value: 'online-only', label: 'Online only' },
      { value: 'omnichannel', label: 'Omnichannel (online + stores)' },
      { value: 'marketplace', label: 'Marketplace (Amazon, etc.)' },
      { value: 'wholesale', label: 'Wholesale/B2B' }
    ],
    impactOnSuggestions: 'Channel affects which traffic and fulfillment metrics matter'
  },
  {
    id: 'retail-category',
    question: 'What is your primary product category?',
    options: [
      { value: 'apparel', label: 'Apparel & Fashion' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'home', label: 'Home & Garden' },
      { value: 'consumables', label: 'Consumables/CPG' },
      { value: 'general', label: 'General Merchandise' }
    ],
    impactOnSuggestions: 'Category affects return rates, purchase frequency, and AOV benchmarks'
  },
  {
    id: 'retail-fulfillment',
    question: 'How do you fulfill orders?',
    options: [
      { value: 'own-warehouse', label: 'Own warehouse/3PL' },
      { value: 'dropship', label: 'Dropshipping' },
      { value: 'store-ship', label: 'Ship from store' },
      { value: 'mixed', label: 'Mixed fulfillment' }
    ],
    impactOnSuggestions: 'Fulfillment model affects inventory and operations metrics'
  }
];

export const retailKnowledge: IndustryKnowledge = {
  id: 'retail',
  displayName: 'Retail / E-commerce',
  description: 'Online and omnichannel retail businesses',
  icon: 'ShoppingCart',
  
  businessModels: [
    {
      id: 'online',
      label: 'Online Only',
      description: 'Pure-play e-commerce',
      priorityMetrics: ['retail-gmv', 'retail-conversion', 'retail-aov', 'retail-cart-abandon', 'retail-cac']
    },
    {
      id: 'omnichannel',
      label: 'Omnichannel',
      description: 'Online and physical retail',
      priorityMetrics: ['retail-gmv', 'retail-conversion', 'retail-fill-rate', 'retail-inventory-turnover', 'retail-nps']
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      description: 'Third-party marketplace seller',
      priorityMetrics: ['retail-gmv', 'retail-aov', 'retail-return-rate', 'retail-inventory-turnover']
    },
    {
      id: 'd2c',
      label: 'Direct-to-Consumer',
      description: 'Brand selling direct to consumers',
      priorityMetrics: ['retail-gmv', 'retail-cltv', 'retail-repeat-purchase', 'retail-cac', 'retail-nps']
    },
    {
      id: 'b2b-wholesale',
      label: 'B2B Wholesale',
      description: 'Business-to-business retail',
      priorityMetrics: ['retail-gmv', 'retail-aov', 'retail-repeat-purchase', 'retail-fill-rate']
    }
  ],

  metricPatterns: retailMetricPatterns,
  relationshipTemplates: retailRelationshipTemplates,
  contextQuestions: retailContextQuestions,

  northStarRecommendations: {
    'increase-revenue': {
      metricId: 'retail-gmv',
      reasoning: 'GMV directly measures total sales performance'
    },
    'reduce-churn': {
      metricId: 'retail-repeat-purchase',
      reasoning: 'Repeat purchase rate is the primary retention metric for retail'
    },
    'accelerate-growth': {
      metricId: 'retail-conversion',
      reasoning: 'Conversion rate is the fastest lever for e-commerce growth'
    },
    'improve-margins': {
      metricId: 'retail-cltv',
      reasoning: 'CLTV improvement reduces dependency on expensive acquisition'
    },
    'optimize-operations': {
      metricId: 'retail-inventory-turnover',
      reasoning: 'Inventory turnover shows operational efficiency'
    },
    'improve-customer-satisfaction': {
      metricId: 'retail-nps',
      reasoning: 'NPS directly measures customer satisfaction and loyalty'
    }
  }
};
