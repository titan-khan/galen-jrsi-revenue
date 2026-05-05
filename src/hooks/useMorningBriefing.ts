import { useMemo } from 'react';
import { useAgents } from '@/contexts/AgentsContext';
import { useTrackedRecommendations } from '@/contexts/TrackedRecommendationsContext';

export interface BriefingItem {
  id: string;
  severity: 'critical' | 'watch' | 'win';
  title: string;
  description: string;
  agentName?: string;
  agentId?: string;
  link?: string;
}

export interface MorningBriefing {
  critical: BriefingItem[];
  watch: BriefingItem[];
  wins: BriefingItem[];
  totalAgents: number;
  activeAgents: number;
  pendingActions: number;
}

export function useMorningBriefing(): MorningBriefing {
  const { agents } = useAgents();
  const { recommendations } = useTrackedRecommendations();

  return useMemo(() => {
    const critical: BriefingItem[] = [];
    const watch: BriefingItem[] = [];
    const wins: BriefingItem[] = [];

    // Categorize recommendations by priority and status
    recommendations.forEach((rec) => {
      if (rec.status === 'proposed' || rec.status === 'approved') {
        const item: BriefingItem = {
          id: rec.id,
          severity: rec.priority === 'high' ? 'critical' : 'watch',
          title: rec.title,
          description: rec.description || '',
          agentName: rec.agentName,
          agentId: rec.agentId,
        };

        if (rec.priority === 'high') {
          critical.push(item);
        } else if (rec.priority === 'medium') {
          watch.push(item);
        }
      }

      // Implemented or measured with positive impact = win
      if (rec.status === 'measured' && rec.realizedImpact) {
        wins.push({
          id: rec.id,
          severity: 'win',
          title: rec.title,
          description: `Achieved ${rec.realizedImpact.actualValue || 'positive results'}`,
          agentName: rec.agentName,
          agentId: rec.agentId,
        });
      }
    });

    // Count active agents
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const pendingActions = recommendations.filter(
      (r) => r.status === 'proposed'
    ).length;

    return {
      critical: critical.slice(0, 3), // Limit to top 3
      watch: watch.slice(0, 5),
      wins: wins.slice(0, 3),
      totalAgents: agents.length,
      activeAgents,
      pendingActions,
    };
  }, [agents, recommendations]);
}
