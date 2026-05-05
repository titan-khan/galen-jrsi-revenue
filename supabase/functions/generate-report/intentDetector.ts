// =============================================================================
// INTENT DETECTOR — Maps user messages to DB query categories
// Uses keyword matching to decide which tables to query
// =============================================================================

export type IntentCategory =
  | 'revenue'
  | 'nps'
  | 'operations'
  | 'fleet'
  | 'funnel'
  | 'agents'
  | 'general'
  | 'metadata';

export interface DetectedIntent {
  categories: IntentCategory[];
  confidence: number;
  mentionedEntities: string[];
}

interface IntentRule {
  keywords: string[];
  weight: number;
}

const INTENT_RULES: Record<IntentCategory, IntentRule> = {
  revenue: {
    keywords: [
      'revenue', 'sales', 'income', 'booking', 'ticket revenue', 'money',
      'earnings', 'gross', 'financial', 'price', 'fare', 'gmv', 'arpu',
      'transaction', 'order', 'payment',
    ],
    weight: 1.0,
  },
  nps: {
    keywords: [
      'nps', 'net promoter', 'satisfaction', 'promoter', 'detractor',
      'passive', 'survey', 'feedback', 'complaint', 'loyalty', 'csat',
      'customer score', 'customer sentiment',
    ],
    weight: 1.0,
  },
  operations: {
    keywords: [
      'otp', 'on-time', 'on time', 'delay', 'trip', 'schedule', 'punctual',
      'late', 'arrival', 'departure', 'sla', 'operational', 'performance',
      'route performance', 'trip status',
    ],
    weight: 1.0,
  },
  fleet: {
    keywords: [
      'fleet', 'vehicle', 'bus', 'driver', 'crew', 'maintenance', 'capacity',
      'utilization', 'seat', 'vehicle revenue', 'opex', 'capex',
    ],
    weight: 0.9,
  },
  funnel: {
    keywords: [
      'funnel', 'conversion', 'drop-off', 'dropoff', 'checkout', 'abandon',
      'session', 'booking flow', 'channel', 'homepage',
    ],
    weight: 0.9,
  },
  agents: {
    keywords: [
      'agent', 'recommendation', 'finding', 'skill', 'run', 'analysis result',
      'specialist', 'pending action', 'trust score', 'autonomy',
    ],
    weight: 0.8,
  },
  general: {
    keywords: [
      'summary', 'overview', 'brief', 'dashboard', 'status', 'how are we',
      'this week', 'today', 'what happened', 'report', 'update',
    ],
    weight: 0.6,
  },
  metadata: {
    keywords: [
      'what is', 'define', 'meaning', 'dictionary', 'explain', 'definition',
      'metric definition', 'what does', 'how is .* calculated',
    ],
    weight: 0.5,
  },
};

const SCORE_THRESHOLD = 0.12;
const MAX_CATEGORIES = 3;

/**
 * Detect which DB query categories are relevant for a user message.
 * Returns up to 3 categories sorted by relevance score.
 */
export function detectIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase();
  const tokens = lower.split(/\s+/);

  const scores: { category: IntentCategory; score: number }[] = [];

  for (const [category, rule] of Object.entries(INTENT_RULES) as [IntentCategory, IntentRule][]) {
    let matches = 0;

    for (const keyword of rule.keywords) {
      // Support multi-word keywords
      if (keyword.includes(' ')) {
        if (lower.includes(keyword)) matches++;
      } else {
        if (tokens.includes(keyword)) matches++;
      }
    }

    if (matches > 0) {
      const score = (matches / rule.keywords.length) * rule.weight;
      scores.push({ category, score });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Filter by threshold, cap at MAX_CATEGORIES
  let categories = scores
    .filter((s) => s.score >= SCORE_THRESHOLD)
    .slice(0, MAX_CATEGORIES)
    .map((s) => s.category);

  // Default to 'general' if nothing matched
  if (categories.length === 0) {
    categories = ['general'];
  }

  const topScore = scores.length > 0 ? scores[0].score : 0;

  // Extract @mentions
  const mentionedEntities = extractMentions(message);

  return {
    categories,
    confidence: Math.min(topScore, 1.0),
    mentionedEntities,
  };
}

/**
 * Extract @mention references from message text.
 * Uses a greedy regex that allows multi-word names (stops at double-space, newline, or punctuation after a word boundary).
 */
function extractMentions(content: string): string[] {
  const mentionRegex = /@([\w]+(?:\s[\w]+)*)(?=\s{2,}|$|@|\.|,|!|\?|\n)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].trim().toLowerCase());
  }

  return mentions;
}
