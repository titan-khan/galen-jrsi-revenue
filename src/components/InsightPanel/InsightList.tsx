import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInsightPanel } from '@/contexts/InsightPanelContext';
import { InsightCard } from './InsightCard';
import { NoteEditor } from './NoteEditor';
import { NoteViewer } from './NoteViewer';
import type { InsightItem } from '@/types/insight';

const TOP_N = 3;

interface InsightListProps {
  onScrollToMessage?: (messageId: string) => void;
}

export function InsightList({ onScrollToMessage }: InsightListProps) {
  const { insights, isExpanded, setExpanded, removeInsight, updateInsight } = useInsightPanel();
  const [viewingInsight, setViewingInsight] = useState<InsightItem | null>(null);
  const [editingInsight, setEditingInsight] = useState<InsightItem | null>(null);

  const handleSaveNote = (id: string, title: string, description: string) => {
    updateInsight(id, { title, description });
  };

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Insights will appear here as you explore your data
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Pin items from the chat or let the assistant auto-detect them
        </p>
      </div>
    );
  }

  const visible = isExpanded ? insights : insights.slice(0, TOP_N);
  const hiddenCount = insights.length - TOP_N;

  return (
    <>
      <div className="space-y-2">
        {visible.map((item) => (
          <InsightCard
            key={item.id}
            insight={item}
            onRemove={removeInsight}
            onEdit={setEditingInsight}
            onClick={(id) => {
              const insight = insights.find((i) => i.id === id);
              if (insight) {
                // Manual note: created by user (no source message) and explicitly not auto-detected
                const isManualNote = insight.autoDetected === false && !insight.sourceMessageId;
                
                if (isManualNote) {
                  // Manual note: show viewer modal
                  setViewingInsight(insight);
                } else {
                  // Auto-detected or pinned insights: scroll to message
                  if (insight.sourceMessageId) {
                    onScrollToMessage?.(insight.sourceMessageId);
                  }
                }
              }
            }}
          />
        ))}

        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {hiddenCount} more
              </>
            )}
          </Button>
        )}
      </div>

      {/* Note Viewer Modal (read-only) */}
      <NoteViewer
        insight={viewingInsight}
        open={!!viewingInsight}
        onClose={() => setViewingInsight(null)}
        onEdit={(insight) => {
          setViewingInsight(null);
          setEditingInsight(insight);
        }}
      />

      {/* Note Editor Modal */}
      <NoteEditor
        insight={editingInsight}
        open={!!editingInsight}
        onClose={() => setEditingInsight(null)}
        onSave={handleSaveNote}
      />
    </>
  );
}
