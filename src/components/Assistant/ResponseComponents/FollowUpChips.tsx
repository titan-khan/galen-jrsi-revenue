import { cn } from '@/lib/utils';
import type { FollowUpQuestion } from '@/utils/followUpGenerator';

interface FollowUpChipsProps {
  questions: FollowUpQuestion[];
  onSelect: (questionText: string) => void;
  isRefreshing?: boolean;
}

export function FollowUpChips({ questions, onSelect, isRefreshing }: FollowUpChipsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
      <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">
        Explore Further
      </span>
      <div className={cn('flex flex-col gap-2', isRefreshing && 'animate-pulse')}>
        {questions.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(q.text)}
            className="w-fit max-w-full px-4 py-2.5 text-sm rounded-full bg-muted hover:bg-muted/80 text-foreground text-left leading-snug transition-colors duration-150 cursor-pointer"
          >
            {q.text}
          </button>
        ))}
      </div>
    </div>
  );
}
