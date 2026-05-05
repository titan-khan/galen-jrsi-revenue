import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SuggestionCardData } from '@/types/assistant';

interface SuggestionCarouselProps {
  suggestions: SuggestionCardData[];
  onSelect: (prompt: string) => void;
}

/* ── Scrollable Row with drag + arrow navigation ── */
function ScrollRow({
  items,
  onSelect,
}: {
  items: SuggestionCardData[];
  onSelect: (prompt: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragMoved = useRef(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  /* pointer-based drag */
  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragMoved.current = false;
    setStartX(e.clientX);
    setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) dragMoved.current = true;
    scrollRef.current.scrollLeft = scrollLeft - dx;
  };
  const onPointerUp = () => setIsDragging(false);

  const handleCardClick = (prompt: string) => {
    if (!dragMoved.current && prompt) onSelect(prompt);
  };

  return (
    <div className="group/row relative">
      {/* Left fade + arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center
            bg-gradient-to-r from-background via-background/80 to-transparent
            opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>
      )}

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="flex gap-3 overflow-x-auto select-none px-1 py-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.prompt)}
            className="flex-shrink-0 w-[220px] h-[100px] rounded-xl border border-border bg-card p-4 text-left
              hover:border-primary/30 hover:shadow-sm hover:bg-muted/30 transition-all duration-200 cursor-pointer"
          >
            <p className="text-sm font-medium text-foreground line-clamp-1">{card.category}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">{card.title}</p>
          </button>
        ))}
      </div>

      {/* Right fade + arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center
            bg-gradient-to-l from-background via-background/80 to-transparent
            opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

/* ── Main Carousel (2 rows) ── */
export const SuggestionCarousel = memo(function SuggestionCarousel({
  suggestions,
  onSelect,
}: SuggestionCarouselProps) {
  const { row1, row2 } = useMemo(() => {
    // Top row: first 3 cards — bottom row: remaining cards
    const split = Math.min(3, Math.ceil(suggestions.length / 2));
    return {
      row1: suggestions.slice(0, split),
      row2: suggestions.slice(split),
    };
  }, [suggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3 mt-2">
      <ScrollRow items={row1} onSelect={onSelect} />
      {row2.length > 0 && (
        <ScrollRow items={row2} onSelect={onSelect} />
      )}
    </div>
  );
});
