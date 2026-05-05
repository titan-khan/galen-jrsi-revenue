import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ConversationItem } from './ConversationItem';
import type { Conversation } from '@/types/assistant';

interface CollapsibleHistoryGroupProps {
  groupName: string;
  conversations: Conversation[];
  currentId: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
}

export function CollapsibleHistoryGroup({
  groupName,
  conversations,
  currentId,
  isExpanded,
  onToggle,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}: CollapsibleHistoryGroupProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-300',
              isExpanded ? 'rotate-0' : '-rotate-90'
            )}
          />
          <span>{groupName}</span>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="transition-all duration-300 data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
        <div className="space-y-1 py-1">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentId}
              onClick={() => onSelectConversation(conversation.id)}
              onDelete={() => onDeleteConversation(conversation.id)}
              onRename={
                onRenameConversation
                  ? (newTitle) => onRenameConversation(conversation.id, newTitle)
                  : undefined
              }
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
