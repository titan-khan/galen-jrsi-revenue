import { useMemo } from 'react';
import { useMorningBriefing } from './useMorningBriefing';
import { useAgents } from '@/contexts/AgentsContext';
import { useMetrics } from '@/contexts/MetricsContext';
import type { SuggestionCardData } from '@/types/assistant';

export function useDynamicSuggestions(): SuggestionCardData[] {
  const briefing = useMorningBriefing();
  const { agents } = useAgents();
  const { metrics } = useMetrics();

  return useMemo(() => {
    const suggestions: SuggestionCardData[] = [];

    // If there are critical alerts, prioritize those
    if (briefing.critical.length > 0) {
      const criticalItem = briefing.critical[0];
      suggestions.push({
        id: 'critical-alert',
        icon: 'AlertTriangle',
        category: 'Resolve critical issue',
        title: criticalItem.title,
        prompt: `Tell me more about the issue: "${criticalItem.title}"`,
      });
    }

    // If there are pending actions
    if (briefing.pendingActions > 0) {
      suggestions.push({
        id: 'pending-actions',
        icon: 'CheckSquare',
        category: 'Review pending actions',
        title: `${briefing.pendingActions} awaiting approval`,
        prompt: 'What actions need my approval today?',
      });
    }

    // If there are wins to celebrate
    if (briefing.wins.length > 0) {
      suggestions.push({
        id: 'recent-wins',
        icon: 'Trophy',
        category: 'Celebrate wins',
        title: `${briefing.wins.length} positive outcomes`,
        prompt: 'Show me our recent wins and achievements',
      });
    }

    // Agent overview
    if (agents.length > 0) {
      suggestions.push({
        id: 'agent-status',
        icon: 'Bot',
        category: 'Check agent status',
        title: `${briefing.activeAgents} of ${briefing.totalAgents} active`,
        prompt: 'Give me an overview of my AI agents and their current status',
      });
    }

    // Metric health check
    if (metrics.length > 0) {
      const underperforming = metrics.filter(
        (m) => m.displayData?.changePercent !== undefined && m.displayData.changePercent < 0
      );
      if (underperforming.length > 0) {
        suggestions.push({
          id: 'metric-health',
          icon: 'TrendingDown',
          category: 'Investigate underperformance',
          title: `${underperforming.length} metrics below target`,
          prompt: 'Which metrics are underperforming and why?',
        });
      }
    }

    // Default suggestions if nothing dynamic
    if (suggestions.length === 0) {
      suggestions.push(
        {
          id: 'explore-data',
          icon: 'Search',
          category: 'Explore metrics',
          title: 'Overview kecelakaan Kalimantan Tengah',
          prompt: 'Berikan overview data kecelakaan Kalimantan Tengah — total kejadian, korban, dan tren bulanan',
        },
        {
          id: 'create-agent',
          icon: 'Plus',
          category: 'Set up monitoring',
          title: 'Buat specialist baru untuk monitoring',
          prompt: 'Bantu saya membuat specialist baru untuk monitoring kecelakaan',
        }
      );
    }

    // Pad to 7 with useful defaults so the 3+4 layout always fills
    const fillers: SuggestionCardData[] = [
      {
        id: 'blackspot-analysis',
        icon: 'MapPin',
        category: 'Blackspot analysis',
        title: 'Lokasi rawan kecelakaan tertinggi',
        prompt: 'Tampilkan analisis blackspot — cluster mana yang memiliki TRL score tertinggi dan paling banyak kejadian?',
      },
      {
        id: 'santunan-overview',
        icon: 'DollarSign',
        category: 'Santunan overview',
        title: 'Total klaim tersalurkan per wilayah',
        prompt: 'Berapa total santunan Jasa Raharja yang tersalurkan? Breakdown per klaim A (MD) dan klaim B (LL)',
      },
      {
        id: 'vehicle-profile',
        icon: 'Car',
        category: 'Vehicle profile',
        title: 'Kendaraan paling sering terlibat',
        prompt: 'Analisis kendaraan yang paling sering terlibat kecelakaan — brand, model, dan tipe apa yang dominan?',
      },
      {
        id: 'cause-4m',
        icon: 'Search',
        category: 'Cause analysis',
        title: 'Faktor penyebab utama (4M)',
        prompt: 'Apa faktor penyebab utama kecelakaan berdasarkan framework 4M (Man, Machine, Medium, Method)?',
      },
      {
        id: 'ask-anything',
        icon: 'MessageSquare',
        category: 'Ask anything',
        title: 'Tanya apa saja tentang data JRSI',
        prompt: '',
      },
    ];

    for (const filler of fillers) {
      if (suggestions.length >= 7) break;
      if (!suggestions.find((s) => s.id === filler.id)) {
        suggestions.push(filler);
      }
    }

    return suggestions.slice(0, 7); // 3 top row + 4 bottom row
  }, [briefing, agents, metrics]);
}
