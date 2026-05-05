// Conversation type for persistence
export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantMessage {
  id: string;
  conversationId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  isEditing?: boolean;
}

export interface SuggestionCardData {
  id: string;
  category: string;
  title: string;
  prompt: string;
  icon: string;
}

export interface PromptCategory {
  name: string;
  prompts: {
    title: string;
    prompt: string;
  }[];
}

export interface MentionableEntity {
  id: string;
  name: string;
  type: 'metric' | 'specialist';
  domain?: string;
  description?: string;
}

// Agent Findings for Cross-Agent Synthesis
export type AgentFindingType = 'anomaly' | 'root-cause' | 'recommendation' | 'insight';

export interface AgentFinding {
  agentId: string;
  agentName: string;
  findingType: AgentFindingType;
  summary: string;
  confidence: number; // 0.0 - 1.0
  relatedMetrics: string[];
  timestamp: string;
}

// Conflict Detection Types
export type ConflictType = 'metric-overlap' | 'recommendation-conflict' | 'priority-mismatch';

export interface ConflictReport {
  type: ConflictType;
  agents: string[];
  description: string;
  resolution?: string;
}

// Enhanced Confidence Scoring
export interface ConfidenceBreakdown {
  sampleSize: 'high' | 'medium' | 'low';
  attributionStrength: 'direct' | 'strong' | 'moderate' | 'weak';
  crossMetricAlignment: 'confirmed' | 'single' | 'conflicting';
  score: number; // 0.0 - 1.0
}
