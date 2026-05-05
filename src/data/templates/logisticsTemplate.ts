import type { MetricDefinition } from "@/types/metric";
import type { MetricRelationship } from "@/types/metricRelationship";
import type { StrategicGoal } from "@/types/companyProfile";

export interface IndustryTemplateConfig {
  id: string;
  industry: "logistics";
  displayName: string;
  description: string;
  icon: string;

  // Goal-based North Star mapping
  northStarByGoal: Record<
    StrategicGoal,
    {
      metricId: string;
      reasoning: string;
    }
  >;

  // Tiered metrics
  requiredMetricIds: string[];
  recommendedMetricIds: string[];
  optionalMetricIds: string[];

  // Pre-configured relationships
  relationships: MetricRelationship[];

  // Full metric definitions
  metrics: MetricDefinition[];
}

// Generate realistic sparkline data with trend
const generateSparkline = (
  baseValue: number,
  trend: "up" | "down" | "stable",
  variance: number = 0.05
): Array<{ month: string; value: number }> => {
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendMultiplier = trend === "up" ? 1.02 : trend === "down" ? 0.98 : 1;
  let currentValue = baseValue * (1 - variance * 3);

  return months.map((month) => {
    currentValue = currentValue * trendMultiplier + (Math.random() - 0.5) * baseValue * variance;
    return { month, value: Math.round(currentValue * 100) / 100 };
  });
};

// Complete metric definitions for Logistics industry
export const logisticsMetrics: MetricDefinition[] = [
  {
    id: "log-otd",
    name: "On-Time Delivery Rate",
    description: "Percentage of shipments delivered within promised timeframe",
    dataSource: "TMS / Order Management",
    measure: "deliveries",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "delivery_date",
    timeGranularity: "day",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["carrier", "region", "customer_segment"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 98, label: "Industry benchmark", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Operations",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Carriers",
      currentValue: "94.2%",
      changePercent: 2.1,
      changeAbsolute: "+1.9pp",
      status: "warning",
      sparklineData: generateSparkline(94, "up"),
      insight: {
        text: "On-time delivery improved 2.1% this month, driven by optimized routing in the Northeast region",
        boldParts: ["2.1%", "Northeast region"],
      },
      targetProgress: 96,
    },
  },
  {
    id: "log-accuracy",
    name: "Order Accuracy Rate",
    description: "Percentage of orders shipped with correct items and quantities",
    dataSource: "WMS / Order Management",
    measure: "orders",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "ship_date",
    timeGranularity: "day",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["warehouse", "product_category"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 99.5, label: "Six Sigma target", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Warehouse Operations",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Warehouses",
      currentValue: "98.7%",
      changePercent: 0.3,
      changeAbsolute: "+0.3pp",
      status: "healthy",
      sparklineData: generateSparkline(98.5, "up", 0.02),
      insight: {
        text: "Order accuracy at 98.7%, maintaining top-quartile performance. Pick verification system reduced errors by 15%",
        boldParts: ["98.7%", "15%"],
      },
      targetProgress: 99,
    },
  },
  {
    id: "log-capacity",
    name: "Capacity Utilization",
    description: "Percentage of available transport/warehouse capacity being used",
    dataSource: "TMS / WMS",
    measure: "capacity",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "operation_date",
    timeGranularity: "day",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["asset_type", "location"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 85, label: "Optimal utilization", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Fleet Management",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "Fleet + Warehouses",
      currentValue: "78.4%",
      changePercent: -3.2,
      changeAbsolute: "-2.6pp",
      status: "warning",
      sparklineData: generateSparkline(80, "down"),
      insight: {
        text: "Capacity utilization dropped 3.2% due to seasonal demand fluctuation. Consider dynamic pricing to improve fill rates",
        boldParts: ["3.2%", "dynamic pricing"],
      },
      targetProgress: 92,
    },
  },
  {
    id: "log-cost-mile",
    name: "Cost Per Mile",
    description: "Total transportation cost divided by miles traveled",
    dataSource: "TMS / Finance",
    measure: "cost",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "trip_date",
    timeGranularity: "week",
    valueSentiment: "up-bad",
    filters: [],
    adjustableFilters: ["mode", "lane", "carrier"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 2.1, label: "Industry benchmark", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Finance",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "Ground Transport",
      currentValue: "$2.34",
      changePercent: -5.2,
      changeAbsolute: "-$0.13",
      status: "healthy",
      sparklineData: generateSparkline(2.4, "down"),
      insight: {
        text: "Cost per mile reduced 5.2% through fuel hedging and carrier negotiations. On track to beat Q4 target",
        boldParts: ["5.2%", "Q4 target"],
      },
      targetProgress: 89,
    },
  },
  {
    id: "log-fill-rate",
    name: "Order Fill Rate",
    description: "Percentage of customer demand fulfilled from available inventory",
    dataSource: "WMS / Inventory",
    measure: "orders",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "order_date",
    timeGranularity: "day",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["product_category", "customer_tier"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 97, label: "Customer SLA", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Inventory Management",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Products",
      currentValue: "95.8%",
      changePercent: 1.4,
      changeAbsolute: "+1.3pp",
      status: "warning",
      sparklineData: generateSparkline(95, "up"),
      insight: {
        text: "Fill rate improved to 95.8% after safety stock adjustments. 3 SKUs still causing 40% of stockouts",
        boldParts: ["95.8%", "3 SKUs", "40%"],
      },
      targetProgress: 99,
    },
  },
  {
    id: "log-dwell",
    name: "Dwell Time",
    description: "Average time vehicles spend waiting at facilities",
    dataSource: "TMS / Yard Management",
    measure: "time",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "arrival_date",
    timeGranularity: "day",
    valueSentiment: "up-bad",
    filters: [],
    adjustableFilters: ["facility", "carrier", "load_type"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 2, label: "Industry best practice", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Yard Operations",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Facilities",
      currentValue: "2.8 hrs",
      changePercent: -12.5,
      changeAbsolute: "-0.4 hrs",
      status: "warning",
      sparklineData: generateSparkline(3, "down"),
      insight: {
        text: "Dwell time reduced 12.5% with appointment scheduling. Chicago DC still averaging 4.2 hours—priority for improvement",
        boldParts: ["12.5%", "Chicago DC", "4.2 hours"],
      },
      targetProgress: 71,
    },
  },
  {
    id: "log-damage",
    name: "Damage & Loss Rate",
    description: "Percentage of shipments with damage or loss claims",
    dataSource: "Claims / Quality",
    measure: "shipments",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "claim_date",
    timeGranularity: "week",
    valueSentiment: "up-bad",
    filters: [],
    adjustableFilters: ["carrier", "product_type", "route"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 0.5, label: "Industry benchmark", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Quality Assurance",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Shipments",
      currentValue: "0.8%",
      changePercent: -20,
      changeAbsolute: "-0.2pp",
      status: "warning",
      sparklineData: generateSparkline(0.9, "down", 0.1),
      insight: {
        text: "Damage rate down 20% after packaging redesign. Fragile goods category still 3x higher than average",
        boldParts: ["20%", "3x higher"],
      },
      targetProgress: 63,
    },
  },
  {
    id: "log-fleet-util",
    name: "Fleet Utilization",
    description: "Percentage of fleet actively deployed vs available",
    dataSource: "Fleet Management",
    measure: "vehicles",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "operation_date",
    timeGranularity: "day",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["vehicle_type", "region"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 90, label: "Optimal fleet usage", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Fleet Management",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "Owned Fleet",
      currentValue: "82.1%",
      changePercent: 4.3,
      changeAbsolute: "+3.4pp",
      status: "healthy",
      sparklineData: generateSparkline(80, "up"),
      insight: {
        text: "Fleet utilization up 4.3% through dynamic dispatching. 12 vehicles consistently under 60% utilization",
        boldParts: ["4.3%", "12 vehicles", "60%"],
      },
      targetProgress: 91,
    },
  },
  {
    id: "log-lead-time",
    name: "Order Lead Time",
    description: "Average time from order placement to delivery",
    dataSource: "Order Management",
    measure: "time",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "order_date",
    timeGranularity: "day",
    valueSentiment: "up-bad",
    filters: [],
    adjustableFilters: ["order_type", "destination_region", "priority"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 3.5, label: "Customer expectation", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Customer Service",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "Standard Orders",
      currentValue: "4.2 days",
      changePercent: -8.7,
      changeAbsolute: "-0.4 days",
      status: "warning",
      sparklineData: generateSparkline(4.5, "down"),
      insight: {
        text: "Lead time reduced 8.7% with regional inventory positioning. West Coast orders still 1.5 days slower than target",
        boldParts: ["8.7%", "West Coast", "1.5 days"],
      },
      targetProgress: 83,
    },
  },
  {
    id: "log-inventory-acc",
    name: "Inventory Accuracy",
    description: "Percentage match between system records and physical counts",
    dataSource: "WMS / Inventory",
    measure: "inventory",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "count_date",
    timeGranularity: "week",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["warehouse", "product_category"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 99, label: "Best-in-class", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Inventory Management",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Locations",
      currentValue: "97.3%",
      changePercent: 0.8,
      changeAbsolute: "+0.8pp",
      status: "healthy",
      sparklineData: generateSparkline(97, "up", 0.02),
      insight: {
        text: "Inventory accuracy at 97.3% after RFID implementation. High-velocity SKUs showing 99.1% accuracy",
        boldParts: ["97.3%", "RFID", "99.1%"],
      },
      targetProgress: 98,
    },
  },
  {
    id: "log-perfect-order",
    name: "Perfect Order Rate",
    description: "Percentage of orders delivered complete, on-time, undamaged, with accurate documentation",
    dataSource: "Order Management / Quality",
    measure: "orders",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "delivery_date",
    timeGranularity: "week",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["customer_segment", "channel"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 95, label: "SCOR benchmark", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Operations",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Channels",
      currentValue: "91.4%",
      changePercent: 2.8,
      changeAbsolute: "+2.5pp",
      status: "warning",
      sparklineData: generateSparkline(90, "up"),
      insight: {
        text: "Perfect order rate improved 2.8% to 91.4%. Documentation errors remain the top failure mode at 4.2% of orders",
        boldParts: ["2.8%", "91.4%", "4.2%"],
      },
      targetProgress: 96,
    },
  },
  {
    id: "log-warehouse-util",
    name: "Warehouse Utilization",
    description: "Percentage of warehouse capacity being used effectively",
    dataSource: "WMS",
    measure: "capacity",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "snapshot_date",
    timeGranularity: "day",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["warehouse", "zone"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 85, label: "Optimal range", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Warehouse Operations",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Warehouses",
      currentValue: "76.8%",
      changePercent: 5.1,
      changeAbsolute: "+3.7pp",
      status: "healthy",
      sparklineData: generateSparkline(74, "up"),
      insight: {
        text: "Warehouse utilization up 5.1% through slotting optimization. Dallas DC running at 92%—consider overflow strategy",
        boldParts: ["5.1%", "Dallas DC", "92%"],
      },
      targetProgress: 90,
    },
  },
  {
    id: "log-csat",
    name: "Customer Satisfaction Score",
    description: "Customer satisfaction rating for logistics services",
    dataSource: "Survey / CRM",
    measure: "score",
    aggregation: "avg",
    sparklineType: "non-cumulative",
    dateField: "survey_date",
    timeGranularity: "week",
    valueSentiment: "up-good",
    filters: [],
    adjustableFilters: ["customer_segment", "service_type"],
    insightTypes: { trend: true, comparison: true, anomaly: true },
    target: { value: 4.5, label: "Industry leader", period: "monthly" },
    category: "Logistics & Supply Chain",
    owner: "Customer Success",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFollowing: false,
    displayData: {
      filterContext: "All Customers",
      currentValue: "4.2/5",
      changePercent: 2.4,
      changeAbsolute: "+0.1",
      status: "healthy",
      sparklineData: generateSparkline(4.1, "up", 0.03),
      insight: {
        text: "CSAT improved to 4.2 after proactive delivery notifications. Enterprise segment leading at 4.6 average",
        boldParts: ["4.2", "Enterprise segment", "4.6"],
      },
      targetProgress: 93,
    },
  },
];

// Pre-configured relationships based on industry knowledge
export const logisticsRelationships: MetricRelationship[] = [
  {
    id: "rel-dwell-otd",
    sourceMetricId: "log-dwell",
    sourceMetricName: "Dwell Time",
    targetMetricId: "log-otd",
    targetMetricName: "On-Time Delivery Rate",
    relationshipType: "leads",
    lagPeriodDays: 1,
    confidenceScore: 0.85,
    reasoning: "Higher dwell times at facilities directly reduce available transit time, leading to missed delivery windows",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
  {
    id: "rel-accuracy-csat",
    sourceMetricId: "log-accuracy",
    sourceMetricName: "Order Accuracy Rate",
    targetMetricId: "log-csat",
    targetMetricName: "Customer Satisfaction Score",
    relationshipType: "leads",
    lagPeriodDays: 14,
    confidenceScore: 0.90,
    reasoning: "Order accuracy is a top driver of customer satisfaction in logistics—incorrect orders create friction and complaints",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
  {
    id: "rel-fill-otd",
    sourceMetricId: "log-fill-rate",
    sourceMetricName: "Order Fill Rate",
    targetMetricId: "log-otd",
    targetMetricName: "On-Time Delivery Rate",
    relationshipType: "leads",
    lagPeriodDays: 2,
    confidenceScore: 0.75,
    reasoning: "Low fill rates cause order holds and backorders, which delay shipments and impact on-time delivery",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
  {
    id: "rel-capacity-cost",
    sourceMetricId: "log-capacity",
    sourceMetricName: "Capacity Utilization",
    targetMetricId: "log-cost-mile",
    targetMetricName: "Cost Per Mile",
    relationshipType: "correlates",
    confidenceScore: 0.80,
    reasoning: "Higher capacity utilization spreads fixed costs across more shipments, reducing cost per mile",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
  {
    id: "rel-fleet-capacity",
    sourceMetricId: "log-fleet-util",
    sourceMetricName: "Fleet Utilization",
    targetMetricId: "log-capacity",
    targetMetricName: "Capacity Utilization",
    relationshipType: "correlates",
    confidenceScore: 0.85,
    reasoning: "Fleet and capacity utilization are closely linked—underutilized fleet means wasted transport capacity",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
  {
    id: "rel-inventory-fill",
    sourceMetricId: "log-inventory-acc",
    sourceMetricName: "Inventory Accuracy",
    targetMetricId: "log-fill-rate",
    targetMetricName: "Order Fill Rate",
    relationshipType: "leads",
    lagPeriodDays: 1,
    confidenceScore: 0.88,
    reasoning: "Accurate inventory records prevent false stockout signals and enable reliable order promising",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
  {
    id: "rel-otd-csat",
    sourceMetricId: "log-otd",
    sourceMetricName: "On-Time Delivery Rate",
    targetMetricId: "log-csat",
    targetMetricName: "Customer Satisfaction Score",
    relationshipType: "leads",
    lagPeriodDays: 14,
    confidenceScore: 0.92,
    reasoning: "On-time delivery is the #1 driver of logistics customer satisfaction per industry research",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
  {
    id: "rel-damage-csat",
    sourceMetricId: "log-damage",
    sourceMetricName: "Damage & Loss Rate",
    targetMetricId: "log-csat",
    targetMetricName: "Customer Satisfaction Score",
    relationshipType: "leads",
    lagPeriodDays: 14,
    confidenceScore: 0.78,
    reasoning: "Product damage creates poor customer experiences and erodes trust in logistics provider",
    source: "industry-pattern",
    isConfirmed: true,
    createdAt: new Date().toISOString(),
    createdBy: "ai",
  },
];

// Template configuration
export const logisticsTemplateConfig: IndustryTemplateConfig = {
  id: "logistics-template-v1",
  industry: "logistics",
  displayName: "Logistics & Supply Chain",
  description: "Complete dashboard for transportation, warehousing, and supply chain operations",
  icon: "Truck",

  northStarByGoal: {
    "reduce-costs": {
      metricId: "log-cost-mile",
      reasoning: "Cost Per Mile is the primary indicator of operational efficiency and directly impacts margins",
    },
    "increase-revenue": {
      metricId: "log-capacity",
      reasoning: "Capacity Utilization drives revenue potential—more utilized capacity means more revenue per asset",
    },
    "reduce-churn": {
      metricId: "log-otd",
      reasoning: "On-Time Delivery is the #1 driver of customer retention in logistics per industry research",
    },
    "accelerate-growth": {
      metricId: "log-perfect-order",
      reasoning: "Perfect Order Rate reflects overall operational excellence needed to support growth at scale",
    },
    "improve-efficiency": {
      metricId: "log-capacity",
      reasoning: "Capacity Utilization directly measures operational efficiency and asset productivity",
    },
    "improve-margins": {
      metricId: "log-cost-mile",
      reasoning: "Cost Per Mile directly impacts margins—reducing cost per mile improves profitability",
    },
    "optimize-operations": {
      metricId: "log-perfect-order",
      reasoning: "Perfect Order Rate is the gold standard for operational excellence in logistics",
    },
    "improve-customer-satisfaction": {
      metricId: "log-csat",
      reasoning: "Customer Satisfaction Score directly measures customer experience and service quality",
    },
    "expand-market-share": {
      metricId: "log-capacity",
      reasoning: "Capacity Utilization enables handling more volume without proportional cost increases",
    },
  },

  requiredMetricIds: ["log-otd", "log-accuracy", "log-capacity", "log-cost-mile"],
  recommendedMetricIds: ["log-fill-rate", "log-dwell", "log-damage", "log-fleet-util"],
  optionalMetricIds: ["log-lead-time", "log-inventory-acc", "log-perfect-order", "log-warehouse-util", "log-csat"],

  relationships: logisticsRelationships,
  metrics: logisticsMetrics,
};

// Helper to get metrics by tier
export const getMetricsByTier = (
  tier: "required" | "recommended" | "optional"
): MetricDefinition[] => {
  const ids =
    tier === "required"
      ? logisticsTemplateConfig.requiredMetricIds
      : tier === "recommended"
      ? logisticsTemplateConfig.recommendedMetricIds
      : logisticsTemplateConfig.optionalMetricIds;

  return logisticsMetrics.filter((m) => ids.includes(m.id));
};

// Helper to get North Star for a goal
export const getNorthStarForGoal = (
  goal: StrategicGoal
): { metric: MetricDefinition; reasoning: string } | null => {
  const config = logisticsTemplateConfig.northStarByGoal[goal];
  if (!config) return null;

  const metric = logisticsMetrics.find((m) => m.id === config.metricId);
  if (!metric) return null;

  return { metric, reasoning: config.reasoning };
};
