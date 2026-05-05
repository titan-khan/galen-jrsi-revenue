import { useState, useRef, useEffect } from 'react';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '@/types/assistant';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename?: (newTitle: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (renameValue.trim() && onRename) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setRenameValue(conversation.title || '');
      setIsRenaming(false);
    }
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 mx-2">
        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-md mx-2',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
        )}
        onClick={onClick}
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-1">
            {conversation.title || 'New conversation'}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(conversation.updatedAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Three-dot menu - always visible */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            {onRename && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameValue(conversation.title || '');
                  setIsRenaming(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              className="text-red-500 focus:text-red-800 focus:bg-destructive/10 hover:bg-destructive/10 dark:text-red-500 dark:focus:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its
              messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
