import { BarChart3, TrendingUp, Users, Percent } from "lucide-react";

export interface SupportingMetric {
  id: string;
  name: string;
  value: string;
  previousValue: string;
  change: number;
  changeFormatted: string;
  trend: 'up' | 'down' | 'flat';
  icon: React.ElementType;
  description: string;
}

export interface NorthStarSupportingMetrics {
  [northStarId: string]: SupportingMetric[];
}

// Supporting metrics configuration - empty until real data is available
export const supportingMetricsConfig: NorthStarSupportingMetrics = {};

// Default supporting metrics shown when no specific config exists
export const defaultSupportingMetrics: SupportingMetric[] = [];

export function getSupportingMetrics(northStarId: string): SupportingMetric[] {
  return supportingMetricsConfig[northStarId] || defaultSupportingMetrics;
}
