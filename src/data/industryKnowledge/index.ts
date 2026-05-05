// Industry Knowledge Base - Central Exports and Lookup Functions

import { Industry, BusinessModel, StrategicGoal } from '@/types/companyProfile';
import { MetricSuggestion } from '@/types/metricSuggestion';
import { 
  IndustryKnowledge, 
  MetricPattern, 
  RelationshipTemplate,
  ContextQuestion,
  Benchmark
} from './types';

// Import industry-specific knowledge
import { saasKnowledge } from './saas';
import { retailKnowledge } from './retail';
import { bfsiKnowledge } from './bfsi';
import { logisticsKnowledge } from './logistics';
import { 
  sharedMetricPatterns, 
  sharedRelationshipTemplates,
  matchColumnPattern,
  findMatchingPatterns,
  calculateGoalRelevanceScore
} from './shared';

// Re-export types
export * from './types';

// Export individual industry knowledge modules
export { saasKnowledge } from './saas';
export { retailKnowledge } from './retail';
export { bfsiKnowledge } from './bfsi';
export { logisticsKnowledge } from './logistics';
export { sharedMetricPatterns, sharedRelationshipTemplates } from './shared';

// Industry knowledge registry
const industryRegistry: Record<Industry, IndustryKnowledge | null> = {
  saas: saasKnowledge,
  retail: retailKnowledge,
  bfsi: bfsiKnowledge,
  logistics: logisticsKnowledge,
  healthcare: null, // Future implementation
  manufacturing: null, // Future implementation
  other: null
};

/**
 * Get complete industry knowledge for a specific industry
 */
export function getIndustryKnowledge(industry: Industry): IndustryKnowledge | null {
  return industryRegistry[industry] || null;
}

/**
 * Get all available industries with knowledge bases
 */
export function getAvailableIndustries(): Industry[] {
  return Object.entries(industryRegistry)
    .filter(([_, knowledge]) => knowledge !== null)
    .map(([industry]) => industry as Industry);
}

/**
 * Get metric patterns for an industry, optionally filtered by goal
 */
export function getMetricPatterns(
  industry: Industry, 
  goal?: StrategicGoal
): MetricPattern[] {
  const knowledge = industryRegistry[industry];
  if (!knowledge) {
    return sharedMetricPatterns;
  }
  
  let patterns = [...knowledge.metricPatterns, ...sharedMetricPatterns];
  
  if (goal) {
    // Sort by relevance to the goal
    patterns = patterns
      .filter(p => p.relevanceByGoal[goal])
      .sort((a, b) => {
        const aImpact = a.relevanceByGoal[goal]?.impact || 'low';
        const bImpact = b.relevanceByGoal[goal]?.impact || 'low';
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[bImpact] - impactOrder[aImpact];
      });
  }
  
  return patterns;
}

/**
 * Get relationship templates for an industry
 */
export function getRelationshipTemplates(industry: Industry): RelationshipTemplate[] {
  const knowledge = industryRegistry[industry];
  if (!knowledge) {
    return sharedRelationshipTemplates;
  }
  
  return [...knowledge.relationshipTemplates, ...sharedRelationshipTemplates];
}

/**
 * Get context questions for an industry
 */
export function getContextQuestions(industry: Industry): ContextQuestion[] {
  const knowledge = industryRegistry[industry];
  return knowledge?.contextQuestions || [];
}

/**
 * Suggest a North Star metric based on industry and goal
 */
export function suggestNorthStar(
  industry: Industry, 
  goal: StrategicGoal
): { metricId: string; reasoning: string } | null {
  const knowledge = industryRegistry[industry];
  if (!knowledge) return null;
  
  return knowledge.northStarRecommendations[goal] || null;
}

/**
 * Get benchmark data for a specific metric pattern
 */
export function getRelevantBenchmarks(
  industry: Industry, 
  metricPatternId: string
): Benchmark | null {
  const knowledge = industryRegistry[industry];
  if (!knowledge) return null;
  
  const pattern = knowledge.metricPatterns.find(p => p.id === metricPatternId);
  return pattern?.benchmark || null;
}

/**
 * Get priority metrics for a business model within an industry
 */
export function getPriorityMetrics(
  industry: Industry,
  businessModel: BusinessModel
): MetricPattern[] {
  const knowledge = industryRegistry[industry];
  if (!knowledge) return [];
  
  const modelConfig = knowledge.businessModels.find(m => m.id === businessModel);
  if (!modelConfig) return [];
  
  return modelConfig.priorityMetrics
    .map(id => knowledge.metricPatterns.find(p => p.id === id))
    .filter((p): p is MetricPattern => p !== undefined);
}

/**
 * Generate metric suggestions based on company profile and detected columns
 */
export function generateSuggestions(
  industry: Industry,
  businessModels: BusinessModel[],
  primaryGoal: StrategicGoal,
  secondaryGoals: StrategicGoal[],
  detectedColumns: string[] = []
): MetricSuggestion[] {
  const patterns = getMetricPatterns(industry);
  
  // Get priority metrics from business models
  const priorityMetricIds = new Set<string>();
  for (const model of businessModels) {
    const priorities = getPriorityMetrics(industry, model);
    priorities.forEach(p => priorityMetricIds.add(p.id));
  }
  
  // Score and sort patterns
  const scoredPatterns = patterns.map(pattern => ({
    pattern,
    score: calculateGoalRelevanceScore(pattern, primaryGoal, secondaryGoals),
    isPriority: priorityMetricIds.has(pattern.id),
    hasColumnMatch: detectedColumns.length > 0 
      ? matchColumnPattern(detectedColumns.join(' '), pattern.columnPatterns)
      : false
  }));
  
  // Sort by: priority first, then column match, then score
  scoredPatterns.sort((a, b) => {
    if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
    if (a.hasColumnMatch !== b.hasColumnMatch) return a.hasColumnMatch ? -1 : 1;
    return b.score - a.score;
  });
  
  // Convert to MetricSuggestion format
  return scoredPatterns.map((item, index): MetricSuggestion => {
    const { pattern } = item;
    
    // Build goal alignments
    const goalAlignments = Object.entries(pattern.relevanceByGoal)
      .filter(([goal]) => goal === primaryGoal || secondaryGoals.includes(goal as StrategicGoal))
      .map(([goal, relevance]) => ({
        goal: goal as StrategicGoal,
        impact: (relevance?.impact || 'low') as 'high' | 'medium' | 'low',
        relevance: relevance?.reasoning || ''
      }));
    
    // Map aggregation to compatible type
    const aggregation = pattern.suggestedAggregation === 'distinct_count' 
      ? 'count' as const 
      : pattern.suggestedAggregation === 'ratio' 
        ? 'avg' as const 
        : pattern.suggestedAggregation as 'sum' | 'avg' | 'count' | 'min' | 'max';
    
    return {
      id: `suggestion-${pattern.id}-${index}`,
      suggestedName: pattern.suggestedMetricName,
      description: pattern.description,
      sourceTable: 'detected',
      sourceColumn: pattern.columnPatterns[0] || '',
      suggestedAggregation: aggregation,
      suggestedDateColumn: 'date',
      classification: pattern.classification,
      confidence: item.isPriority || item.hasColumnMatch ? 'high' : pattern.classification === 'required' ? 'high' : 'medium',
      complexityLevel: pattern.formula ? 'moderate' : 'simple',
      indicatorType: pattern.indicatorType,
      reasoning: buildReasoning(pattern, primaryGoal, item.isPriority),
      goalAlignments,
      industryContext: `Recommended for ${industry} industry`,
      benchmark: pattern.benchmark ? {
        value: pattern.benchmark.value,
        label: pattern.benchmark.notes || pattern.benchmark.percentile,
        source: pattern.benchmark.source,
        percentile: pattern.benchmark.percentile
      } : undefined,
      isSelected: false,
      isCustomized: false
    };
  });
}

/**
 * Build reasoning text for a suggestion
 */
function buildReasoning(
  pattern: MetricPattern,
  primaryGoal: StrategicGoal,
  isPriority: boolean
): string {
  const parts: string[] = [];
  
  if (pattern.classification === 'required') {
    parts.push(`${pattern.suggestedMetricName} is a required metric for your industry.`);
  }
  
  if (isPriority) {
    parts.push(`This is a priority metric for your business model.`);
  }
  
  const goalRelevance = pattern.relevanceByGoal[primaryGoal];
  if (goalRelevance) {
    parts.push(goalRelevance.reasoning);
  }
  
  if (pattern.benchmark) {
    parts.push(`Industry benchmark: ${pattern.benchmark.value} (${pattern.benchmark.percentile}).`);
  }
  
  return parts.join(' ');
}

/**
 * Generate relationship suggestions between existing metrics
 */
export function generateRelationshipSuggestions(
  industry: Industry,
  existingMetricNames: string[]
): RelationshipTemplate[] {
  const templates = getRelationshipTemplates(industry);
  const patterns = getMetricPatterns(industry);
  
  // Find templates where both source and target might match existing metrics
  return templates.filter(template => {
    const sourcePattern = patterns.find(p => p.id === template.sourceMetricPattern);
    const targetPattern = patterns.find(p => p.id === template.targetMetricPattern);
    
    if (!sourcePattern || !targetPattern) return false;
    
    // Check if existing metrics match the patterns (fuzzy match)
    const hasSource = existingMetricNames.some(name => 
      name.toLowerCase().includes(sourcePattern.suggestedMetricName.toLowerCase().split(' ')[0].toLowerCase())
    );
    const hasTarget = existingMetricNames.some(name => 
      name.toLowerCase().includes(targetPattern.suggestedMetricName.toLowerCase().split(' ')[0].toLowerCase())
    );
    
    return hasSource && hasTarget;
  });
}

/**
 * Get all metric patterns across all industries (for discovery)
 */
export function getAllMetricPatterns(): MetricPattern[] {
  const allPatterns: MetricPattern[] = [...sharedMetricPatterns];
  
  for (const industry of getAvailableIndustries()) {
    const knowledge = industryRegistry[industry];
    if (knowledge) {
      allPatterns.push(...knowledge.metricPatterns);
    }
  }
  
  // Deduplicate by ID
  const seen = new Set<string>();
  return allPatterns.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/**
 * Find matching patterns from column names (for schema detection)
 */
export function detectMetricsFromColumns(
  columnNames: string[],
  industry?: Industry
): Array<{ column: string; pattern: MetricPattern; matchScore: number }> {
  const patterns = industry 
    ? getMetricPatterns(industry)
    : getAllMetricPatterns();
  
  return findMatchingPatterns(columnNames, patterns);
}
