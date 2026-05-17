import { useMemo } from "react";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentCard } from "@/components/Riset/SentimentCard";
import { TopicsCard } from "@/components/Riset/TopicsCard";
import { VolumeTimelineCard } from "@/components/Riset/VolumeTimelineCard";
import { webSearchToAnalytics } from "@/lib/webSearchToAnalytics";
import type { WebSearchResult } from "@/types/webSearch";

interface LiveBriefingPanelsProps {
  loading: boolean;
  error: string | null;
  result: WebSearchResult | null;
  /**
   * sesiId — passed through to TopicsCard so the "→ Pola" link is present
   * (Topics in Live mode don't carry polaId references, so the links never render,
   * but the prop is required by TopicsCard).
   */
  sesiId: string;
}

/**
 * Live counterpart to the Demo BriefingDetail body cards.
 *
 * Strategy: convert the WebSearchResult into the same SesiAnalytics shape that
 * Demo mode uses, then render the EXACT same SentimentCard, TopicsCard, and
 * VolumeTimelineCard components. This keeps the visual contract identical
 * between Demo and Live — only the data origin differs.
 */
export function LiveBriefingPanels({ loading, error, result, sesiId }: LiveBriefingPanelsProps) {
  const bundle = useMemo(() => (result ? webSearchToAnalytics(result) : null), [result]);
  const analytics = bundle?.analytics ?? null;
  // Period-aware copy for the sentiment card (e.g. "30 hari terakhir" instead of "minggu ini")
  const periodLabel = result
    ? `dalam ${formatPeriodCopy(result.periodDays)}`
    : undefined;

  if (loading && !result) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-2 p-5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/40">
        <CardContent className="flex items-start gap-2 p-4 text-[12.5px] text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-semibold">Live briefing gagal dimuat</div>
            <p className="mt-0.5 text-red-600/80">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  // If the model returned no citations, surface a clear empty state instead of
  // rendering analytic cards with synthetic numbers.
  if (result.citations.length === 0) {
    return (
      <Card className="border-amber-200/70 bg-amber-50/40">
        <CardContent className="p-5 text-[13px] leading-relaxed text-amber-900">
          <div className="mb-1 font-semibold text-amber-950">
            Tidak ada citation dalam periode yang dipilih
          </div>
          <p className="text-amber-900/85">
            Model <span className="font-mono">openai/gpt-4o-mini-search-preview</span> tidak
            mengembalikan sumber publik yang cocok dengan periode <strong>{formatPeriodCopy(result.periodDays)}</strong>.
            Coba perluas periode di halaman "Mulai Sesi Riset baru" atau ubah fokus query Sesi
            agar lebih spesifik (mis. tambah nama wilayah / kasus tertentu).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live summary — narrative from the model itself */}
      <Card className="border-blue-200/70 bg-blue-50/40">
        <CardContent className="p-5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-800">
            <Sparkles className="h-3 w-3" />
            Ringkasan live · disusun oleh openai/gpt-4o-mini-search-preview
          </div>
          {loading && (
            <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-blue-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              Memperbarui di latar belakang…
            </div>
          )}
          <div className="text-[13.5px] leading-relaxed text-foreground whitespace-pre-line">
            {renderSummaryWithLinks(result.summary)}
          </div>
          <p className="mt-3 border-t border-blue-200/60 pt-2 font-mono text-[11px] text-muted-foreground">
            {result.citations.length} sumber · {result.themes.length} tema ·{" "}
            {result.topics.length} topik · {result.regions.length} wilayah ·{" "}
            {result.latencyMs ? `${(result.latencyMs / 1000).toFixed(1)}s` : "—"} ·{" "}
            {result.usage?.total_tokens ?? "?"} token
          </p>
        </CardContent>
      </Card>

      {/* Themes — high-level narrative patterns from the model */}
      {result.themes.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tema yang muncul di sumber
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {result.themes.length} tema
              </span>
            </div>
            <ul className="space-y-2.5">
              {result.themes.map((t, i) => (
                <li key={`${t.name}-${i}`} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-100 font-mono text-[10px] font-semibold text-indigo-800">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
                    {t.description && (
                      <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Volume timeline — citation dates bucketed by the user-selected period,
          sentiment-shaded from the LLM's overall sentiment classification. */}
      {analytics?.volumeTimeline && (
        <VolumeTimelineCard
          timeline={analytics.volumeTimeline}
          titleOverride={bundle?.timelineTitle}
          methodologyOverride={bundle?.timelineMethodologyNote}
        />
      )}

      {/* Sentiment + Topics side-by-side, REUSING the existing Demo components */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2">
          <SentimentCard analytics={analytics} periodLabel={periodLabel} unitLabel="citation" />
          <TopicsCard analytics={analytics} sesiId={sesiId} />
        </div>
      )}

      {/* Provenance footer — be transparent about how analytics were derived */}
      <div className="rounded-md border border-amber-200/70 bg-amber-50/40 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
        <span className="font-semibold">Sumber analytic:</span> Sentimen, wilayah, dan topik
        di atas adalah hasil klasifikasi model <span className="font-mono">openai/gpt-4o-mini-search-preview</span>{" "}
        terhadap {result.citations.length} citation publik yang ditemukannya — bukan data
        monitoring real-time. Volume timeline dihitung dari{" "}
        <span className="font-mono">date</span> setiap citation, dibagi proporsional ke
        sentimen keseluruhan.
      </div>
    </div>
  );
}

function formatPeriodCopy(days: number): string {
  if (days <= 7) return `${days} hari terakhir`;
  if (days <= 31) return `${days} hari terakhir`;
  if (days <= 100) return `~${Math.round(days / 7)} minggu terakhir`;
  return `~${Math.round(days / 30)} bulan terakhir`;
}

// Lightweight markdown rendering for inline links in summary — keeps URLs clickable.
function renderSummaryWithLinks(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const linkRe = /\[([^\]]{1,240})\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkRe.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(<span key={`t-${key}`}>{text.slice(lastIdx, match.index)}</span>);
    }
    const label = match[1].trim();
    const url = match[2].replace(/[),.;]+$/, "");
    parts.push(
      <a
        key={`l-${key}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
      >
        {label}
      </a>,
    );
    lastIdx = match.index + match[0].length;
    key++;
  }
  if (lastIdx < text.length) parts.push(<span key={`t-${key}`}>{text.slice(lastIdx)}</span>);
  return parts.length > 0 ? parts : <span>{text}</span>;
}
