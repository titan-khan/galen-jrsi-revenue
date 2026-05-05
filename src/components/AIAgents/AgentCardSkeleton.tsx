import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AgentCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Description */}
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t">
          <Skeleton className="h-3 w-40" />
        </div>
      </CardContent>
    </Card>
  );
}