import { Skeleton } from '@/components/ui/skeleton';

export function AgentDetailSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      {/* Conversation Header */}
      <div className="p-4 border-b">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b bg-muted/30">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-3 w-16 mx-auto mb-2" />
            <Skeleton className="h-5 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Thinking Stream - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}