import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Loader2, XCircle, RefreshCw, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillError {
  code: string;
  message: string;
  retryable: boolean;
}

interface SkillProgress {
  phase: 'preparing' | 'querying' | 'executing' | 'streaming' | 'completing';
  percentComplete: number;
  chunksReceived: number;
  tokensEstimate: number;
}

interface SkillExecutionStatusProps {
  isExecuting: boolean;
  progress: SkillProgress;
  error: SkillError | null;
  onCancel: () => void;
  onRetry: () => void;
}

const phaseLabels: Record<string, string> = {
  preparing: 'Preparing request...',
  querying: 'Querying database...',
  executing: 'Sending to Claude...',
  streaming: 'Generating output...',
  completing: 'Finalizing...',
};

export function SkillExecutionStatus({
  isExecuting,
  progress,
  error,
  onCancel,
  onRetry,
}: SkillExecutionStatusProps) {
  // Nothing to show when idle and no error
  if (!isExecuting && !error) return null;

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-destructive">Execution Failed</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {error.code}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              {error.retryable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={onRetry}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Executing state
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {phaseLabels[progress.phase] || 'Processing...'}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {progress.chunksReceived > 0 && (
                    <>~{progress.tokensEstimate.toLocaleString()} tokens</>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-muted-foreground hover:text-destructive"
                  onClick={onCancel}
                >
                  <StopCircle className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
            <Progress value={progress.percentComplete} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
