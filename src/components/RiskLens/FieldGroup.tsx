import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditChip } from './EditChip';
import type { ExtractedField } from '@/data/briefData';

interface FieldGroupProps {
  field: ExtractedField;
}

export function FieldGroup({ field }: FieldGroupProps) {
  return (
    <Card className="p-3.5">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {field.label}
        </h3>
        {field.suggestedCount > 0 && (
          <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
            {field.suggestedCount} AI-suggested
          </Badge>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">{field.hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {field.chips.map((chip) => (
          <EditChip key={chip.label} {...chip} />
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          add
        </button>
      </div>
    </Card>
  );
}
