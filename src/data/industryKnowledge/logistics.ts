// Logistics & Supply Chain Industry Knowledge Base

import { IndustryKnowledge, MetricPattern, RelationshipTemplate, ContextQuestion } from './types';

export const logisticsMetricPatterns: MetricPattern[] = [
  // === REQUIRED METRICS ===
  {
    id: 'logistics-otd',
    columnPatterns: ['otd', 'on.*time.*delivery', 'delivery.*rate', 'otif'],
    suggestedMetricName: 'On-Time Delivery Rate',
    description: 'Percentage of deliveries completed within the promised timeframe',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'On-Time Deliveries / Total Deliveries × 100',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'OTD is the #1 driver of customer satisfaction' },
      'increase-revenue': { impact: 'high', reasoning: 'High OTD drives customer retention and referrals' },
      'optimize-operations': { impact: 'high', reasoning: 'OTD reflects overall operational excellence' }
    },
    benchmark: { value: '>95%', percentile: 'Target for best-in-class', source: 'APICS', year: 2024 },
    relatedMetrics: ['logistics-perfect-order', 'logistics-lead-time', 'logistics-damage']
  },
  {
    id: 'logistics-order-accuracy',
    columnPatterns: ['accuracy', 'order.*correct', 'fill.*accuracy', 'pick.*accuracy'],
    suggestedMetricName: 'Order Accuracy Rate',
    description: 'Percentage of orders delivered correctly (right items, quantities)',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Accuracy directly impacts customer experience' },
      'reduce-costs': { impact: 'high', reasoning: 'Errors drive costly returns and re-ships' },
      'optimize-operations': { impact: 'medium', reasoning: 'Accuracy reflects process quality' }
    },
    benchmark: { value: '>99%', percentile: 'Best-in-class target', source: 'Warehouse Education', year: 2024 },
    relatedMetrics: ['logistics-perfect-order', 'logistics-return-rate']
  },
  {
    id: 'logistics-capacity-util',
    columnPatterns: ['capacity.*util', 'utilization', 'load.*factor', 'fill.*rate'],
    suggestedMetricName: 'Capacity Utilization',
    description: 'Percentage of available capacity being used',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'coincident',
    unit: '%',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'high', reasoning: 'Utilization directly measures asset efficiency' },
      'improve-margins': { impact: 'high', reasoning: 'Higher utilization spreads fixed costs' },
      'reduce-costs': { impact: 'medium', reasoning: 'Optimal utilization minimizes waste' }
    },
    benchmark: { value: '75-85%', percentile: 'Optimal range (avoid over-capacity)', source: 'Gartner', year: 2024 },
    relatedMetrics: ['logistics-fleet-util', 'logistics-warehouse-util']
  },
  {
    id: 'logistics-cost-per-unit',
    columnPatterns: ['cost.*unit', 'cost.*mile', 'cost.*delivery', 'cpm', 'cpd'],
    suggestedMetricName: 'Cost Per Unit/Mile',
    description: 'Total cost to move or deliver a unit of goods',
    suggestedAggregation: 'avg',
    classification: 'required',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Direct measure of cost efficiency' },
      'improve-margins': { impact: 'high', reasoning: 'Lower cost per unit improves margins' },
      'improve-efficiency': { impact: 'medium', reasoning: 'Reflects operational productivity' }
    },
    benchmark: { value: 'Varies', percentile: 'Mode/route dependent', source: 'Industry specific', year: 2024 },
    relatedMetrics: ['logistics-capacity-util', 'logistics-fuel-cost']
  },

  // === RECOMMENDED METRICS ===
  {
    id: 'logistics-fill-rate',
    columnPatterns: ['fill.*rate', 'service.*level', 'demand.*fulfill'],
    suggestedMetricName: 'Order Fill Rate',
    description: 'Percentage of customer demand fulfilled from available inventory',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'optimize-operations': { impact: 'high', reasoning: 'Fill rate shows inventory management effectiveness' },
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'High fill rate means no stockouts' },
      'increase-revenue': { impact: 'medium', reasoning: 'Low fill rate = lost sales' }
    },
    benchmark: { value: '>95%', percentile: 'Target for retail fulfillment', source: 'APICS', year: 2024 },
    relatedMetrics: ['logistics-inventory-accuracy', 'logistics-otd']
  },
  {
    id: 'logistics-dwell-time',
    columnPatterns: ['dwell', 'wait.*time', 'detention', 'turnaround'],
    suggestedMetricName: 'Dwell Time',
    description: 'Time assets spend waiting (trucks at dock, containers at port)',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'leading',
    unit: 'hours',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'high', reasoning: 'Dwell time is pure waste in operations' },
      'reduce-costs': { impact: 'high', reasoning: 'Dwell incurs detention fees and opportunity cost' },
      'optimize-operations': { impact: 'high', reasoning: 'Minimizing dwell improves throughput' }
    },
    benchmark: { value: '<2 hours', percentile: 'Target for truck dwell', source: 'DAT', year: 2024 },
    relatedMetrics: ['logistics-otd', 'logistics-capacity-util']
  },
  {
    id: 'logistics-damage-rate',
    columnPatterns: ['damage', 'breakage', 'spoilage', 'loss.*rate'],
    suggestedMetricName: 'Damage/Loss Rate',
    description: 'Percentage of goods damaged or lost in transit',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Damage drives replacement and claims costs' },
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Damaged goods frustrate customers' },
      'improve-margins': { impact: 'medium', reasoning: 'Lower damage improves profitability' }
    },
    benchmark: { value: '<0.5%', percentile: 'Target for most goods', source: 'Insurance industry', year: 2024 },
    relatedMetrics: ['logistics-order-accuracy', 'logistics-perfect-order']
  },
  {
    id: 'logistics-fleet-util',
    columnPatterns: ['fleet.*util', 'vehicle.*util', 'truck.*util', 'asset.*util'],
    suggestedMetricName: 'Fleet Utilization',
    description: 'Percentage of fleet capacity actively generating revenue',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'coincident',
    unit: '%',
    relevanceByGoal: {
      'improve-efficiency': { impact: 'high', reasoning: 'Fleet is a major capital investment' },
      'reduce-costs': { impact: 'high', reasoning: 'Idle fleet is wasted capital' },
      'improve-margins': { impact: 'medium', reasoning: 'Better utilization improves ROA' }
    },
    benchmark: { value: '>80%', percentile: 'Target for trucking', source: 'ATA', year: 2024 },
    relatedMetrics: ['logistics-capacity-util', 'logistics-cost-per-unit']
  },
  {
    id: 'logistics-lead-time',
    columnPatterns: ['lead.*time', 'cycle.*time', 'transit.*time', 'ship.*time'],
    suggestedMetricName: 'Order Lead Time',
    description: 'Total time from order placement to delivery',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: 'days',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Faster delivery improves customer experience' },
      'accelerate-growth': { impact: 'medium', reasoning: 'Speed is a competitive advantage' },
      'optimize-operations': { impact: 'medium', reasoning: 'Lead time reflects end-to-end efficiency' }
    },
    benchmark: { value: '<3 days', percentile: 'E-commerce standard', source: 'Shopify', year: 2024 },
    relatedMetrics: ['logistics-otd', 'logistics-dwell-time']
  },
  {
    id: 'logistics-inventory-accuracy',
    columnPatterns: ['inventory.*accuracy', 'stock.*accuracy', 'ira'],
    suggestedMetricName: 'Inventory Accuracy',
    description: 'Match between physical inventory and system records',
    suggestedAggregation: 'avg',
    classification: 'recommended',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'optimize-operations': { impact: 'high', reasoning: 'Accuracy enables reliable planning' },
      'reduce-costs': { impact: 'medium', reasoning: 'Inaccuracy causes stockouts and overstock' },
      'improve-efficiency': { impact: 'medium', reasoning: 'Accurate data reduces wasted effort' }
    },
    benchmark: { value: '>99%', percentile: 'Best-in-class target', source: 'WERC', year: 2024 },
    relatedMetrics: ['logistics-fill-rate', 'logistics-order-accuracy']
  },

  // === OPTIONAL METRICS ===
  {
    id: 'logistics-perfect-order',
    columnPatterns: ['perfect.*order', 'por', 'otif.*complete'],
    suggestedMetricName: 'Perfect Order Rate',
    description: 'Orders delivered on-time, complete, undamaged, with correct documentation',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '%',
    formula: 'OTD% × Accuracy% × Complete% × Undamaged%',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Perfect order is the ultimate CX metric' },
      'optimize-operations': { impact: 'high', reasoning: 'Captures all quality dimensions' }
    },
    benchmark: { value: '>90%', percentile: 'Best-in-class target', source: 'APICS', year: 2024 },
    relatedMetrics: ['logistics-otd', 'logistics-order-accuracy', 'logistics-damage-rate']
  },
  {
    id: 'logistics-warehouse-util',
    columnPatterns: ['warehouse.*util', 'storage.*util', 'space.*util'],
    suggestedMetricName: 'Warehouse Utilization',
    description: 'Percentage of available warehouse space being used',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'coincident',
    unit: '%',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Underutilized space is wasted rent' },
      'improve-efficiency': { impact: 'medium', reasoning: 'Shows space management effectiveness' }
    },
    benchmark: { value: '80-90%', percentile: 'Optimal range', source: 'WERC', year: 2024 },
    relatedMetrics: ['logistics-capacity-util', 'logistics-inventory-accuracy']
  },
  {
    id: 'logistics-fuel-cost',
    columnPatterns: ['fuel.*cost', 'fuel.*efficiency', 'mpg', 'fuel.*per'],
    suggestedMetricName: 'Fuel Cost Per Mile',
    description: 'Fuel expense per mile traveled',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '$',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Fuel is a major variable cost' },
      'improve-margins': { impact: 'medium', reasoning: 'Fuel efficiency improves profitability' }
    },
    relatedMetrics: ['logistics-cost-per-unit', 'logistics-fleet-util']
  },
  {
    id: 'logistics-return-rate',
    columnPatterns: ['return', 'reverse.*logistics', 'rma'],
    suggestedMetricName: 'Return/Reverse Logistics Rate',
    description: 'Percentage of shipments that are returned',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'lagging',
    unit: '%',
    relevanceByGoal: {
      'reduce-costs': { impact: 'high', reasoning: 'Returns are expensive to process' },
      'improve-customer-satisfaction': { impact: 'medium', reasoning: 'High returns may indicate quality issues' }
    },
    relatedMetrics: ['logistics-order-accuracy', 'logistics-damage-rate']
  },
  {
    id: 'logistics-csat',
    columnPatterns: ['csat', 'satisfaction', 'nps', 'customer.*score'],
    suggestedMetricName: 'Customer Satisfaction Score',
    description: 'Customer satisfaction rating for logistics services',
    suggestedAggregation: 'avg',
    classification: 'optional',
    indicatorType: 'leading',
    relevanceByGoal: {
      'improve-customer-satisfaction': { impact: 'high', reasoning: 'Direct measure of customer satisfaction' },
      'reduce-churn': { impact: 'high', reasoning: 'Satisfied customers stay longer' },
      'increase-revenue': { impact: 'medium', reasoning: 'Satisfaction drives referrals' }
    },
    benchmark: { value: '>4.5/5', percentile: 'Good for logistics', source: 'Industry surveys', year: 2024 },
    relatedMetrics: ['logistics-otd', 'logistics-perfect-order']
  }
];

export const logisticsRelationshipTemplates: RelationshipTemplate[] = [
  {
    id: 'logistics-rel-1',
    sourceMetricPattern: 'logistics-capacity-util',
    targetMetricPattern: 'logistics-cost-per-unit',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'Higher capacity utilization spreads fixed costs over more units, reducing cost per unit.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'logistics-rel-2',
    sourceMetricPattern: 'logistics-dwell-time',
    targetMetricPattern: 'logistics-otd',
    relationshipType: 'leads',
    typicalLagDays: { min: 0, max: 3, typical: 1 },
    confidence: 'high',
    reasoning: 'Excessive dwell time directly delays deliveries and reduces on-time performance.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'logistics-rel-3',
    sourceMetricPattern: 'logistics-order-accuracy',
    targetMetricPattern: 'logistics-csat',
    relationshipType: 'leads',
    typicalLagDays: { min: 7, max: 21, typical: 14 },
    confidence: 'high',
    reasoning: 'Order accuracy strongly predicts customer satisfaction scores within 2-3 weeks.',
    evidenceSource: 'research'
  },
  {
    id: 'logistics-rel-4',
    sourceMetricPattern: 'logistics-inventory-accuracy',
    targetMetricPattern: 'logistics-fill-rate',
    relationshipType: 'leads',
    typicalLagDays: { min: 1, max: 7, typical: 3 },
    confidence: 'high',
    reasoning: 'Accurate inventory data enables reliable order fulfillment and prevents stockouts.',
    evidenceSource: 'best-practice'
  },
  {
    id: 'logistics-rel-5',
    sourceMetricPattern: 'logistics-fleet-util',
    targetMetricPattern: 'logistics-capacity-util',
    relationshipType: 'correlates',
    confidence: 'high',
    reasoning: 'Fleet utilization is a key component of overall capacity utilization for transport.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'logistics-rel-6',
    sourceMetricPattern: 'logistics-damage-rate',
    targetMetricPattern: 'logistics-return-rate',
    relationshipType: 'leads',
    typicalLagDays: { min: 7, max: 30, typical: 14 },
    confidence: 'high',
    reasoning: 'Damaged shipments drive returns within 1-4 weeks of delivery.',
    evidenceSource: 'industry-standard'
  },
  {
    id: 'logistics-rel-7',
    sourceMetricPattern: 'logistics-otd',
    targetMetricPattern: 'logistics-csat',
    relationshipType: 'leads',
    typicalLagDays: { min: 7, max: 21, typical: 14 },
    confidence: 'high',
    reasoning: 'On-time delivery is the #1 driver of customer satisfaction in logistics.',
    evidenceSource: 'research'
  },
  {
    id: 'logistics-rel-8',
    sourceMetricPattern: 'logistics-lead-time',
    targetMetricPattern: 'logistics-otd',
    relationshipType: 'correlates',
    confidence: 'medium',
    reasoning: 'Shorter lead times are often correlated with better on-time performance, though not always causal.',
    evidenceSource: 'best-practice'
  }
];

export const logisticsContextQuestions: ContextQuestion[] = [
  {
    id: 'logistics-mode',
    question: 'What is your primary transportation mode?',
    options: [
      { value: 'trucking', label: 'Trucking (FTL/LTL)' },
      { value: 'ocean', label: 'Ocean/Maritime' },
      { value: 'air', label: 'Air Freight' },
      { value: 'rail', label: 'Rail' },
      { value: 'multimodal', label: 'Multimodal' }
    ],
    impactOnSuggestions: 'Mode affects relevant cost and capacity metrics'
  },
  {
    id: 'logistics-service-type',
    question: 'What type of logistics service do you provide?',
    options: [
      { value: '3pl', label: '3PL (Third-Party Logistics)' },
      { value: 'last-mile', label: 'Last-Mile Delivery' },
      { value: 'freight-forward', label: 'Freight Forwarding' },
      { value: 'warehousing', label: 'Warehousing & Fulfillment' },
      { value: 'courier', label: 'Courier/Express' }
    ],
    impactOnSuggestions: 'Service type determines which fulfillment and delivery metrics apply'
  },
  {
    id: 'logistics-asset-ownership',
    question: 'Do you own your transportation assets?',
    options: [
      { value: 'asset-based', label: 'Asset-based (own fleet)' },
      { value: 'asset-light', label: 'Asset-light (contracted)' },
      { value: 'hybrid', label: 'Hybrid (both)' }
    ],
    impactOnSuggestions: 'Asset ownership affects fleet utilization and capital metrics'
  }
];

export const logisticsKnowledge: IndustryKnowledge = {
  id: 'logistics',
  displayName: 'Logistics & Supply Chain',
  description: 'Transportation, warehousing, and supply chain management',
  icon: 'Truck',
  
  businessModels: [
    {
      id: '3pl',
      label: 'Third-Party Logistics (3PL)',
      description: 'Outsourced logistics and fulfillment services',
      priorityMetrics: ['logistics-otd', 'logistics-order-accuracy', 'logistics-fill-rate', 'logistics-cost-per-unit', 'logistics-capacity-util']
    },
    {
      id: 'last-mile',
      label: 'Last-Mile Delivery',
      description: 'Final leg delivery to end consumers',
      priorityMetrics: ['logistics-otd', 'logistics-lead-time', 'logistics-csat', 'logistics-cost-per-unit', 'logistics-fleet-util']
    },
    {
      id: 'freight',
      label: 'Freight/Trucking',
      description: 'Long-haul freight transportation',
      priorityMetrics: ['logistics-capacity-util', 'logistics-fleet-util', 'logistics-cost-per-unit', 'logistics-dwell-time', 'logistics-otd']
    },
    {
      id: 'warehousing',
      label: 'Warehousing',
      description: 'Storage and distribution center operations',
      priorityMetrics: ['logistics-order-accuracy', 'logistics-fill-rate', 'logistics-inventory-accuracy', 'logistics-warehouse-util', 'logistics-perfect-order']
    },
    {
      id: 'courier',
      label: 'Courier/Express',
      description: 'Express and same-day delivery services',
      priorityMetrics: ['logistics-otd', 'logistics-lead-time', 'logistics-csat', 'logistics-damage-rate', 'logistics-cost-per-unit']
    }
  ],

  metricPatterns: logisticsMetricPatterns,
  relationshipTemplates: logisticsRelationshipTemplates,
  contextQuestions: logisticsContextQuestions,

  northStarRecommendations: {
    'improve-customer-satisfaction': {
      metricId: 'logistics-perfect-order',
      reasoning: 'Perfect order rate captures all dimensions of delivery quality'
    },
    'reduce-costs': {
      metricId: 'logistics-cost-per-unit',
      reasoning: 'Cost per unit/mile directly measures cost efficiency'
    },
    'improve-efficiency': {
      metricId: 'logistics-capacity-util',
      reasoning: 'Capacity utilization shows how well assets are deployed'
    },
    'optimize-operations': {
      metricId: 'logistics-otd',
      reasoning: 'On-time delivery reflects overall operational excellence'
    },
    'improve-margins': {
      metricId: 'logistics-fleet-util',
      reasoning: 'Fleet utilization drives profitability for asset-based logistics'
    },
    'accelerate-growth': {
      metricId: 'logistics-lead-time',
      reasoning: 'Faster lead times are a competitive advantage for growth'
    }
  }
};
