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
          category: 'Overview kepatuhan',
          title: 'Snapshot kepatuhan PKB Palangka Raya',
          prompt: 'Berikan overview kepatuhan PKB Palangka Raya — distribusi segmen, total tunggakan, dan tren bulanan',
        },
        {
          id: 'create-agent',
          icon: 'Plus',
          category: 'Set up monitoring',
          title: 'Buat specialist PKB baru',
          prompt: 'Bantu saya membuat specialist baru untuk monitoring kepatuhan PKB',
        }
      );
    }

    // Pad to 7 with useful defaults so the 3+4 layout always fills.
    // PKB pilot context (Bapenda Kalteng — compliance, revenue recovery, treatment execution).
    const fillers: SuggestionCardData[] = [
      {
        id: 'segment-distribution',
        icon: 'PieChart',
        category: 'Distribusi kepatuhan',
        title: 'Breakdown per segmen wajib pajak',
        prompt: 'Tampilkan distribusi kendaraan per segmen kepatuhan (Patuh Aktif, Mulai Mengabaikan, Tidak Patuh Pasif, Tidak Patuh Kronis, Kendaraan Hantu) — segmen mana yang paling besar dan punya potensi recovery tertinggi?',
      },
      {
        id: 'arrears-recovery',
        icon: 'DollarSign',
        category: 'Potensi recovery PKB',
        title: 'Estimasi tunggakan & potensi tagih',
        prompt: 'Berapa total estimasi PKB tertunggak per segmen, dan berapa potensi recovery realistis dengan program penagihan terstruktur 90 hari?',
      },
      {
        id: 'kabupaten-priority',
        icon: 'MapPin',
        category: 'Wilayah prioritas',
        title: 'Kabupaten tunggakan tertinggi',
        prompt: 'Kabupaten/kota mana yang punya konsentrasi tunggakan PKB tertinggi? Rekomendasikan urutan prioritas operasi penagihan terkoordinasi.',
      },
      {
        id: 'arrears-cause',
        icon: 'Search',
        category: 'Cause analysis',
        title: 'Akar masalah kepatuhan rendah',
        prompt: 'Apa akar masalah utama segmen Tidak Patuh Kronis (cakupan kontak, durasi tunggakan, tidak ada enforcement) — dan rekomendasi prioritas intervensi?',
      },
      {
        id: 'channel-coverage',
        icon: 'MessageSquare',
        category: 'Cakupan kanal digital',
        title: 'Kendaraan terjangkau via WhatsApp/SMS',
        prompt: 'Berapa persen kendaraan menunggak yang punya nomor handphone valid? Segmen mana yang paling besar peluang sukses tagih digitalnya?',
      },
      {
        id: 'ask-anything',
        icon: 'MessageSquare',
        category: 'Ask anything',
        title: 'Tanya apa saja tentang data PKB',
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
