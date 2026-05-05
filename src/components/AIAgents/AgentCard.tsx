import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Agent, AgentCategory, AgentStatus } from '@/types/agent';
import {
  UserCheck,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  Calculator,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle2,
  Zap,
  Search,
  HeartPulse,
  PackageX,
  BarChart3,
  Briefcase,
  Target,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UserCheck,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  Calculator,
  AlertTriangle,
  Activity,
  Clock,
  Search,
  HeartPulse,
  PackageX,
  BarChart3,
  Briefcase,
  Target,
};

const categoryConfig: Record<AgentCategory, { label: string; color: string }> = {
  product: { label: 'Product', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  revenue: { label: 'Revenue', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  operations: { label: 'Operations', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  risk: { label: 'Risk', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
};

const statusConfig: Record<AgentStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  'needs-input': { label: 'Needs Input', color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: AlertTriangle },
  running: { label: 'Running', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Zap },
  paused: { label: 'Paused', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
};

const categoryBorderColors: Record<AgentCategory, string> = {
  product: 'border-l-blue-500',
  revenue: 'border-l-emerald-500',
  operations: 'border-l-purple-500',
  risk: 'border-l-amber-500',
};

interface AgentCardProps {
  agent: Agent;
  templateIcon?: string;
}

const formatNextRun = (nextRunAt?: string, schedule?: Agent['schedule']) => {
  if (!schedule?.enabled) return null;
  
  if (schedule.frequency === 'continuous') {
    return 'Continuous';
  }
  
  if (nextRunAt) {
    return formatDistanceToNow(new Date(nextRunAt), { addSuffix: true });
  }
  
  // Generate approximate next run time
  const frequencyLabels = {
    hourly: 'Every hour',
    daily: `Daily at ${schedule.hour?.toString().padStart(2, '0')}:00`,
    weekly: `Weekly on ${schedule.dayOfWeek}`,
  };
  
  return frequencyLabels[schedule.frequency] || 'Scheduled';
};

export function AgentCard({ agent, templateIcon }: AgentCardProps) {
  const navigate = useNavigate();
  const Icon = templateIcon ? iconMap[templateIcon] : Activity;
  const category = categoryConfig[agent.category];
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;
  const borderColor = categoryBorderColors[agent.category];
  
  const nextRunText = formatNextRun(agent.nextRunAt, agent.schedule);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${borderColor}`}
      onClick={() => navigate(`/ai-agents/${agent.id}`)}
    >
      <CardContent className="p-4">
        {/* Monitoring Status Indicator */}
        {(agent.isMonitoring || (agent.schedule?.enabled && !agent.isMonitoring)) && (
          <div className="flex items-center gap-2 mb-3">
            {agent.isMonitoring ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Monitoring
              </div>
            ) : agent.schedule?.enabled ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {agent.schedule.frequency === 'continuous' ? (
                  <RefreshCw className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                {nextRunText}
              </div>
            ) : null}
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground leading-tight">{agent.name}</h3>
              <Badge variant="outline" className={`mt-1 text-xs ${category.color}`}>
                {category.label}
              </Badge>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs flex items-center gap-1 ${status.color}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {agent.description}
        </p>

        {/* Metrics Row - Updated with trust score */}
        <div className="grid grid-cols-4 gap-2 text-xs border-t pt-3">
          <div>
            <span className="text-muted-foreground block">Last Run</span>
            <span className="font-medium text-foreground">{agent.lastRunAt || 'Never'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Runs</span>
            <span className="font-medium text-foreground">{agent.totalRuns ?? agent.actionsCount ?? 0}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Success</span>
            <span className="font-medium text-foreground">{agent.successRate ?? 0}%</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Trust</span>
            <span className="font-medium text-foreground">{agent.trustScore ?? 0}%</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
          Created by {agent.createdBy} • {agent.createdAt}
        </div>
      </CardContent>
    </Card>
  );
}
