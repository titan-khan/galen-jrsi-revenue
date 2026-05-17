import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MENTIONS,
  type Mention,
  type MentionAvatarTone,
  type MentionSentiment,
} from '@/data/risetData';

interface MentionFeedPanelProps {
  // Scope mentions to a Sesi (Briefing detail context). If omitted, shows global feed.
  scopeSesiId?: string;
  scopeLabel?: string;
}

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

const SENTIMENT_LABEL: Record<MentionSentiment, string> = {
  negative: 'Negatif',
  neutral: 'Netral',
  positive: 'Positif',
};

const SENTIMENT_DOT: Record<MentionSentiment, string> = {
  negative: 'bg-red-700',
  neutral: 'bg-slate-400',
  positive: 'bg-emerald-700',
};

type FilterTab = 'all' | 'negative' | 'high-influence';

export function MentionFeedPanel({ scopeSesiId, scopeLabel }: MentionFeedPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const scoped = useMemo(() => {
    return scopeSesiId
      ? MENTIONS.filter((m) => m.sesiIds.includes(scopeSesiId))
      : MENTIONS;
  }, [scopeSesiId]);

  const filtered = useMemo(() => {
    let result = scoped;
    if (activeTab === 'negative') {
      result = result.filter((m) => m.sentiment === 'negative');
    } else if (activeTab === 'high-influence') {
      result = result.filter((m) => m.influence >= 8);
    }
    return result.sort((a, b) => b.influence - a.influence);
  }, [scoped, activeTab]);

  const totalLabel = scopeSesiId ? '1.247' : '1.247';
  const negativeCount = scoped.filter((m) => m.sentiment === 'negative').length;
  const highInfCount = scoped.filter((m) => m.influence >= 8).length;

  return (
    <aside className="flex w-full flex-col border-l border-border bg-muted/30 lg:w-[320px]">
      {/* Header */}
      <div className="border-b border-border bg-card px-[18px] py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {scopeSesiId ? 'Mention dari Sesi ini' : 'Mention terbaru'}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">{totalLabel}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TabPill
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          >
            Semua
          </TabPill>
          <TabPill
            active={activeTab === 'negative'}
            onClick={() => setActiveTab('negative')}
          >
            Negatif <span className="ml-1 font-mono text-[10px] opacity-75">{negativeCount}</span>
          </TabPill>
          <TabPill
            active={activeTab === 'high-influence'}
            onClick={() => setActiveTab('high-influence')}
          >
            Pengaruh tinggi <span className="ml-1 font-mono text-[10px] opacity-75">{highInfCount}</span>
          </TabPill>
        </div>
      </div>

      {/* Scope note */}
      {scopeLabel && (
        <div className="flex items-center gap-1.5 border-b border-blue-200 bg-blue-50 px-[18px] py-2 text-[11.5px] text-blue-700">
          <Info className="h-3 w-3 shrink-0" />
          {scopeLabel}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-card">
        {filtered.map((m) => (
          <MentionRow key={m.id} mention={m} />
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-center text-[11.5px] text-muted-foreground">
            Tidak ada mention sesuai filter.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card px-[18px] py-3 text-center">
        <Link
          to="/research/mentions"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-blue-600 hover:underline"
        >
          {scopeSesiId ? `Lihat semua ${totalLabel} mention` : 'Lihat semua mention'}
          <ArrowRight className="h-3 w-3" />
        </Link>
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
        'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function MentionRow({ mention: m }: { mention: Mention }) {
  return (
    <div className="cursor-pointer border-b border-border px-[18px] py-3.5 transition-colors hover:bg-muted/30">
      <div className="mb-1.5 flex items-center gap-2">
        <div
          className={cn(
            'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full font-mono text-[9px] font-semibold',
            AVATAR_BG[m.avatarTone],
          )}
        >
          {m.avatarInitials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[12px] font-semibold text-foreground">{m.source}</span>
          <span className="font-mono text-[10.5px] text-muted-foreground">{m.platform.split(' · ')[0]}</span>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {m.timestamp.replace(' WIB', '')}
        </span>
      </div>
      <p className="mb-1.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
        {m.excerpt}
      </p>
      <div className="flex items-center gap-2.5 font-mono text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className={cn('h-1.5 w-1.5 rounded-full', SENTIMENT_DOT[m.sentiment])} />
          {SENTIMENT_LABEL[m.sentiment]}
        </span>
        <span>·</span>
        <span className="font-medium text-foreground/80">Pengaruh {m.influence}/10</span>
      </div>
    </div>
  );
}
