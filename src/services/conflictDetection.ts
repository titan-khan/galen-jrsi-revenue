import type { Agent, TrackedRecommendation } from "@/types/agent";
import type { ConflictReport } from "@/types/assistant";

/**
 * Detects conflicts between agent recommendations and metric coverage
 */
export function detectAgentConflicts(
  agents: Agent[],
  recommendations: TrackedRecommendation[]
): ConflictReport[] {
  const conflicts: ConflictReport[] = [];
  
  // Group recommendations by agent
  const recsByAgent = new Map<string, TrackedRecommendation[]>();
  recommendations.forEach((rec) => {
    const existing = recsByAgent.get(rec.agentId) || [];
    recsByAgent.set(rec.agentId, [...existing, rec]);
  });

  // Check for metric overlap between agents
  const metricCoverage = new Map<string, string[]>();
  agents.forEach((agent) => {
    agent.monitoredMetrics?.forEach((mc) => {
      const agentsList = metricCoverage.get(mc.metricId) || [];
      if (!agentsList.includes(agent.name)) {
        metricCoverage.set(mc.metricId, [...agentsList, agent.name]);
      }
    });
  });

  // Report metric overlaps (more than one agent on same metric)
  metricCoverage.forEach((agentNames, metricId) => {
    if (agentNames.length > 1) {
      conflicts.push({
        type: 'metric-overlap',
        agents: agentNames,
        description: `Multiple agents monitoring the same metric: ${metricId}`,
        resolution: 'Consider consolidating monitoring or defining clear ownership boundaries.',
      });
    }
  });

  // Check for conflicting recommendations between agents
  const proposedRecs = recommendations.filter(
    (r) => r.status === 'proposed' || r.status === 'approved'
  );

  // Simple conflict detection: same metric targeted with different priorities
  const recsByMetricIntent = new Map<string, TrackedRecommendation[]>();
  proposedRecs.forEach((rec) => {
    // Extract metric-related intent from title (simplified heuristic)
    const key = rec.title.toLowerCase();
    const existing = recsByMetricIntent.get(key) || [];
    recsByMetricIntent.set(key, [...existing, rec]);
  });

  // Check for priority mismatches on similar recommendations
  recsByMetricIntent.forEach((recs) => {
    if (recs.length > 1) {
      const priorities = new Set(recs.map((r) => r.priority));
      if (priorities.size > 1) {
        const agentNames = [...new Set(recs.map((r) => r.agentName))];
        if (agentNames.length > 1) {
          conflicts.push({
            type: 'priority-mismatch',
            agents: agentNames,
            description: `Agents have different priority assessments for similar recommendations`,
            resolution: 'Review and align priority based on business impact.',
          });
        }
      }
    }
  });

  // Check for recommendation conflicts (e.g., increase vs decrease same metric)
  const actionIntents = proposedRecs.map((rec) => ({
    rec,
    isIncrease: /increase|raise|boost|grow|improve/i.test(rec.title),
    isDecrease: /decrease|reduce|lower|cut|minimize/i.test(rec.title),
  }));

  // Find conflicting intents on similar metrics
  for (let i = 0; i < actionIntents.length; i++) {
    for (let j = i + 1; j < actionIntents.length; j++) {
      const a = actionIntents[i];
      const b = actionIntents[j];
      
      if (a.rec.agentId !== b.rec.agentId) {
        // Check if one wants to increase and other wants to decrease similar thing
        const titlesOverlap = haveSimilarSubject(a.rec.title, b.rec.title);
        if (titlesOverlap && a.isIncrease !== b.isIncrease && (a.isIncrease || a.isDecrease) && (b.isIncrease || b.isDecrease)) {
          conflicts.push({
            type: 'recommendation-conflict',
            agents: [a.rec.agentName, b.rec.agentName],
            description: `Conflicting recommendations: "${a.rec.title}" vs "${b.rec.title}"`,
            resolution: 'Reconcile opposing recommendations before implementation.',
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Simple heuristic to check if two recommendation titles target similar subjects
 */
function haveSimilarSubject(title1: string, title2: string): boolean {
  const keywords1 = extractKeywords(title1);
  const keywords2 = extractKeywords(title2);
  
  // Check for common keywords
  const overlap = keywords1.filter((k) => keywords2.includes(k));
  return overlap.length >= 1;
}

function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'to', 'for', 'of', 'and', 'or', 'in', 'on', 'by'];
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.includes(w));
}

/**
 * Generate a narrative summary of conflicts for the Assistant
 */
export function generateConflictNarrative(conflicts: ConflictReport[]): string {
  if (conflicts.length === 0) {
    return '';
  }

  const sections: string[] = [];
  
  const metricOverlaps = conflicts.filter((c) => c.type === 'metric-overlap');
  const recConflicts = conflicts.filter((c) => c.type === 'recommendation-conflict');
  const priorityMismatches = conflicts.filter((c) => c.type === 'priority-mismatch');

  if (metricOverlaps.length > 0) {
    sections.push(`⚠️ Metric Overlap: ${metricOverlaps.length} metric(s) monitored by multiple agents`);
  }
  
  if (recConflicts.length > 0) {
    sections.push(`⚠️ Recommendation Conflicts: ${recConflicts.length} conflicting action(s) detected`);
  }
  
  if (priorityMismatches.length > 0) {
    sections.push(`⚠️ Priority Mismatches: ${priorityMismatches.length} differing priority assessment(s)`);
  }

  return sections.join('\n');
}
