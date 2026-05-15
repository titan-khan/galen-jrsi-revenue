import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import type { SesiAnalytics } from '@/data/risetData';

interface TopicsCardProps {
  analytics: SesiAnalytics;
  sesiId: string;
}

export function TopicsCard({ analytics: a, sesiId }: TopicsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Topik yang paling banyak dibicarakan
          </h3>
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {a.topTopics.length} topik utama
          </span>
        </div>
        <ul>
          {a.topTopics.map((t, i) => (
            <li
              key={t.rank}
              className={
                'grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 py-2.5 text-[13px] ' +
                (i === 0 ? '' : 'border-t border-dashed border-border')
              }
            >
              <span className="font-mono text-[11.5px] font-medium text-muted-foreground">
                #{t.rank}
              </span>
              <span className="truncate font-medium text-foreground">{t.name}</span>
              <span className="flex items-center gap-2">
                <span className="block h-1 w-[50px] overflow-hidden rounded-sm bg-slate-200">
                  <span
                    className="block h-full bg-red-700"
                    style={{ width: `${t.negativePct}%` }}
                  />
                </span>
                <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">
                  {t.negativePct}%
                </span>
              </span>
              {t.polaId ? (
                <Link
                  to={`/research/sesi/${sesiId}/pola/${t.polaId}`}
                  className="whitespace-nowrap rounded-sm border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[10.5px] text-blue-600 hover:bg-blue-100"
                >
                  → Pola #{t.polaNumber}
                </Link>
              ) : (
                <span className="w-[68px]" />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
