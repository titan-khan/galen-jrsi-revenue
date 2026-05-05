// Metric Relationship Types

export type RelationshipType = 'leads' | 'lags' | 'correlates';
export type RelationshipSource = 'ai-detected' | 'industry-pattern' | 'user-defined' | 'data-validated';

export interface MetricRelationship {
  id: string;
  
  // Metrics involved
  sourceMetricId: string;
  sourceMetricName: string;
  targetMetricId: string;
  targetMetricName: string;
  
  // Relationship details
  relationshipType: RelationshipType;
  lagPeriodDays?: number;
  
  // Confidence & evidence
  source: RelationshipSource;
  confidenceScore?: number; // 0-1 for data-validated
  reasoning: string;
  
  // User notes (for user-defined or to add context)
  userNotes?: string;
  
  // UI state
  isConfirmed: boolean;
  
  // Metadata
  createdAt: string;
  createdBy: 'ai' | 'user';
  updatedAt?: string;
}
