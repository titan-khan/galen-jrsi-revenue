import { Bot, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAgents } from '@/contexts/AgentsContext';
import { useMetrics } from '@/contexts/MetricsContext';

interface SourceAttributionProps {
  content: string;
  className?: string;
}

interface Source {
  type: 'agent' | 'metric';
  name: string;
  id?: string;
}

export function SourceAttribution({ content, className }: SourceAttributionProps) {
  const { agents } = useAgents();
  const { metrics } = useMetrics();

  // Extract @mentions from content
  const mentionRegex = /@([\w\s-]+?)(?=\s|$|@|\.|,|!|\?)/g;
  const mentions = new Set<string>();
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.add(match[1].trim().toLowerCase());
  }

  // Match mentions to agents and metrics
  const sources: Source[] = [];
  
  mentions.forEach((mention) => {
    const agent = agents.find((a) => a.name.toLowerCase() === mention);
    if (agent) {
      sources.push({ type: 'agent', name: agent.name, id: agent.id });
      return;
    }
    
    const metric = metrics.find((m) => m.name.toLowerCase() === mention);
    if (metric) {
      sources.push({ type: 'metric', name: metric.name, id: metric.id });
    }
  });

  if (sources.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      <span className="text-xs text-muted-foreground">Consulted:</span>
      {sources.map((source, idx) => {
        const Icon = source.type === 'agent' ? Bot : BarChart3;
        const linkTo = source.type === 'agent' 
          ? `/ai-agents/${source.id}` 
          : `/metrics`;
        
        return (
          <Link
            key={`${source.type}-${source.name}-${idx}`}
            to={linkTo}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
              source.type === 'agent'
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25'
                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25'
            )}
          >
            <Icon className="h-3 w-3" />
            <span>@{source.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
