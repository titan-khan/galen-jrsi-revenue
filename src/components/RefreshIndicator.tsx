import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshIndicatorProps {
  /**
   * Whether the indicator should be visible
   */
  isValidating: boolean;
  /**
   * Optional custom message to display
   * @default "Refreshing data in background..."
   */
  message?: string;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * RefreshIndicator component displays an unobtrusive indicator when data is being
 * refreshed in the background (SWR pattern).
 * 
 * Requirements:
 * - 2.2: Background refresh without loading spinners
 * - 4.5: Expose isValidating flag to indicate background refresh status
 */
export function RefreshIndicator({
  isValidating,
  message = 'Refreshing data in background...',
  className,
}: RefreshIndicatorProps) {
  if (!isValidating) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md',
        className
      )}
    >
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      <span>{message}</span>
    </div>
  );
}
