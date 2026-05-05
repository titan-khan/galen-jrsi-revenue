import type { MetricDefinition } from "@/types/metric";
import type { MetricRelationship } from "@/types/metricRelationship";
import type { StrategicGoal, Industry } from "@/types/companyProfile";
import {
  logisticsTemplateConfig,
  logisticsMetrics,
  logisticsRelationships,
  getNorthStarForGoal,
} from "@/data/templates/logisticsTemplate";

export interface TemplateApplicationResult {
  success: boolean;
  northStar: {
    metric: MetricDefinition;
    reasoning: string;
  } | null;
  metricsCreated: MetricDefinition[];
  relationshipsCreated: MetricRelationship[];
  summary: {
    totalMetrics: number;
    totalRelationships: number;
    industry: string;
    goal: StrategicGoal;
  };
}

export interface ApplyTemplateOptions {
  goal: StrategicGoal;
  includeRecommended?: boolean;
  includeOptional?: boolean;
}

/**
 * Prepares the logistics template for application
 * Returns all the data needed to update contexts
 */
export const prepareLogisticsTemplate = (
  options: ApplyTemplateOptions
): TemplateApplicationResult => {
  const { goal, includeRecommended = true, includeOptional = false } = options;

  // Get North Star for the selected goal
  const northStar = getNorthStarForGoal(goal);

  // Collect metrics based on tier selections
  const metricIds = new Set<string>(logisticsTemplateConfig.requiredMetricIds);

  if (includeRecommended) {
    logisticsTemplateConfig.recommendedMetricIds.forEach((id) => metricIds.add(id));
  }

  if (includeOptional) {
    logisticsTemplateConfig.optionalMetricIds.forEach((id) => metricIds.add(id));
  }

  // Get full metric definitions and mark as following
  const metricsToCreate = logisticsMetrics
    .filter((m) => metricIds.has(m.id))
    .map((m) => ({
      ...m,
      isFollowing: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  // Filter relationships to only include those with both metrics in our set
  const relationshipsToCreate = logisticsRelationships.filter(
    (r) => metricIds.has(r.sourceMetricId) && metricIds.has(r.targetMetricId)
  );

  return {
    success: true,
    northStar,
    metricsCreated: metricsToCreate,
    relationshipsCreated: relationshipsToCreate,
    summary: {
      totalMetrics: metricsToCreate.length,
      totalRelationships: relationshipsToCreate.length,
      industry: logisticsTemplateConfig.displayName,
      goal,
    },
  };
};

/**
 * Get template configuration for an industry
 */
export const getTemplateConfig = (industry: Industry) => {
  if (industry === "logistics") {
    return logisticsTemplateConfig;
  }
  return null;
};

/**
 * Check if an industry has a template available
 */
export const hasTemplateAvailable = (industry: Industry): boolean => {
  return industry === "logistics";
};

/**
 * Get goal options with descriptions
 */
export const getGoalOptions = (): Array<{
  value: StrategicGoal;
  label: string;
  description: string;
}> => [
  {
    value: "reduce-costs",
    label: "Reduce Costs",
    description: "Focus on cost efficiency and margin improvement",
  },
  {
    value: "increase-revenue",
    label: "Increase Revenue",
    description: "Maximize revenue through capacity and throughput",
  },
  {
    value: "reduce-churn",
    label: "Improve Customer Retention",
    description: "Enhance service quality to retain customers",
  },
  {
    value: "accelerate-growth",
    label: "Accelerate Growth",
    description: "Scale operations while maintaining quality",
  },
  {
    value: "improve-efficiency",
    label: "Improve Efficiency",
    description: "Optimize asset utilization and productivity",
  },
];

/**
 * Get preview data for a goal selection
 */
export const getTemplatePreview = (goal: StrategicGoal) => {
  const northStar = getNorthStarForGoal(goal);
  const requiredMetrics = logisticsMetrics.filter((m) =>
    logisticsTemplateConfig.requiredMetricIds.includes(m.id)
  );
  const recommendedMetrics = logisticsMetrics.filter((m) =>
    logisticsTemplateConfig.recommendedMetricIds.includes(m.id)
  );

  return {
    northStar,
    requiredMetrics,
    recommendedMetrics,
    relationshipsCount: logisticsRelationships.length,
    config: logisticsTemplateConfig,
  };
};
