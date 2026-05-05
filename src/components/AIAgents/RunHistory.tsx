import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AgentRun } from '@/types/agent';
import { Clock, Play, AlertTriangle, Calendar, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RunHistoryProps {
  agentId: string;
  runs?: AgentRun[];
}

// Demo runs data
const generateDemoRuns = (agentId: string): AgentRun[] => [
  {
    id: 'run-1',
    agentId,
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    trigger: 'scheduled',
    summary: 'Identified 3 key insights and 2 action recommendations',
    findingsCount: 3,
    actionsExecuted: 2,
    anomaliesDetected: 0,
  },
  {
    id: 'run-2',
    agentId,
    startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 25.5 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    trigger: 'manual',
    summary: 'Deep analysis of margin trends completed',
    findingsCount: 5,
    actionsExecuted: 1,
    anomaliesDetected: 1,
  },
  {
    id: 'run-3',
    agentId,
    startedAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 49.8 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    trigger: 'anomaly-detected',
    summary: 'Investigated sudden spike in return rate',
    findingsCount: 2,
    actionsExecuted: 3,
    anomaliesDetected: 1,
  },
  {
    id: 'run-4',
    agentId,
    startedAt: new Date(Date.now() - 74 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 73.7 * 60 * 60 * 1000).toISOString(),
    status: 'failed',
    trigger: 'scheduled',
    summary: 'Data source connection timeout',
    findingsCount: 0,
    actionsExecuted: 0,
    anomaliesDetected: 0,
  },
  {
    id: 'run-5',
    agentId,
    startedAt: new Date(Date.now() - 98 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 97.5 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    trigger: 'scheduled',
    summary: 'Regular monitoring check - no anomalies detected',
    findingsCount: 1,
    actionsExecuted: 0,
    anomaliesDetected: 0,
  },
];

const statusConfig = {
  running: { label: 'Running', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

const triggerConfig = {
  scheduled: { label: 'Scheduled', icon: Calendar },
  manual: { label: 'Manual', icon: Play },
  'anomaly-detected': { label: 'Anomaly', icon: AlertTriangle },
};

export function RunHistory({ agentId, runs }: RunHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'manual' | 'anomaly-detected'>('all');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const allRuns = runs || generateDemoRuns(agentId);
  const filteredRuns = filter === 'all' ? allRuns : allRuns.filter(run => run.trigger === filter);

  const getDuration = (run: AgentRun) => {
    if (!run.completedAt) return 'In progress...';
    const start = new Date(run.startedAt).getTime();
    const end = new Date(run.completedAt).getTime();
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Run History</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter by trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Runs</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="anomaly-detected">Anomaly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Time</TableHead>
              <TableHead className="w-[100px]">Trigger</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Duration</TableHead>
              <TableHead className="text-center w-[60px]">Findings</TableHead>
              <TableHead className="text-center w-[60px]">Actions</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRuns.map((run) => {
              const status = statusConfig[run.status];
              const trigger = triggerConfig[run.trigger];
              const StatusIcon = status.icon;
              const TriggerIcon = trigger.icon;
              const isExpanded = expandedRunId === run.id;

              return (
                <>
                  <TableRow 
                    key={run.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                  >
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TriggerIcon className="h-3.5 w-3.5" />
                        {trigger.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${status.color}`}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${run.status === 'running' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {getDuration(run)}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {run.findingsCount || 0}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {run.actionsExecuted || 0}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${run.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-muted/30 py-3">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Summary:</span> {run.summary}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
        
        {filteredRuns.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No runs found matching this filter
          </div>
        )}
      </CardContent>
    </Card>
  );
}
