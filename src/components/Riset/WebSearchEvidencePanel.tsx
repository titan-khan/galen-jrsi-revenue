import { useEffect, useState } from "react";
import { ExternalLink, Globe, Info, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchWebSearch } from "@/services/webSearchService";
import type { WebSearchCitation, WebSearchFocus, WebSearchResult } from "@/types/webSearch";

interface WebSearchEvidencePanelProps {
  query: string;
  focus?: WebSearchFocus;
  scopeLabel?: string;
}

type FilterTab = "all" | "media" | "social";

const MEDIA_DOMAINS = new Set([
  "kompas.com",
  "detik.com",
  "tempo.co",
  "cnnindonesia.com",
  "cnbcindonesia.com",
  "bisnis.com",
  "kontan.co.id",
  "antaranews.com",
  "tribunnews.com",
  "mediaindonesia.com",
  "liputan6.com",
  "republika.co.id",
  "merdeka.com",
  "okezone.com",
  "viva.co.id",
]);

const SOCIAL_DOMAINS = new Set([
  "twitter.com",
  "x.com",
  "reddit.com",
  "youtube.com",
  "facebook.com",
  "tiktok.com",
  "instagram.com",
  "threads.net",
  "kaskus.co.id",
]);

function classifyDomain(domain: string): "media" | "social" | "other" {
  if (MEDIA_DOMAINS.has(domain)) return "media";
  if (SOCIAL_DOMAINS.has(domain)) return "social";
  // Heuristic fallbacks
  if (/\.(co\.id|com)$/i.test(domain) && /(news|berita|media|tribun|detik|kompas|antara)/i.test(domain)) {
    return "media";
  }
  if (/twitter|x\.com|reddit|youtube|facebook|tiktok|instagram/i.test(domain)) return "social";
  return "other";
}

function domainBadgeClass(kind: "media" | "social" | "other"): string {
  if (kind === "media") return "bg-sky-100 text-sky-800";
  if (kind === "social") return "bg-violet-100 text-violet-800";
  return "bg-slate-200 text-slate-700";
}

function avatarInitials(domain: string): string {
  const name = domain.split(".")[0] || "??";
  return name.slice(0, 2).toUpperCase();
}

export function WebSearchEvidencePanel({ query, focus = "all", scopeLabel }: WebSearchEvidencePanelProps) {
  const [result, setResult] = useState<WebSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWebSearch(query, { focus }, (fresh) => {
      if (cancelled) return;
      setResult(fresh);
    })
      .then((res) => {
        if (cancelled) return;
        if (res) setResult(res);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Gagal memuat hasil pencarian.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, focus, reloadKey]);

  const citations = result?.citations ?? [];
  const mediaCount = citations.filter((c) => classifyDomain(c.sourceDomain) === "media").length;
  const socialCount = citations.filter((c) => classifyDomain(c.sourceDomain) === "social").length;

  const filtered = citations.filter((c) => {
    if (activeTab === "all") return true;
    return classifyDomain(c.sourceDomain) === activeTab;
  });

  return (
    <aside className="flex w-full flex-col border-l border-border bg-muted/30 lg:w-[320px]">
      {/* Header */}
      <div className="border-b border-border bg-card px-[18px] py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            <Globe className="h-3 w-3" />
            Bukti live (web search)
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {loading && !result ? "…" : citations.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TabPill active={activeTab === "all"} onClick={() => setActiveTab("all")}>
            Semua
          </TabPill>
          <TabPill active={activeTab === "media"} onClick={() => setActiveTab("media")}>
            Media <span className="ml-1 font-mono text-[10px] opacity-75">{mediaCount}</span>
          </TabPill>
          <TabPill active={activeTab === "social"} onClick={() => setActiveTab("social")}>
            Sosial <span className="ml-1 font-mono text-[10px] opacity-75">{socialCount}</span>
          </TabPill>
        </div>
      </div>

      {/* Scope note */}
      {scopeLabel && (
        <div className="flex items-center gap-1.5 border-b border-emerald-200 bg-emerald-50 px-[18px] py-2 text-[11.5px] text-emerald-800">
          <Info className="h-3 w-3 shrink-0" />
          <span className="truncate">{scopeLabel}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-card">
        {error ? (
          <div className="flex flex-col items-start gap-2 p-4 text-[11.5px] text-red-700">
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Gagal memuat hasil
            </span>
            <p className="text-red-600/80">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-1 inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="h-3 w-3" />
              Coba lagi
            </button>
          </div>
        ) : loading && !result ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-[11.5px] text-muted-foreground">
            Tidak ada hasil sesuai filter.
          </p>
        ) : (
          filtered.map((c, i) => <CitationRow key={`${c.url}-${i}`} citation={c} />)
        )}

        {loading && result && (
          <div className="flex items-center justify-center gap-1.5 border-t border-border py-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Memperbarui hasil di latar belakang…
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card px-[18px] py-3 text-center text-[11px] text-muted-foreground">
        <span>
          Sumber via OpenRouter ·{" "}
          <span className="font-mono">{result?.model ?? "openai/gpt-4o-mini-search-preview"}</span>
        </span>
      </div>
    </aside>
  );
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CitationRow({ citation: c }: { citation: WebSearchCitation }) {
  const kind = classifyDomain(c.sourceDomain);
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-b border-border px-[18px] py-3.5 transition-colors hover:bg-muted/30"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <div
          className={cn(
            "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full font-mono text-[9px] font-semibold",
            domainBadgeClass(kind),
          )}
        >
          {avatarInitials(c.sourceDomain)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[12px] font-semibold text-foreground" title={c.title}>
            {c.title}
          </span>
          <span className="truncate font-mono text-[10.5px] text-muted-foreground">
            {c.sourceDomain}
          </span>
        </div>
        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
      </div>
      {c.snippet && (
        <p className="mb-1.5 line-clamp-3 text-[11.5px] leading-snug text-muted-foreground">
          {c.snippet}
        </p>
      )}
      <div className="flex items-center gap-2.5 font-mono text-[10.5px] text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
            kind === "media"
              ? "bg-sky-50 text-sky-700"
              : kind === "social"
              ? "bg-violet-50 text-violet-700"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {kind === "media" ? "Media" : kind === "social" ? "Sosial" : "Lainnya"}
        </span>
        {c.date && (
          <>
            <span>·</span>
            <span>{c.date}</span>
          </>
        )}
      </div>
    </a>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 px-[18px] py-3.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-[22px] w-[22px] rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}
