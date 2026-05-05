import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Database,
  Sheet,
  Globe,
  Snowflake,
  Server,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConnectorDefinition } from '@/types/dataConnector';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  FileSpreadsheet,
  Database,
  Sheet,
  Globe,
  Snowflake,
  Server,
};

interface ConnectorCardProps {
  connector: ConnectorDefinition;
}

export function ConnectorCard({ connector }: ConnectorCardProps) {
  const navigate = useNavigate();
  const isAvailable = connector.status === 'available';
  const Icon = ICON_MAP[connector.iconName] || Database;

  const handleClick = () => {
    if (!isAvailable) return;
    if (connector.id === 'csv-upload') {
      navigate('/data-connector/csv-upload');
    }
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border bg-card p-5 flex flex-col',
        'transition-all duration-200',
        isAvailable
          ? 'cursor-pointer hover:shadow-sm hover:bg-accent/30'
          : 'opacity-60 cursor-default',
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn(
        'h-10 w-10 rounded-lg flex items-center justify-center mb-4',
        isAvailable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Name + Badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="text-[13px] font-semibold text-foreground">
          {connector.name}
        </h3>
        {isAvailable ? (
          <Badge variant="outline" className="text-[10px] font-medium text-emerald-600 border-emerald-200 bg-emerald-50 px-1.5 py-0">
            Available
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border px-1.5 py-0">
            Coming Soon
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]">
        {connector.description}
      </p>

      {/* Action */}
      <div className="mt-auto">
        {isAvailable ? (
          <Button size="sm" className="h-8 gap-1.5 text-[12px] w-full">
            Connect
            <ArrowRight className="h-3 w-3" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-8 text-[12px] w-full" disabled>
            Coming Soon
          </Button>
        )}
      </div>
    </div>
  );
}
