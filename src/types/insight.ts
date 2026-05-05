// Insight Panel types

export type InsightType = 'key-insight' | 'action' | 'chart';

export interface InsightItem {
  id: string;
  type: InsightType;
  title: string;
  description?: string;
  /** ID of the message that generated this insight */
  sourceMessageId: string;
  /** Raw chart config if type === 'chart' */
  chartConfig?: Record<string, unknown>;
  /** Timestamp when the insight was created/pinned */
  createdAt: string;
  /** Whether auto-detected (true) or manually pinned (false) */
  autoDetected: boolean;
}

export type ReportFormat = 'full-report' | 'executive-summary' | 'action-plan';

export type ReportStatus = 'draft' | 'complete';

export interface ReportGap {
  id: string;
  description: string;
  suggestedQuestion?: string;
}

// ─── Rich Report Content ─────────────────────────────────────────

export type ReportSectionType =
  | 'narrative'
  | 'kpi-table'
  | 'analysis'
  | 'callout'
  | 'recommendations'
  | 'methodology';

export interface ReportSection {
  id: string;
  title: string;
  type: ReportSectionType;
  /** GFM markdown content (tables, bold, lists) */
  markdown: string;
  /** Optional Vega-Lite chart spec for chart-enriched sections */
  chartSpec?: Record<string, unknown>;
  /** Heading level (1 = H1, 2 = H2 subsection) */
  level: number;
}

export interface ReportNextStep {
  action: string;
  owner: string;
  due: string;
}

export interface ReportContent {
  /** Executive one-liner summarizing the key finding */
  bottomLine: string;
  /** Ordered array of report sections */
  sections: ReportSection[];
  /** ISO timestamp when the report was generated */
  generatedAt: string;
  /** Human-readable analysis period (e.g., "Feb 11 – Feb 12, 2026") */
  analysisPeriod?: string;
  /** List of data sources used */
  dataSources: string[];
  /** Action items with owners and due dates */
  nextSteps: ReportNextStep[];
}

export type ReportGenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

// ─── Report ──────────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  conversationId: string;
  /** IDs of included insights */
  includedInsightIds: string[];
  /** Snapshot of insights at time of report generation */
  insights: InsightItem[];
  format: ReportFormat;
  status: ReportStatus;
  gaps: ReportGap[];
  createdAt: string;
  /** AI-generated structured report content */
  content?: ReportContent;
  /** Status of the AI generation process */
  generationStatus?: ReportGenerationStatus;
  /** Error message if generation failed */
  generationError?: string;
  /** Timestamp when the report was last updated */
  updatedAt?: string;
}
