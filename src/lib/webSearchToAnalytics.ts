/**
 * webSearchToAnalytics.ts
 *
 * Adapter: convert a WebSearchResult into the SesiAnalytics shape used by the
 * existing Demo-mode cards (SentimentCard, TopicsCard, VolumeTimelineCard).
 *
 * Also returns Live-mode-specific labels (timeline title + methodology note) that
 * adapt to the lookback period the user chose in MulaiSesi (7d / 30d / 90d / 12m).
 */

import type { WebSearchResult } from "@/types/webSearch";
import type {
  SesiAnalytics,
  VolumeTimeline,
  VolumeTimelineDay,
} from "@/data/risetData";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MONTHS_ID_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
];

export interface LiveAnalyticsBundle {
  analytics: SesiAnalytics | null;
  timelineTitle: string;
  timelineMethodologyNote: string;
}

type Bucket = "daily" | "weekly" | "monthly";

function bucketFromPeriod(periodDays: number): Bucket {
  if (periodDays <= 14) return "daily";
  if (periodDays <= 120) return "weekly";
  return "monthly";
}

function periodLabel(periodDays: number): string {
  if (periodDays <= 7) return `${periodDays} hari terakhir`;
  if (periodDays <= 31) return `${periodDays} hari terakhir`;
  if (periodDays <= 100) return `~${Math.round(periodDays / 7)} minggu terakhir`;
  return `~${Math.round(periodDays / 30)} bulan terakhir`;
}

/**
 * Build a SesiAnalytics-compatible object from web search output.
 *
 * Returns analytics=null if the LLM gave us nothing structured — caller should
 * hide the cards (or surface an empty state).
 */
export function webSearchToAnalytics(result: WebSearchResult): LiveAnalyticsBundle {
  const empty: LiveAnalyticsBundle = {
    analytics: null,
    timelineTitle: `Volume percakapan ${periodLabel(result.periodDays)}`,
    timelineMethodologyNote:
      `Citation di-scrape dari pencarian web live (openai/gpt-4o-mini-search-preview via OpenRouter), ` +
      `dibatasi ${periodLabel(result.periodDays)}. Sentimen, wilayah, dan topik di bawah diturunkan oleh model dari isi citation.`,
  };

  // If the model returned no citations, hide all derived analytics — a sentiment %
  // computed from zero citations would be a contradiction. The caller should
  // surface a "no results for this period" empty state instead.
  if (result.citations.length === 0) {
    return empty;
  }
  if (!result.sentiment && result.topics.length === 0 && result.regions.length === 0) {
    return empty;
  }

  const s = result.sentiment ?? {
    negativePct: 0,
    neutralPct: 0,
    positivePct: 0,
    trendChangePoints: 0,
  };

  const bucket = bucketFromPeriod(result.periodDays);
  const timeline = buildLiveTimeline(result, bucket);

  return {
    analytics: {
      totalConversations: result.citations.length,
      sentimentNegativePct: s.negativePct,
      sentimentNeutralPct: s.neutralPct,
      sentimentPositivePct: s.positivePct,
      trendChangePoints: s.trendChangePoints,
      topRegions: result.regions.map((r) => ({
        region: r.region,
        negativePct: r.negativePct,
      })),
      topTopics: result.topics.map((t) => ({
        rank: t.rank,
        name: t.name,
        negativePct: t.negativePct,
      })),
      volumeTimeline: timeline,
    },
    timelineTitle: `Volume percakapan ${periodLabel(result.periodDays)}`,
    timelineMethodologyNote:
      `Volume = jumlah citation publik per ${bucket === "daily" ? "hari" : bucket === "weekly" ? "minggu" : "bulan"} ` +
      `dari pencarian web live, dibatasi ${periodLabel(result.periodDays)}. ` +
      `Bagian sentimen dibagi proporsional ke distribusi sentimen keseluruhan dari model.`,
  };
}

/**
 * Build a Volume timeline whose buckets and X-axis labels match the user-selected
 * period. Citations outside the period window (e.g. model returned an older
 * article) are clipped so the chart stays consistent with the period.
 */
function buildLiveTimeline(result: WebSearchResult, bucket: Bucket): VolumeTimeline | undefined {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - result.periodDays);

  // Step 1: build the empty bucket scaffold so the chart always shows the FULL period
  // even when the model returned only a couple of citations (or none with dates).
  const buckets = new Map<string, { key: string; label: string; date: string; count: number }>();

  if (bucket === "daily") {
    for (let i = 0; i < result.periodDays; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (result.periodDays - 1 - i));
      const key = isoDay(d);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      buckets.set(key, { key, label, date: key, count: 0 });
    }
  } else if (bucket === "weekly") {
    // ~ceil(periodDays/7) weekly buckets, anchored to "now"
    const totalWeeks = Math.ceil(result.periodDays / 7);
    for (let i = 0; i < totalWeeks; i++) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const key = isoDay(start);
      const label = `${start.getDate()} ${MONTHS_ID_SHORT[start.getMonth()]}`;
      buckets.set(key, { key, label, date: key, count: 0 });
    }
  } else {
    // monthly buckets
    const totalMonths = Math.max(1, Math.ceil(result.periodDays / 30));
    for (let i = 0; i < totalMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTHS_ID_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      buckets.set(key, { key, label, date: `${key}-01`, count: 0 });
    }
  }

  // Step 2: assign each citation to a bucket. Skip out-of-window citations so
  // the timeline reflects the period the user actually asked for.
  for (const c of result.citations) {
    if (!c.date) continue;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(c.date);
    if (!m) continue;
    const cDate = new Date(`${m[1]}-${m[2]}-${m[3]}`);
    if (Number.isNaN(cDate.getTime())) continue;
    if (cDate < windowStart) continue;

    const key = bucketKeyFor(cDate, bucket, now, result.periodDays);
    const found = buckets.get(key);
    if (found) found.count++;
  }

  // Convert the bucket map (which iterates in chronological order for daily/monthly
  // and reverse for weekly because we built it backward) into the timeline shape.
  const ordered = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  const total = ordered.reduce((acc, b) => acc + b.count, 0);
  if (ordered.length === 0) return undefined;

  const negPct = (result.sentiment?.negativePct ?? 0) / 100;
  const neuPct = (result.sentiment?.neutralPct ?? 0) / 100;
  const posPct = Math.max(0, 1 - negPct - neuPct);

  const days: VolumeTimelineDay[] = ordered.map((b) => {
    // Split the bucket count proportionally to overall sentiment.
    const negative = b.count > 0 ? Math.round(b.count * negPct * 10) / 10 : 0;
    const neutral = b.count > 0 ? Math.round(b.count * neuPct * 10) / 10 : 0;
    const positive = b.count > 0 ? Math.max(0, b.count - negative - neutral) : 0;
    return {
      date: b.date,
      label: b.label,
      negative,
      neutral,
      positive,
    };
  });

  const first = new Date(ordered[0].date);
  const last = new Date(ordered[ordered.length - 1].date);
  const rangeLabel =
    bucket === "daily"
      ? `${first.getDate()} ${MONTHS_ID_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_ID_SHORT[last.getMonth()]} ${last.getFullYear()}`
      : `${MONTHS_ID[first.getMonth()]} ${first.getFullYear()} – ${MONTHS_ID[last.getMonth()]} ${last.getFullYear()}`;

  return {
    days,
    annotations: [],
    context: total === 0
      ? `Tidak ada citation bertanggal yang masuk window ${periodLabel(result.periodDays)} ini.`
      : `${total} citation publik ditemukan model di periode ini, dibagi per ${bucket === "daily" ? "hari" : bucket === "weekly" ? "minggu" : "bulan"}.`,
    totalConversations: total,
    rangeLabel,
  };
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bucketKeyFor(citationDate: Date, bucket: Bucket, now: Date, periodDays: number): string {
  if (bucket === "daily") {
    return isoDay(citationDate);
  }
  if (bucket === "weekly") {
    // Snap the citation to the corresponding weekly bucket end (one of the keys we built).
    // We iterate weeks back-to-front (most recent first) when building buckets, so find the
    // first bucket whose [start, start+6] interval contains the citation.
    const totalWeeks = Math.ceil(periodDays / 7);
    for (let i = 0; i < totalWeeks; i++) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      if (citationDate >= start && citationDate <= end) {
        return isoDay(start);
      }
    }
    return isoDay(citationDate);
  }
  // monthly
  return `${citationDate.getFullYear()}-${String(citationDate.getMonth() + 1).padStart(2, "0")}`;
}
