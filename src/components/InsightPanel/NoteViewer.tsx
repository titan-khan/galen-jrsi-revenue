import { Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { InsightItem } from '@/types/insight';

interface NoteViewerProps {
  insight: InsightItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (insight: InsightItem) => void;
}

export function NoteViewer({ insight, open, onClose, onEdit }: NoteViewerProps) {
  if (!insight) return null;

  // Manual note: created by user (no source message) and explicitly not auto-detected
  const isManualNote = insight.autoDetected === false && !insight.sourceMessageId;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{insight.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          {insight.description ? (
            <div 
              className="prose prose-base max-w-none"
              dangerouslySetInnerHTML={{ __html: insight.description }}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">No content</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          {isManualNote && (
            <Button size="sm" onClick={() => {
              onClose();
              onEdit(insight);
            }}>
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
