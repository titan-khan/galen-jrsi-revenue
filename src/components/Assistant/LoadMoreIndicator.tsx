import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadMoreIndicatorProps {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function LoadMoreIndicator({
  isLoading,
  hasMore,
  onLoadMore,
}: LoadMoreIndicatorProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't setup observer if no more data or already loading
    if (!loadMoreRef.current || !hasMore || isLoading) return;

    // Create Intersection Observer to detect when element is visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    // Start observing the element
    observerRef.current.observe(loadMoreRef.current);

    // Cleanup observer on unmount or when dependencies change
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  // Hide component when no more data to load
  if (!hasMore) {
    return null;
  }

  return (
    <div
      ref={loadMoreRef}
      className="flex items-center justify-center py-4 px-3"
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading more...</span>
        </div>
      )}
    </div>
  );
}
