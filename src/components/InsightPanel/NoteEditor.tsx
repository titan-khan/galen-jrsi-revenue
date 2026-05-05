import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { InsightItem } from '@/types/insight';

interface NoteEditorProps {
  insight: InsightItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, title: string, description: string) => void;
}

export function NoteEditor({ insight, open, onClose, onSave }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Sync with insight prop
  useEffect(() => {
    if (insight) {
      setTitle(insight.title);
      
      // Normalize description: convert plain text to HTML if needed
      const desc = insight.description || '';
      let normalizedDesc = '';
      
      if (desc.trim()) {
        // Check if content is already HTML
        if (desc.includes('<') && desc.includes('>')) {
          normalizedDesc = desc;
        } else {
          // Plain text - wrap in paragraph, preserve line breaks
          const lines = desc.split('\n').filter(line => line.trim());
          normalizedDesc = lines.map(line => `<p>${line}</p>`).join('');
        }
      }
      
      setDescription(normalizedDesc);
    }
  }, [insight]);

  const handleSave = () => {
    if (insight && title.trim()) {
      // Save with HTML format (description is already HTML from RichTextEditor)
      onSave(insight.id, title.trim(), description);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!insight) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Note title..."
              autoFocus
            />
          </div>

          {/* Rich Text Editor */}
          <div className="space-y-2">
            <Label htmlFor="note-description">Note Content</Label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Write your note here... Use the toolbar to format text."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Cmd/Ctrl + Enter</kbd> to save
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
