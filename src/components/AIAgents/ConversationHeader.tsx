import { Menu, Copy, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Agent, AgentArtifact } from '@/types/agent';
import { cn } from '@/lib/utils';

interface ConversationHeaderProps {
  agent: Agent;
  sessionCount?: number;
  selectedArtifact?: AgentArtifact | null;
  onBack: () => void;
  onCloseDetail?: () => void;
  onManage?: () => void;
}

export function ConversationHeader({ 
  agent, 
  sessionCount = 1, 
  selectedArtifact,
  onBack,
  onCloseDetail,
  onManage 
}: ConversationHeaderProps) {
  return (
    <div className="flex items-center h-14 border-b bg-background shrink-0">
      {/* Left side - Agent info */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-full",
        selectedArtifact ? "flex-1" : "flex-1"
      )}>
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-foreground truncate">{agent.name}</h1>
          <p className="text-xs text-muted-foreground truncate max-w-md">
            {agent.goal || agent.description}
          </p>
        </div>

        {/* Session count and Manage - only show when no artifact selected */}
        {!selectedArtifact && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Copy className="h-4 w-4" />
              <span className="text-sm">{sessionCount}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onManage}>
              Manage
            </Button>
          </div>
        )}
      </div>

      {/* Right side - Detail panel title when artifact is selected */}
      {selectedArtifact && (
        <div className="flex-1 flex items-center gap-3 px-4 h-full border-l">
          <Button variant="ghost" size="icon" onClick={onCloseDetail} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-foreground truncate">{selectedArtifact.title}</h2>
        </div>
      )}
    </div>
  );
}
