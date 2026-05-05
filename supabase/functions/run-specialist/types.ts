// =============================================================================
// Shared Type Definitions for run-specialist edge function
// =============================================================================

// ─── Query Types ────────────────────────────────────────────────────

export interface QueryContextSpec {
  table: string;
  select: string[];
  dateField?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  orderBy?: { field: string; ascending: boolean };
  limit?: number;
}

export interface QueryScope {
  time?: { start?: string; end?: string };
  filters?: Record<string, unknown>;
  limit?: number;
}

// ─── Funnel Pipeline ────────────────────────────────────────────────

export interface FunnelStageDefinition {
  id: string;
  name: string;
  volumeField: string;
  order: number;
  isLeakage?: boolean;
  parentStageId?: string;
}

export interface FunnelPipelineDefinition {
  id: string;
  name: string;
  sourceTable: string;
  timeField: string;
  dimensionField: string;
  stages: FunnelStageDefinition[];
}

// ─── Knowledge Context ──────────────────────────────────────────────

export interface ProcessChainStage {
  id: string;
  order: number;
  name: string;
  description?: string;
  slaTarget?: { value: number; unit: string };
  metrics?: string[];
  owner?: string;
}

export interface FailureModeCondition {
  metric?: string;
  operator?: string;
  value?: unknown;
  unit?: string;
  description?: string;
}

export interface FailureMode {
  name: string;
  stageId: string;
  description?: string;
  dataSignature?: {
    matchMode: 'all' | 'any' | { atLeast: number };
    conditions: FailureModeCondition[];
  };
  cascadeEffect?: string;
}

export interface InterventionEntry {
  name: string;
  actionType: string;
  effort: string;
  description: string;
  expectedImpact?: {
    type: string;
    timeToEffect?: string;
    confidence?: number;
  };
  tactics?: string[];
}

export interface ImpactModelVariable {
  source: string;
  aggregation?: string;
  period?: string;
  calculation?: string;
}

export interface ImpactModel {
  formula: string;
  variables: Record<string, ImpactModelVariable>;
  currency?: string;
  displayUnit?: string;
}

export interface BusinessContext {
  companyName?: string;
  industry?: string;
  subIndustry?: string;
  geography?: string;
  seasonality?: { notes?: string };
  currency?: string;
}

export interface DataSourceConfig {
  table: string;
  select: string[];
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  orderBy?: { field: string; ascending: boolean };
  limit?: number;
  dateField?: string;
  rollingMonths?: number;
}

export interface KnowledgeContextConfig {
  thresholdConfig?: Array<{
    metricName: string;
    green: { operator: string; value: number | [number, number] };
    yellow: { operator: string; value: number | [number, number] };
    red: { operator: string; value: number | [number, number] };
    trendTrigger?: {
      consecutivePeriods: number;
      direction: 'declining' | 'increasing';
      threshold: number;
    };
  }>;
  tables?: Array<{ table: string }>;
  funnelPipeline?: FunnelPipelineDefinition;
  processChain?: ProcessChainStage[];
  failureModeLibrary?: FailureMode[];
  interventionLibrary?: InterventionEntry[];
  investigationSequence?: {
    order: 'downstream-first' | 'upstream-first' | 'severity-first' | 'custom';
    customSequence?: string[];
    maxDepth?: number;
  };
  businessContext?: BusinessContext;
  governanceRules?: string[];
  dataSources?: DataSourceConfig[];
  dimensionPriority?: string[];
  impactModel?: ImpactModel;
  investigationTriggers?: {
    minClusterSize?: number;
  };
  clusterConfig?: {
    dimensionOverlapWeight?: number;
    dataSourceProximityWeight?: number;
    causalChainWeight?: number;
    temporalWindowWeeks?: number;
    autoClusterScore?: number;
    suggestClusterScore?: number;
    minAnomaliesForInvestigation?: number;
  };
}

// ─── Specialist Config ──────────────────────────────────────────────

export interface MonitoringRule {
  id: string;
  name: string;
  whenCondition: string;
  whenValue: number;
  whenUnit?: string;
  forScope?: string;
  severity: string;
  enabled: boolean;
}

export interface SpecialistConfig {
  monitoringScope?: {
    metrics?: string[];
    dimensions?: string[];
  };
  monitoringRules?: MonitoringRule[];
  knowledgeContext?: KnowledgeContextConfig | null;
}
