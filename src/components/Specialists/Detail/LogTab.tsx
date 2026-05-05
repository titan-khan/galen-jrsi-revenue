import { ActivityLogTable } from './ActivityLogTable';
import type { AgentRun } from '@/types/agent';

interface LogTabProps {
  specialistId: string;
  runHistory?: AgentRun[];
  onReviewClick?: () => void;
}

export function LogTab({ specialistId, runHistory, onReviewClick }: LogTabProps) {
  return (
    <div className="space-y-6">
      <ActivityLogTable
        specialistId={specialistId}
        runHistory={runHistory}
        onReviewClick={onReviewClick}
      />
    </div>
  );
}
