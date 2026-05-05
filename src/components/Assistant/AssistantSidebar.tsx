import { Plus, MessageSquare, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/assistant';

interface AssistantSidebarProps {
  conversations: Conversation[];
  currentId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export function AssistantSidebar({
  conversations,
  currentId,
  isLoading,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: AssistantSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditValue(conv.title || 'New Chat');
  };

  const handleSaveEdit = () => {
    if (editingId && onRename && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

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

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r w-64">
      {/* Header with New Chat button */}
      <div className="p-3 border-b bg-background/50 space-y-2">
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
                <div key={groupName}>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    {groupName}
                  </div>
                  <div className="space-y-1">
                    {groupConvs.map((conv) => {
                      const isActive = conv.id === currentId;
                      const isEditing = editingId === conv.id;
                      const isHovered = hoveredId === conv.id;

                      return (
                        <div
                          key={conv.id}
                          className={cn(
                            'group relative rounded-lg transition-colors',
                            isActive && 'bg-muted'
                          )}
                          onMouseEnter={() => setHoveredId(conv.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1 px-3 py-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                className="h-7 text-sm"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onSelect(conv.id)}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-lg transition-colors relative",
                                isActive
                                  ? "bg-muted"
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0 pr-8">
                                  <div className="text-sm font-medium truncate">
                                    {conv.title || 'New Chat'}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(conv.updatedAt)}
                                  </div>
                                </div>
                                {(isHovered || isActive) && (
                                  <div className="absolute right-2 top-2 flex items-center gap-0.5 bg-background/80 rounded">
                                    {onRename && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 hover:bg-muted"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(conv);
                                        }}
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(conv.id);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
