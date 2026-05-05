// =============================================================================
// SKILL TYPE SYSTEM — Aligned with Anthropic's SKILL.md standard
// Supports progressive disclosure, composable pipelines, and Claude-powered execution
// =============================================================================

// --- Categories ---
export type SkillCategory = 'reporting' | 'analysis' | 'monitoring' | 'strategy';
export type SkillSourceType = 'builtin' | 'uploaded';

// --- Progressive Disclosure: Level 1 (Always in context, ~100 words) ---
export interface SkillFrontmatter {
  id: string;
  name: string;               // kebab-case, unique
  displayName: string;
  description: string;         // What it does + when to use + triggers (max 1024 chars)
  triggerPhrases: string[];    // For search/matching
  category: SkillCategory;
  icon: string;
  sourceType: SkillSourceType;

  // Structured I/O specs (for pipeline validation)
  inputSpec: SkillIOSpec[];
  outputSpec: SkillIOSpec[];

  // Metadata
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillIOSpec {
  name: string;
  type: 'string' | 'number' | 'object' | 'array' | 'boolean';
  required: boolean;
  description: string;
  fields?: string[];            // For object/array types
}

// --- Progressive Disclosure: Level 2 (Loaded when skill is triggered) ---
export interface SkillBody {
  skillId: string;
  content: string;              // Full SKILL.md markdown body
  queryContextSpec?: QueryContextSpec[];  // Declarative DB queries
  executionConfig: SkillExecutionConfig;
}

export interface QueryContextSpec {
  table: string;
  select: string[];
  filters?: QueryFilter[];
  orderBy?: { field: string; ascending: boolean };
  limit?: number;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: string | number | boolean | string[];  // Supports {{variable}} substitution
}

export interface SkillExecutionConfig {
  model: string;                // e.g., 'claude-sonnet-4-5-20250929'
  maxTokens: number;            // Default 8192
  timeoutMs: number;            // Default 120000 (2 min)
  maxRetries: number;           // Default 2
  retryDelayMs: number;         // Default 1000
  temperature?: number;         // Default 0 for analytical skills
}

// --- Progressive Disclosure: Level 3 (Loaded as needed) ---
export interface SkillResource {
  name: string;
  type: 'reference' | 'script' | 'asset';
  content: string;              // Actual content (loaded lazily)
}

// --- Skill Pipeline / Chaining ---
export interface SkillPipeline {
  id: string;
  name: string;
  description: string;
  steps: SkillPipelineStep[];
}

export interface SkillPipelineStep {
  skillId: string;
  skillName: string;
  order: number;
  passthroughMap?: Record<string, string>;  // Maps output fields → next skill's input fields
  condition?: string;            // Optional: only run if condition met (e.g., "useCase === 'nps'")
  alternatives?: string[];       // Optional: alternative skill IDs (choose one)
}

// --- Execution Types ---
export interface SkillExecutionError {
  code: string;                  // e.g., 'TIMEOUT', 'RATE_LIMIT', 'INVALID_INPUT', 'API_ERROR'
  message: string;
  retryable: boolean;
}

export interface SkillExecutionProgress {
  phase: 'preparing' | 'querying' | 'executing' | 'streaming' | 'completing';
  percentComplete: number;       // 0-100
  chunksReceived: number;
  tokensEstimate: number;
}

export interface SkillExecutionInput {
  skillId: string;
  agentId?: string;
  inputData: Record<string, unknown>;
  queryContext?: {
    timeRange?: string;
    metricIds?: string[];
  };
}

export interface SkillChainInput {
  pipelineId?: string;
  skillIds: string[];
  inputData: Record<string, unknown>;
  queryContext?: {
    timeRange?: string;
    metricIds?: string[];
  };
}

export interface SkillExecutionOutput {
  id: string;
  skillId: string;
  agentId?: string;
  outputContent: string;
  confidenceScores?: {
    metricAccuracy: number;
    attributionConfidence: number;
  };
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// --- Database Row Types (snake_case) ---
export interface SkillRow {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  icon: string;
  purpose: string;
  source_type: string;

  // Progressive disclosure columns
  trigger_phrases: string[] | null;
  input_spec: SkillIOSpec[] | null;
  output_spec: SkillIOSpec[] | null;
  skill_md_body: string | null;
  query_context_spec: QueryContextSpec[] | null;
  execution_config: Partial<SkillExecutionConfig> | null;
  pipeline_position: Record<string, unknown> | null;

  // Legacy columns (kept for backward compat)
  input_requirements: LegacySkillInputRequirement[];
  hard_rules: LegacySkillHardRule[];
  section_logic: LegacySkillSectionLogic[];
  confidence_scoring: LegacyConfidenceScoring | null;
  output_template: string;

  // Metadata
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Legacy Types (backward compatibility) ---
export interface LegacySkillInputRequirement {
  name: string;
  required: boolean;
  fields: string[];
  description: string;
}

export interface LegacySkillHardRule {
  id: string;
  category: string;
  rule: string;
}

export interface LegacySkillSectionLogic {
  section: string;
  rules: string[];
}

export interface LegacyConfidenceScoring {
  metrics: string[];
  description: string;
}

// Legacy combined type (for components not yet migrated)
export interface LegacySkillDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  icon: string;
  purpose: string;
  inputRequirements: LegacySkillInputRequirement[];
  hardRules: LegacySkillHardRule[];
  sectionLogic: LegacySkillSectionLogic[];
  confidenceScoring?: LegacyConfidenceScoring;
  outputTemplate: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Default Execution Config ---
export const DEFAULT_EXECUTION_CONFIG: SkillExecutionConfig = {
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 8192,
  timeoutMs: 120_000,
  maxRetries: 2,
  retryDelayMs: 1000,
  temperature: 0,
};

// --- Transform Functions ---

/** Transform a database row to a SkillFrontmatter (Level 1 — always loaded) */
export function transformRowToFrontmatter(row: SkillRow): SkillFrontmatter {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    triggerPhrases: row.trigger_phrases || extractTriggerPhrases(row.description),
    category: row.category as SkillCategory,
    icon: row.icon,
    sourceType: (row.source_type || 'builtin') as SkillSourceType,
    inputSpec: row.input_spec || legacyToInputSpec(row.input_requirements),
    outputSpec: row.output_spec || [],
    version: row.version,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Transform a database row to a SkillBody (Level 2 — loaded on demand) */
export function transformRowToBody(row: SkillRow): SkillBody {
  return {
    skillId: row.id,
    content: row.skill_md_body || legacyToSkillBody(row),
    queryContextSpec: row.query_context_spec || undefined,
    executionConfig: {
      ...DEFAULT_EXECUTION_CONFIG,
      ...(row.execution_config || {}),
    },
  };
}

/** Backward compat: transform row to legacy SkillDefinition */
export function transformSkillRow(row: SkillRow): LegacySkillDefinition {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    category: row.category as SkillCategory,
    icon: row.icon,
    purpose: row.purpose,
    inputRequirements: row.input_requirements,
    hardRules: row.hard_rules,
    sectionLogic: row.section_logic,
    confidenceScoring: row.confidence_scoring ?? undefined,
    outputTemplate: row.output_template,
    version: row.version,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Helper Functions ---

/** Extract trigger phrases from a description string */
function extractTriggerPhrases(description: string): string[] {
  // Extract key noun phrases as triggers
  const words = description.toLowerCase();
  const phrases: string[] = [];

  const keywords = [
    'revenue', 'nps', 'customer satisfaction', 'operational', 'executive',
    'report', 'analysis', 'monitoring', 'dashboard', 'root cause',
    'anomaly', 'trend', 'metric', 'performance', 'insight',
  ];

  for (const keyword of keywords) {
    if (words.includes(keyword)) {
      phrases.push(keyword);
    }
  }

  return phrases;
}

/** Convert legacy input_requirements to SkillIOSpec */
function legacyToInputSpec(reqs: LegacySkillInputRequirement[]): SkillIOSpec[] {
  if (!reqs) return [];
  return reqs.map((r) => ({
    name: r.name,
    type: 'object' as const,
    required: r.required,
    description: r.description,
    fields: r.fields,
  }));
}

/** Convert legacy skill fields to a SKILL.md body string */
function legacyToSkillBody(row: SkillRow): string {
  const parts: string[] = [];

  parts.push(`# ${row.display_name}\n`);

  if (row.purpose) {
    parts.push(`## Purpose\n${row.purpose}\n`);
  }

  if (row.hard_rules?.length) {
    parts.push('## Hard Rules (CONSTRAINTS)\n');
    for (const rule of row.hard_rules) {
      parts.push(`- **${rule.category.toUpperCase()}**: ${rule.rule}`);
    }
    parts.push('');
  }

  if (row.section_logic?.length) {
    parts.push('## Section Logic\n');
    for (const section of row.section_logic) {
      parts.push(`### ${section.section}`);
      for (const r of section.rules) {
        parts.push(`- ${r}`);
      }
      parts.push('');
    }
  }

  if (row.confidence_scoring) {
    parts.push(`## Confidence Scoring\n${row.confidence_scoring.description}`);
    parts.push(`Report these metrics: ${row.confidence_scoring.metrics.join(', ')}\n`);
  }

  if (row.output_template) {
    parts.push(`## Output Template\nFollow this template structure EXACTLY:\n\n${row.output_template}\n`);
  }

  return parts.join('\n');
}
