import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  MENTIONS,
  SESIONS,
  getSesi,
  getPola,
  type Mention,
  type MentionAvatarTone,
  type MentionSentiment,
} from '@/data/risetData';

const AVATAR_BG: Record<MentionAvatarTone, string> = {
  lbh: 'bg-indigo-100 text-indigo-800',
  tribun: 'bg-amber-100 text-amber-800',
  korlantas: 'bg-blue-100 text-blue-800',
  cnn: 'bg-red-100 text-red-800',
  karawang: 'bg-slate-200 text-slate-700',
  detik: 'bg-emerald-100 text-emerald-800',
  kompas: 'bg-sky-100 text-sky-800',
  bisnis: 'bg-purple-100 text-purple-800',
};

const SENTIMENT_PILL: Record<MentionSentiment, string> = {
  negative: 'border-red-200 bg-red-50 text-red-700',
  neutral: 'border-border bg-muted/40 text-muted-foreground',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const SENTIMENT_LABEL: Record<MentionSentiment, string> = {
  negative: 'Negatif',
  neutral: 'Netral',
  positive: 'Positif',
};

type RisetTab = 'all' | string;

const MentionFeed = () => {
  const [activeTab, setActiveTab] = useState<RisetTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(MENTIONS[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');

  const allRisets = useMemo(() => {
    const map = new Map<string, { id: string; name: string; mentionCount: number }>();
    SESIONS.forEach((s) => {
      const existing = map.get(s.risetName);
      const count = MENTIONS.filter((m) => m.sesiIds.includes(s.id)).length;
      if (existing) {
        existing.mentionCount += count;
      } else {
        map.set(s.risetName, { id: s.risetName, name: s.risetName, mentionCount: count });
      }
    });
    return Array.from(map.values());
  }, []);

  const filtered = useMemo(() => {
    let result = MENTIONS;
    if (activeTab !== 'all') {
      result = result.filter((m) =>
        m.sesiIds.some((sid) => getSesi(sid)?.risetName === activeTab),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.excerpt.toLowerCase().includes(q) || m.source.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => b.influence - a.influence);
  }, [activeTab, searchQuery]);

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 pb-5 pt-6">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground/70">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-auto px-2 py-0.5 text-[12px]">
            <Link to="/research">
              <ChevronLeft className="mr-1 h-3 w-3" />
              Riset
            </Link>
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground">Mention Feed</span>
        </nav>
        <h1 className="text-xl font-semibold text-foreground">Mention Feed</h1>
        <p className="mt-1 text-[13px] text-muted-foreground/70">
          Semua mention yang dianalisis Galen dari berbagai Riset · data dari Newstensity &amp;
          Determ.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          {/* Filter bar */}
          <Card className="mb-5">
            <CardContent className="space-y-3.5 p-5">
              {/* Riset tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-border pb-3.5">
                <TabPill active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                  Semua <span className="ml-1 font-mono text-[11px] opacity-75">{MENTIONS.length}</span>
                </TabPill>
                {allRisets.map((r) => (
                  <TabPill
                    key={r.id}
                    active={activeTab === r.id}
                    onClick={() => setActiveTab(r.id)}
                  >
                    {r.name} <span className="ml-1 font-mono text-[11px] opacity-75">{r.mentionCount}</span>
                  </TabPill>
                ))}
                <span className="inline-flex items-center rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1 text-[11.5px] text-muted-foreground/60">
                  + Riset lain (belum ada)
                </span>
              </div>

              {/* Sub filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari kata kunci dalam mention..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 text-[13px]"
                  />
                </div>
                <FilterPill label="Sentimen: Semua" />
                <FilterPill label="Sumber: Semua" />
                <FilterPill label="Wilayah: Semua" />
                <FilterPill label="7 hari terakhir" />
              </div>
            </CardContent>
          </Card>

          <p className="mb-3.5 text-[12.5px] text-muted-foreground">
            Menampilkan <strong className="font-medium text-foreground">{filtered.length} mention</strong>{' '}
            dari 6–12 Mei 2026 · diurutkan berdasarkan pengaruh tertinggi
          </p>

          {/* Feed list */}
          <Card>
            <CardContent className="p-0">
              {filtered.map((m, idx) => (
                <MentionRow
                  key={m.id}
                  mention={m}
                  expanded={expandedId === m.id}
                  isFirst={idx === 0}
                  onToggle={() =>
                    setExpandedId(expandedId === m.id ? null : m.id)
                  }
                />
              ))}
              {filtered.length === 0 && (
                <p className="p-8 text-center text-[13px] text-muted-foreground">
                  Tidak ada mention sesuai filter.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

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
        'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-foreground hover:border-slate-300"
    >
      {label}
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

function MentionRow({
  mention: m,
  expanded,
  isFirst,
  onToggle,
}: {
  mention: Mention;
  expanded: boolean;
  isFirst: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'cursor-pointer px-5 py-4 transition-colors',
        !isFirst && 'border-t border-border',
        expanded ? 'bg-muted/30' : 'hover:bg-muted/20',
      )}
    >
      <div className="grid grid-cols-[40px_1fr_auto] gap-3.5">
        <div
          className={cn(
            'grid h-10 w-10 place-items-center self-start rounded-full font-mono text-[13px] font-semibold',
            AVATAR_BG[m.avatarTone],
          )}
        >
          {m.avatarInitials}
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-semibold text-foreground">{m.source}</span>
            <span className="font-mono text-[11.5px] text-muted-foreground/70">
              {m.platform}
            </span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">
              {m.timestamp}
            </span>
          </div>
          <p className="mb-2 text-[13.5px] italic leading-relaxed text-foreground/90">
            "{m.excerpt}"
          </p>

          {/* Context chips */}
          {(m.relatedEntities.length > 0 ||
            m.relatedPolaIds.length > 0 ||
            m.relatedTopicIds.length > 0) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {m.relatedEntities.map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10.5px] text-foreground"
                >
                  {e}
                </span>
              ))}
              {m.relatedPolaIds.map((pId) => {
                const pola = getPola(m.sesiIds[0], pId);
                if (!pola) return null;
                return (
                  <Link
                    key={pId}
                    onClick={(e) => e.stopPropagation()}
                    to={`/research/sesi/${m.sesiIds[0]}/pola/${pId}`}
                    className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10.5px] text-blue-700 hover:bg-blue-100"
                  >
                    → Pola #{pola.number}
                  </Link>
                );
              })}
              {m.relatedTopicIds.map((tId) => (
                <span
                  key={tId}
                  className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10.5px] text-amber-800"
                >
                  Topik #{tId}
                </span>
              ))}
            </div>
          )}

          {/* Metrics row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground/70">
            <span>
              Jangkauan{' '}
              <strong className="font-medium text-foreground">
                {m.reach.toLocaleString('id-ID')}
              </strong>
            </span>
            <span>·</span>
            <span>
              Interaksi{' '}
              <strong className="font-medium text-foreground">
                {m.interactions.toLocaleString('id-ID')}
              </strong>
            </span>
            <span>·</span>
            <span>
              Pengaruh <strong className="font-medium text-foreground">{m.influence}/10</strong>
            </span>
            <span>·</span>
            <span>
              Kredibilitas{' '}
              <strong className="font-medium text-foreground">{m.credibilityLabel}</strong>
            </span>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-3 space-y-2.5 border-t border-dashed border-border pt-3">
              <DetailSection label="Signal trail">
                Acquired {m.acquisition.acquiredAt} via{' '}
                <span className="text-blue-600">{m.acquisition.provider}</span> · diproses dalam
                Sesi{' '}
                {m.sesiIds.map((sid, i) => {
                  const s = getSesi(sid);
                  return (
                    <span key={sid}>
                      {i > 0 && ', '}
                      <Link
                        onClick={(e) => e.stopPropagation()}
                        to={`/research/sesi/${sid}`}
                        className="text-blue-600 hover:underline"
                      >
                        {s?.date}
                      </Link>
                    </span>
                  );
                })}
              </DetailSection>
              <DetailSection label="Konteks akuisisi">
                Provider query matched: {m.acquisition.queryMatch}
              </DetailSection>
              {m.sourceUrl && (
                <DetailSection label="Sumber asli">
                  <a
                    onClick={(e) => e.stopPropagation()}
                    href={m.sourceUrl}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {m.platform.split(' · ')[0].toLowerCase().replace(/[@\s]/g, '')}.com/...
                  </a>
                </DetailSection>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
              SENTIMENT_PILL[m.sentiment],
            )}
          >
            {SENTIMENT_LABEL[m.sentiment]}
          </span>
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-[12px]">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span className="font-mono leading-relaxed text-foreground/90">{children}</span>
    </div>
  );
}

export default MentionFeed;
