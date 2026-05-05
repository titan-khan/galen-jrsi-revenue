export type DateRangeOption =
  | "today"
  | "yesterday"
  | "last-7-days"
  | "last-30-days"
  | "week-over-week"
  | "last-quarter"
  | "ytd"
  | "custom";

export type ComparisonPeriod =
  | "previous-period"
  | "same-period-last-year"
  | "same-period-last-quarter";

export type DashboardPreset = 'executive' | 'business-unit' | 'cfo' | 'cmo' | 'custom';

export interface DashboardComponentVisibility {
  northStar: boolean;
  impactSummary: boolean;
  miniWaterfall: boolean;
  contributingMetrics: boolean;
  growthDrivers: boolean;
  riskAlerts: boolean;
  approvalQueue: boolean;
  agentInsights: boolean;
}

export const PRESET_CONFIGS: Record<DashboardPreset, { label: string; description: string; visibility: DashboardComponentVisibility }> = {
  'executive': {
    label: 'Executive',
    description: 'High-level overview with attribution and impact',
    visibility: {
      northStar: true,
      impactSummary: true,
      miniWaterfall: true,
      contributingMetrics: true,
      growthDrivers: true,
      riskAlerts: true,
      approvalQueue: false,
      agentInsights: false,
    },
  },
  'business-unit': {
    label: 'Business Unit',
    description: 'Operational view with agent insights and approvals',
    visibility: {
      northStar: true,
      impactSummary: true,
      miniWaterfall: true,
      contributingMetrics: true,
      growthDrivers: true,
      riskAlerts: true,
      approvalQueue: true,
      agentInsights: true,
    },
  },
  'cfo': {
    label: 'CFO',
    description: 'Financial focus with ROI and risk metrics',
    visibility: {
      northStar: true,
      impactSummary: true,
      miniWaterfall: true,
      contributingMetrics: false,
      growthDrivers: false,
      riskAlerts: true,
      approvalQueue: false,
      agentInsights: false,
    },
  },
  'cmo': {
    label: 'CMO',
    description: 'Marketing focus with growth drivers and insights',
    visibility: {
      northStar: true,
      impactSummary: true,
      miniWaterfall: false,
      contributingMetrics: true,
      growthDrivers: true,
      riskAlerts: false,
      approvalQueue: false,
      agentInsights: true,
    },
  },
  'custom': {
    label: 'Custom',
    description: 'Personalized view with your preferences',
    visibility: {
      northStar: true,
      impactSummary: true,
      miniWaterfall: true,
      contributingMetrics: true,
      growthDrivers: true,
      riskAlerts: true,
      approvalQueue: true,
      agentInsights: true,
    },
  },
};

export type ActionTabType = 'risks' | 'approvals' | 'investigating';

export interface ProgressiveDisclosureState {
  contextZoneExpanded: boolean;
  activeActionTab: ActionTabType;
  expandedIntelligenceSection: string | null;
}

export const defaultDisclosureState: ProgressiveDisclosureState = {
  contextZoneExpanded: false,
  activeActionTab: 'risks',
  expandedIntelligenceSection: null,
};

export interface CommandCenterState {
  selectedKPIIds: string[];
  northStarId: string | null;
  dateRange: DateRangeOption;
  comparisonPeriod: ComparisonPeriod;
  dashboardPreset: DashboardPreset;
  customVisibility: DashboardComponentVisibility;
  disclosureState: ProgressiveDisclosureState;
}

export interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  kpiIds: string[];
  northStarId: string;
  icon: string;
}
