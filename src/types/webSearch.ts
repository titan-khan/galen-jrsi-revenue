export type WebSearchFocus = "media" | "social" | "all";

export interface WebSearchCitation {
  url: string;
  title: string;
  snippet: string;
  sourceDomain: string;
  date: string | null;
}

export interface WebSearchTheme {
  name: string;
  description: string;
}

export interface WebSearchSentiment {
  negativePct: number;
  neutralPct: number;
  positivePct: number;
  trendChangePoints: number;
}

export interface WebSearchRegion {
  region: string;
  negativePct: number;
}

export interface WebSearchTopic {
  rank: number;
  name: string;
  negativePct: number;
}

export interface WebSearchRecommendation {
  title: string;
  description: string;
}

export interface WebSearchPola {
  number: number;
  title: string;
  eventType: string;
  description: string;
  confidence: "tinggi" | "sedang" | "rendah";
  recommendations: WebSearchRecommendation[];
}

export interface WebSearchUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface WebSearchResult {
  query: string;
  focus: WebSearchFocus;
  periodDays: number;
  summary: string;
  citations: WebSearchCitation[];
  themes: WebSearchTheme[];
  sentiment: WebSearchSentiment | null;
  regions: WebSearchRegion[];
  topics: WebSearchTopic[];
  pola: WebSearchPola[];
  model: string;
  fetchedAt: string;
  latencyMs?: number;
  usage?: WebSearchUsage | null;
}

export interface WebSearchOptions {
  focus?: WebSearchFocus;
  maxResults?: number;
  locale?: string;
  /**
   * Lookback window in days. The edge function passes this to the search-preview
   * model as a hard constraint ("hanya artikel dalam N hari terakhir"). 7-365 typical.
   */
  periodDays?: number;
}
