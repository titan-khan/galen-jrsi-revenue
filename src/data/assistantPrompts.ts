import type { SuggestionCardData, PromptCategory } from '@/types/assistant';

export const suggestionCards: SuggestionCardData[] = [
  // Row 1 - Fulfillment & Revenue
  {
    id: '1',
    category: 'Analyze fulfillment fees',
    title: 'breakdown by client',
    prompt: 'Break down fulfillment fee revenue by client and fee component (receiving, storage, pick&pack, QC, kitting, packaging)',
    icon: 'TrendingUp'
  },
  {
    id: '2',
    category: 'Client profitability',
    title: 'margin analysis',
    prompt: 'Analyze contribution margin by client — which clients are most and least profitable, and why?',
    icon: 'BarChart3'
  },
  {
    id: '3',
    category: 'Cost deep-dive',
    title: 'shipping & returns',
    prompt: 'Analyze shipping costs by delivery partner and returns costs by client. Which areas have the highest cost pressure?',
    icon: 'Bot'
  },
  {
    id: '4',
    category: 'Warehouse utilization',
    title: 'capacity analysis',
    prompt: 'How are our warehouses performing in terms of storage utilization, pallet usage, and storage days across clients?',
    icon: 'Sparkles'
  },
  // Row 2 - Operations & Strategic
  {
    id: '5',
    category: 'Monthly performance',
    title: 'trend analysis',
    prompt: 'Show me the monthly trend of orders, revenue, and contribution margin for the last 12 months',
    icon: 'AlertTriangle'
  },
  {
    id: '6',
    category: 'Get monthly brief',
    title: 'all metrics overview',
    prompt: 'Give me a comprehensive summary of LogistiQ performance for December 2025 — orders, revenue, costs, margin, and key highlights',
    icon: 'Sparkles'
  },
  {
    id: '7',
    category: 'Product category mix',
    title: 'GMV & margin by category',
    prompt: 'Analyze GMV and gross profit margin by product category. Which categories drive the most value?',
    icon: 'CheckCircle'
  },
  {
    id: '8',
    category: 'Return rate analysis',
    title: 'by client & month',
    prompt: 'What is our return rate trend? Which clients have the highest return rates and what is the cost impact?',
    icon: 'TrendingUp'
  }
];

export const promptLibrary: PromptCategory[] = [
  {
    name: 'Metric Analysis',
    prompts: [
      { title: 'Trend Analysis', prompt: 'How has @metric trended over the past 30 days?' },
      { title: 'Compare Periods', prompt: 'Compare @metric performance this quarter vs last quarter' },
      { title: 'Target Progress', prompt: 'How close is @metric to its target?' },
      { title: 'Root Cause', prompt: 'What is causing the change in @metric?' }
    ]
  },
  {
    name: 'Agent Intelligence',
    prompts: [
      { title: 'Agent Summary', prompt: 'What has @agent discovered recently?' },
      { title: 'All Recommendations', prompt: 'List all pending recommendations from my agents' },
      { title: 'Anomaly Report', prompt: 'Show all anomalies detected this week' },
      { title: 'Agent Performance', prompt: 'Which agents have delivered the most value?' }
    ]
  },
  {
    name: 'Executive Insights',
    prompts: [
      { title: 'North Star Status', prompt: 'How is my North Star metric performing?' },
      { title: 'Risk Summary', prompt: 'What are the top 3 risks affecting performance?' },
      { title: 'Action Items', prompt: 'What actions need my approval today?' },
      { title: 'Weekly Summary', prompt: 'Give me a summary of this week\'s key developments' }
    ]
  },
  {
    name: 'Competitive & Strategic',
    prompts: [
      { title: 'Market Position', prompt: 'How are we positioned against competitors?' },
      { title: 'Growth Opportunities', prompt: 'What are the top growth opportunities identified?' },
      { title: 'Resource Allocation', prompt: 'Where should we focus resources based on current data?' }
    ]
  }
];
