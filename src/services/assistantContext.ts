import type { MetricDefinition } from "@/types/metric";
import type { Agent, TrackedRecommendation } from "@/types/agent";
import type { Specialist } from "@/types/specialist";
import type { AgentFinding, ConflictReport } from "@/types/assistant";
import { detectAgentConflicts, generateConflictNarrative } from "./conflictDetection";

export interface AssistantContext {
  metricsCount: number;
  activeAgents: number;
  pendingRecommendations: number;
  criticalAnomalies: number;
  recentInsights: string[];
  // Full followed metrics snapshot for AI context
  followedMetrics?: {
    id: string;
    name: string;
    domain: string;
    value: string;
    changePercent: number;
    changeAbsolute: string;
    status: string;
    direction: string;
  }[];
  // Specific metric being discussed (from "Open in Assistant")
  focusMetric?: {
    metricId: string;
    name: string;
    currentValue: string;
    changePercent: number;
    changeAbsolute: string;
    status: string;
    domain?: string;
  };
  mentionedMetrics?: {
    name: string;
    value: string;
    status: string;
    trend: string;
  }[];
  mentionedAgents?: {
    name: string;
    status: string;
    lastRun: string;
  }[];
  mentionedSpecialists?: {
    name: string;
    domain: string;
    status: string;
    description: string;
    monitoringScope: {
      dataSources: string[];
      refreshRate: string;
      metrics: string[];
      dimensions?: string[];
    };
    monitoringRules: {
      name: string;
      whenCondition: string;
      whenValue: number;
      whenUnit?: string;
      severity: string;
      enabled: boolean;
    }[];
    performance: {
      insightsGenerated: number;
      actionsRecommended: number;
      actionsApproved: number;
      approvalRate: number;
      valueDelivered: number;
    };
    businessView?: string;
    configuredMetrics?: string[];
    configuredDrivers?: string[];
    // Latest run data (insights, recommendations, etc.)
    runData?: {
      executiveSummary?: {
        headline: string;
        severity: string;
        valueAtStake: number;
        currency: string;
        keyFinding: string;
      };
      insights?: {
        headline: string;
        type: string;
        severity: string;
        description?: string;
        confidence: number;
      }[];
      recommendations?: {
        title: string;
        description: string;
        impactType?: string;
        impactValue?: number;
        effort?: string;
      }[];
      rootCauses?: {
        rank: number;
        cause: string;
        contributionPct: number;
        confidence: number;
      }[];
      aiSummary?: string;
    };
  }[];
  // Enhanced cross-agent synthesis
  agentFindings?: AgentFinding[];
  conflictingRecommendations?: ConflictReport[];
  crossAgentNarrative?: string;
}

// Extract @mentions from message content using greedy matching against known names
export function extractMentions(
  content: string,
  knownNames?: string[]
): { metrics: string[]; agents: string[]; specialists: string[] } {
  if (!knownNames || knownNames.length === 0) {
    // Fallback: simple regex extraction
    const mentionRegex = /@([\w\s]+?)(?=\s{2,}|$|@|\.|,|!|\?|\n)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1].trim().toLowerCase());
    }
    return { metrics: mentions, agents: mentions, specialists: mentions };
  }

  // Greedy matching: sort known names longest-first, then scan for @name patterns
  const sorted = [...knownNames].sort((a, b) => b.length - a.length);
  const found: string[] = [];
  const lower = content.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < lower.length) {
    const atIdx = lower.indexOf('@', searchFrom);
    if (atIdx === -1) break;

    const afterAt = lower.slice(atIdx + 1);
    let matched = false;

    for (const name of sorted) {
      const nameLower = name.toLowerCase();
      if (afterAt.startsWith(nameLower)) {
        const charAfter = afterAt[nameLower.length];
        if (charAfter === undefined || /[\s@.,!?;:\n]/.test(charAfter)) {
          found.push(nameLower);
          searchFrom = atIdx + 1 + nameLower.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      searchFrom = atIdx + 1;
    }
  }

  return { metrics: found, agents: found, specialists: found };
}

/**
 * Extract findings from agents and their recommendations
 */
function extractAgentFindings(
  agents: Agent[],
  recommendations: TrackedRecommendation[]
): AgentFinding[] {
  const findings: AgentFinding[] = [];

  // Extract findings from active agents
  agents
    .filter((a) => a.status === "active" || a.status === "running")
    .forEach((agent) => {
      // Add recommendations as findings
      const agentRecs = recommendations.filter((r) => r.agentId === agent.id);
      agentRecs.forEach((rec) => {
        findings.push({
          agentId: agent.id,
          agentName: agent.name,
          findingType: 'recommendation',
          summary: rec.title,
          confidence: rec.priority === 'high' ? 0.85 : rec.priority === 'medium' ? 0.65 : 0.45,
          relatedMetrics: agent.monitoredMetrics?.map((m) => m.metricId) || [],
          timestamp: rec.statusUpdatedAt,
        });
      });

      // If agent has analysis summary, extract key findings
      // This would be enhanced when AnalysisSummary is available
    });

  return findings;
}

/**
 * Build a unified narrative from cross-agent findings
 */
function buildCrossAgentNarrative(
  agents: Agent[],
  recommendations: TrackedRecommendation[],
  conflicts: ConflictReport[]
): string {
  const activeAgents = agents.filter(
    (a) => a.status === "active" || a.status === "running"
  );

  if (activeAgents.length === 0) {
    return "No active agents with findings at this time.";
  }

  const narrativeParts: string[] = [];

  // Summarize agent activity
  const agentSummaries = activeAgents.map((agent) => {
    const agentRecs = recommendations.filter((r) => r.agentId === agent.id);
    const pending = agentRecs.filter((r) => r.status === "proposed").length;
    const implemented = agentRecs.filter((r) => r.status === "implemented" || r.status === "measured").length;
    const trustLevel = agent.trustScore
      ? agent.trustScore >= 80
        ? "autonomous"
        : agent.trustScore >= 50
          ? "supervised"
          : "read-only"
      : "supervised";

    return `• ${agent.name} (${trustLevel}): ${pending} pending, ${implemented} implemented`;
  });

  narrativeParts.push("Active Agent Summary:\n" + agentSummaries.join("\n"));

  // Add conflict warnings
  const conflictNarrative = generateConflictNarrative(conflicts);
  if (conflictNarrative) {
    narrativeParts.push("\nConflict Alerts:\n" + conflictNarrative);
  }

  // Top recommendations across agents
  const topRecs = recommendations
    .filter((r) => r.status === "proposed" && r.priority === "high")
    .slice(0, 3)
    .map((r) => `• [${r.agentName}] ${r.title}`);

  if (topRecs.length > 0) {
    narrativeParts.push("\nTop Priority Recommendations:\n" + topRecs.join("\n"));
  }

  return narrativeParts.join("\n");
}

// Build context for the LLM from current application state
export function buildAssistantContext(
  metrics: MetricDefinition[],
  agents: Agent[],
  recommendations: TrackedRecommendation[],
  messageContent?: string,
  focusMetric?: AssistantContext['focusMetric'],
  specialists?: Specialist[]
): AssistantContext {
  // Count active agents (not paused/draft)
  const activeAgents = agents.filter(
    (a) => a.status === "active" || a.status === "running" || a.status === "needs-input"
  ).length;

  // Count pending recommendations
  const pendingRecommendations = recommendations.filter(
    (r) => r.status === "proposed" || r.status === "approved"
  ).length;

  // Count critical anomalies (simulated - could connect to AnomalyContext)
  const criticalAnomalies = agents.filter(
    (a) => a.status === "running" && a.isMonitoring
  ).length > 0 ? 1 : 0;

  // Gather recent insights from metrics
  const recentInsights = metrics
    .filter((m) => m.isFollowing && m.displayData?.insight)
    .slice(0, 5)
    .map((m) => m.displayData.insight.text);

  // Detect conflicts
  const conflicts = detectAgentConflicts(agents, recommendations);

  // Extract agent findings
  const agentFindings = extractAgentFindings(agents, recommendations);

  // Build cross-agent narrative
  const crossAgentNarrative = buildCrossAgentNarrative(agents, recommendations, conflicts);

  // Build followed metrics snapshot
  const followedMetrics = metrics
    .filter((m) => m.isFollowing)
    .map((m) => ({
      id: m.id,
      name: m.name,
      domain: m.domain || 'Operational',
      value: m.displayData?.currentValue || '—',
      changePercent: m.displayData?.changePercent || 0,
      changeAbsolute: m.displayData?.changeAbsolute || '—',
      status: m.displayData?.status || 'healthy',
      direction: m.direction || 'up_is_good',
    }));

  // Build base context
  const context: AssistantContext = {
    metricsCount: metrics.length,
    activeAgents,
    pendingRecommendations,
    criticalAnomalies,
    recentInsights,
    followedMetrics: followedMetrics.length > 0 ? followedMetrics : undefined,
    focusMetric,
    agentFindings,
    conflictingRecommendations: conflicts.length > 0 ? conflicts : undefined,
    crossAgentNarrative,
  };

  // If message content provided, extract mentions and add detailed context
  if (messageContent) {
    // Build the list of all known entity names for greedy matching
    const allKnownNames = [
      ...metrics.map((m) => m.name),
      ...agents.map((a) => a.name),
      ...(specialists || []).map((s) => s.name),
    ];

    const { metrics: mentionedMetricNames, agents: mentionedAgentNames, specialists: mentionedSpecialistNames } =
      extractMentions(messageContent, allKnownNames);

    // Find mentioned metrics
    const mentionedMetrics = metrics.filter((m) =>
      mentionedMetricNames.some(
        (name) => m.name.toLowerCase().includes(name) || name.includes(m.name.toLowerCase())
      )
    );

    if (mentionedMetrics.length > 0) {
      context.mentionedMetrics = mentionedMetrics.map((m) => ({
        name: m.name,
        value: m.displayData?.currentValue || "N/A",
        status: m.displayData?.status || "unknown",
        trend: m.displayData?.changePercent
          ? `${m.displayData.changePercent > 0 ? "+" : ""}${m.displayData.changePercent}%`
          : "stable",
      }));
    }

    // Find mentioned agents
    const mentionedAgents = agents.filter((a) =>
      mentionedAgentNames.some(
        (name) => a.name.toLowerCase().includes(name) || name.includes(a.name.toLowerCase())
      )
    );

    if (mentionedAgents.length > 0) {
      context.mentionedAgents = mentionedAgents.map((a) => ({
        name: a.name,
        status: a.status,
        lastRun: a.lastRunAt || "Never",
      }));
    }

    // Find mentioned specialists
    if (specialists && specialists.length > 0) {
      const mentionedSpecs = specialists.filter((s) =>
        mentionedSpecialistNames.some(
          (name) => s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase())
        )
      );

      if (mentionedSpecs.length > 0) {
        context.mentionedSpecialists = mentionedSpecs.map((s) => ({
          name: s.name,
          domain: s.domain,
          status: s.status,
          description: s.description,
          monitoringScope: {
            dataSources: s.monitoringScope?.dataSources || [],
            refreshRate: s.monitoringScope?.refreshRate || 'unknown',
            metrics: s.monitoringScope?.metrics || [],
            dimensions: s.monitoringScope?.dimensions,
          },
          monitoringRules: (s.monitoringRules || []).filter((r) => r.enabled).map((r) => ({
            name: r.name,
            whenCondition: r.whenCondition,
            whenValue: r.whenValue,
            whenUnit: r.whenUnit,
            severity: r.severity,
            enabled: r.enabled,
          })),
          performance: {
            insightsGenerated: s.performance?.insightsGenerated || 0,
            actionsRecommended: s.performance?.actionsRecommended || 0,
            actionsApproved: s.performance?.actionsApproved || 0,
            approvalRate: s.performance?.approvalRate || 0,
            valueDelivered: s.performance?.valueDelivered || 0,
          },
          businessView: s.businessView,
          configuredMetrics: s.metrics?.map((m) => m.name),
          configuredDrivers: s.drivers?.map((d) => d.name),
        }));
      }
    }
  }

  return context;
}

// Get summary of all agent findings for cross-agent synthesis
export function getAgentSynthesisSummary(
  agents: Agent[],
  recommendations: TrackedRecommendation[]
): string {
  const activeAgentSummaries = agents
    .filter((a) => a.status === "active" || a.status === "running")
    .map((a) => {
      const agentRecs = recommendations.filter((r) => r.agentId === a.id);
      const pending = agentRecs.filter((r) => r.status === "proposed").length;
      const implemented = agentRecs.filter((r) => r.status === "measured").length;

      return `${a.name}: ${pending} pending actions, ${implemented} measured results`;
    });

  if (activeAgentSummaries.length === 0) {
    return "No active agent findings at this time.";
  }

  return activeAgentSummaries.join("\n");
}
