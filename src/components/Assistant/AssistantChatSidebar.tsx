import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { CollapsibleHistoryGroup } from './CollapsibleHistoryGroup';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { useCollapsibleGroups } from '@/hooks/useCollapsibleGroups';
import type { Conversation } from '@/types/assistant';

interface AssistantChatSidebarProps {
  conversations: Conversation[];
  currentId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function AssistantChatSidebar({
  conversations,
  currentId,
  isLoading,
  onSelect,
  onNew,
  onDelete,
  onRename,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: AssistantChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Define group order
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];
  
  // Initialize collapsible groups hook with default expanded groups
  const { isGroupExpanded, toggleGroup } = useCollapsibleGroups(
    groupOrder,
    ['Today', 'Yesterday']
  );

  // Check if in search mode
  const isSearchMode = searchQuery.trim().length > 0;

  // Filter conversations based on search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter((conv) =>
        (conv.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((groups, conv) => {
    const date = new Date(conv.updatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let group = 'Older';
    if (diffDays === 0) group = 'Today';
    else if (diffDays === 1) group = 'Yesterday';
    else if (diffDays < 7) group = 'Previous 7 Days';
    else if (diffDays < 30) group = 'Previous 30 Days';

    if (!groups[group]) groups[group] = [];
    groups[group].push(conv);
    return groups;
  }, {} as Record<string, Conversation[]>);

  return (
    <div className="flex flex-col h-full bg-background border-r w-64">
      {/* Header with New Chat button */}
      <div className="p-3 border-b bg-background space-y-2">
        <Button
          onClick={onNew}
          className="w-full justify-start gap-2 font-medium"
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations found
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {groupOrder.map((groupName) => {
              const groupConvs = groupedConversations[groupName];
              if (!groupConvs || groupConvs.length === 0) return null;

              return (
                <CollapsibleHistoryGroup
                  key={groupName}
                  groupName={groupName}
                  conversations={groupConvs}
                  currentId={currentId}
                  isExpanded={isGroupExpanded(groupName)}
                  onToggle={() => toggleGroup(groupName)}
                  onSelectConversation={onSelect}
                  onDeleteConversation={onDelete}
                  onRenameConversation={onRename}
                />
              );
            })}
            
            {/* LoadMoreIndicator - only show when not in search mode */}
            {!isSearchMode && (
              <LoadMoreIndicator
                isLoading={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={onLoadMore}
              />
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
