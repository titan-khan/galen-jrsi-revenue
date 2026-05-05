export type AgentCategory = 'product' | 'revenue' | 'operations' | 'risk';

export type AgentStatus = 'active' | 'needs-input' | 'running' | 'paused' | 'draft';

export type TimeRange = 'last-7-days' | 'last-30-days' | 'last-quarter' | 'custom';

export type AgentPhase = 'idle' | 'planning' | 'plan-ready' | 'executing' | 'awaiting-approval' | 'analysis-approved' | 'generating-recommendations' | 'completed';

// Schedule types for continuous operation
export type ScheduleFrequency = 'continuous' | 'hourly' | 'daily' | 'weekly';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AgentSchedule {
  frequency: ScheduleFrequency;
  enabled: boolean;
  dayOfWeek?: DayOfWeek;
  hour?: number;
  minute?: number;
  timezone?: string;
  checkIntervalMinutes?: number;
}

// Run history tracking
export interface AgentRun {
  id: string;
  agentId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: 'scheduled' | 'manual' | 'anomaly-detected';
  summary?: string;
  findingsCount?: number;
  actionsExecuted?: number;
  anomaliesDetected?: number;
}

// Anomaly detection
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyType = 'spike' | 'drop' | 'trend-change' | 'threshold-breach';

export interface AnomalyAlert {
  id: string;
  agentId: string;
  metricId: string;
  metricName: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  detectedAt: string;
  value: number;
  expectedValue?: number;
  deviation?: number;
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AgentCategory;
  useCase: string;
}

export interface AgentMetricConfig {
  metricId: string;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

export interface AnalysisPlanStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration?: string;
  frameworks?: string[];
  outputs?: string[];
}

export interface AnalysisPlan {
  id: string;
  agentId: string;
  title: string;
  objectiveRestatement: string;
  scopeSummary: {
    metrics: string[];
    timeRange: string;
    dimensions?: string[];
  };
  proposedSteps: AnalysisPlanStep[];
  frameworksToApply: string[];
  expectedDeliverables: string[];
  estimatedDuration: string;
  generatedAt: string;
  status: 'draft' | 'approved' | 'modified';
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  goal?: string;
  templateId: string;
  category: AgentCategory;
  status: AgentStatus;
  monitoredMetrics?: AgentMetricConfig[];
  timeRange?: TimeRange;
  createdBy: string;
  createdAt: string;
  lastRunAt?: string;
  successRate?: number;
  actionsCount?: number;
  currentPhase?: AgentPhase;
  currentPlan?: AnalysisPlan;
  
  // Scheduling
  schedule?: AgentSchedule;
  nextRunAt?: string;
  
  // Continuous monitoring
  isMonitoring?: boolean;
  lastAnomalyCheck?: string;
  anomalyThreshold?: number;
  
  // Run tracking
  totalRuns?: number;
  consecutiveSuccesses?: number;
  
  // Trust/Autonomy progression
  trustScore?: number;
  autoApprovedActionTypes?: string[];
}

export type AnalysisStepStatus = 'complete' | 'in-progress' | 'pending';

export interface AnalysisStep {
  id: string;
  stepNumber: number;
  title: string;
  status: AnalysisStepStatus;
  content: string;
  artifacts?: AgentArtifact[];
  timestamp?: string;
}

export type ArtifactType = 'root-cause' | 'proposed-action' | 'insight' | 'chart' | 'table' | 'metric-summary' | 'simulation' | 'framework' | 'porter-five-forces' | 'swot';

export interface AgentArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  metrics?: {
    label: string;
    value: string;
  }[];
}

export interface AgentMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  steps?: AnalysisStep[];
  timestamp: string;
}

export type AnalysisCompletionStatus = 'analyzing' | 'data-gap-detected' | 'awaiting-approval' | 'needs-more' | 'analysis-approved' | 'generating-recommendations' | 'completed';

export interface AnalysisSummaryItem {
  id: string;
  stepId: string;
  title: string;
  type: 'finding' | 'action-item';
  priority: 'high' | 'medium' | 'low';
  confidence?: 'high' | 'medium' | 'low';
  description: string;
  dataSources?: string[];
}

export interface AnalysisSummary {
  keyFindings: AnalysisSummaryItem[];
  generatedAt: string;
}

export interface ActionRecommendation {
  id: string;
  stepId: string;
  relatedFindingId?: string;
  relatedFindingTitle?: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  potentialImpact?: string;
  potentialImpactNumeric?: number;
  estimatedEffort?: string;
}

export interface ActionRecommendations {
  items: ActionRecommendation[];
  generatedAt: string;
}

// ROI Tracking Types
export type RecommendationStatus = 
  | 'proposed'
  | 'approved'
  | 'in-progress'
  | 'implemented'
  | 'measured'
  | 'dismissed';

export interface RealizedImpact {
  measuredAt: string;
  measurementPeriod: { start: string; end: string };
  actualValue: string;
  actualValueNumeric?: number;
  comparedToBaseline?: string;
  confidenceLevel?: 'high' | 'medium' | 'low';
  notes?: string;
  linkedMetricIds?: string[];
}

export interface TrackedRecommendation extends ActionRecommendation {
  agentId: string;
  agentName: string;
  status: RecommendationStatus;
  statusUpdatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  implementedAt?: string;
  targetCompletionDate?: string;
  realizedImpact?: RealizedImpact;
  roiPercentage?: number;
  assignee?: string;
  externalTicketUrl?: string;
}

export interface AgentROISummary {
  agentId: string;
  totalRecommendations: number;
  implemented: number;
  dismissed: number;
  inProgress: number;
  totalPredictedValue: number;
  totalRealizedValue: number;
  overallROI: number;
  topPerformingRecommendation?: string;
  lastUpdated: string;
}

export interface DataGapProposal {
  id: string;
  type: 'metric' | 'data-source' | 'dimension';
  name: string;
  description: string;
  reason: string;
  status: 'proposed' | 'added' | 'skipped';
}
