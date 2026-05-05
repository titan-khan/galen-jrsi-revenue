import { MessageSquare, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ConversationItem } from './ConversationItem';
import type { Conversation } from '@/types/assistant';

interface ConversationSelectorProps {
  conversations: Conversation[];
  currentId: string | null;
  currentTitle: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export function ConversationSelector({
  conversations,
  currentId,
  currentTitle,
  isLoading,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ConversationSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="max-w-[240px] justify-start gap-2 font-normal"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {currentTitle || 'New Chat'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <div className="py-1">
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === currentId}
                  onClick={() => onSelect(conv.id)}
                  onDelete={() => onDelete(conv.id)}
                  onRename={onRename ? (newTitle) => onRename(conv.id, newTitle) : undefined}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
