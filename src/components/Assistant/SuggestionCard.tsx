import type { SuggestionCardData } from '@/types/assistant';

interface SuggestionCardProps {
  data: SuggestionCardData;
  onClick: (prompt: string) => void;
}

export function SuggestionCard({ data, onClick }: SuggestionCardProps) {
  return (
    <button
      onClick={() => onClick(data.prompt)}
      className="flex-shrink-0 w-[260px] p-3 text-left border rounded-lg bg-card hover:border-primary/40 hover:bg-muted/30 transition-all group"
    >
      <p className="text-sm font-medium text-foreground line-clamp-1 mb-0.5">
        {data.category}
      </p>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {data.title}
      </p>
    </button>
  );
}
