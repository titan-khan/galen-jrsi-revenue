import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AgentArtifact } from '@/types/agent';
import { AlertTriangle, Lightbulb, ArrowRight, TrendingUp, Grid3X3, Target, Shield } from 'lucide-react';

const artifactConfig = {
  'root-cause': {
    icon: AlertTriangle,
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-500/10 text-amber-600',
    label: 'Root Cause',
  },
  'proposed-action': {
    icon: Lightbulb,
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-500/10 text-blue-600',
    label: 'Proposed Action',
  },
  insight: {
    icon: Lightbulb,
    borderColor: 'border-l-purple-500',
    iconBg: 'bg-purple-500/10 text-purple-600',
    label: 'Insight',
  },
  chart: {
    icon: Lightbulb,
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    label: 'Visualization',
  },
  table: {
    icon: Lightbulb,
    borderColor: 'border-l-gray-500',
    iconBg: 'bg-gray-500/10 text-gray-600',
    label: 'Data Table',
  },
  simulation: {
    icon: TrendingUp,
    borderColor: 'border-l-cyan-500',
    iconBg: 'bg-cyan-500/10 text-cyan-600',
    label: 'Monte Carlo Simulation',
  },
  framework: {
    icon: Target,
    borderColor: 'border-l-rose-500',
    iconBg: 'bg-rose-500/10 text-rose-600',
    label: 'Strategic Framework',
  },
  'bcg-matrix': {
    icon: Grid3X3,
    borderColor: 'border-l-indigo-500',
    iconBg: 'bg-indigo-500/10 text-indigo-600',
    label: 'BCG Matrix',
  },
  'porter-five-forces': {
    icon: Shield,
    borderColor: 'border-l-orange-500',
    iconBg: 'bg-orange-500/10 text-orange-600',
    label: "Porter's Five Forces",
  },
  'swot': {
    icon: Grid3X3,
    borderColor: 'border-l-teal-500',
    iconBg: 'bg-teal-500/10 text-teal-600',
    label: 'SWOT Analysis',
  },
};

interface ActionCardProps {
  artifact: AgentArtifact;
  onViewDetails: (artifact: AgentArtifact) => void;
}

export function ActionCard({ artifact, onViewDetails }: ActionCardProps) {
  const config = artifactConfig[artifact.type] || artifactConfig.insight;
  const Icon = config.icon;

  const isActionable = artifact.type === 'proposed-action';

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {config.label}
              </span>
            </div>
            <h4 className="font-medium text-foreground">{artifact.title}</h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {artifact.description}
            </p>

            {artifact.metrics && artifact.metrics.length > 0 && (
              <div className="flex gap-4 mt-3">
                {artifact.metrics.map((metric, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-muted-foreground">{metric.label}: </span>
                    <span className="font-medium text-foreground">{metric.value}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="mt-3 -ml-2"
              onClick={() => onViewDetails(artifact)}
            >
              {isActionable ? 'Review & Approve' : 'View Details'}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
