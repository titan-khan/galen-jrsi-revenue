import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ProvenanceItem } from '@/data/riskLensData';

interface ProvenanceCardProps {
  item: ProvenanceItem;
}

export function ProvenanceCard({ item }: ProvenanceCardProps) {
  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center rounded border border-primary/40 px-1.5 py-0.5 font-medium text-primary">
          {item.source}
        </span>
        <span>{item.when}</span>
        <span aria-hidden>·</span>
        <span>credibility {item.credibility.toFixed(2)}</span>
        <span className="ml-auto">
          <ExternalLink className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-1.5 text-sm leading-snug text-foreground">{item.headline}</div>
    </Card>
  );
}
