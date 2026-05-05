import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  X,
  Plus,
  Download,
  FileText,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useInsightPanel } from '@/contexts/InsightPanelContext';
import { InsightList } from './InsightList';
import { ReportBuilder } from './ReportBuilder';
import { toast } from '@/hooks/use-toast';
import type { Report as InsightReport } from '@/types/insight';

interface InsightPanelProps {
  conversationId: string | null;
  /** Raw conversation messages for completeness analysis */
  conversationMessages?: { role: string; content: string }[];
  onScrollToMessage?: (messageId: string) => void;
  onExploreGap?: (question: string) => void;
  reportId?: string;
}

export function InsightPanel({
  conversationId,
  conversationMessages = [],
  onScrollToMessage,
  onExploreGap,
  reportId,
}: InsightPanelProps) {
  const navigate = useNavigate();
  const { view, insights, setView, addInsight, getReportByConversationId, isLoading: contextLoading } = useInsightPanel();
  const [prevCount, setPrevCount] = useState(0);
  const [isNewInsight, setIsNewInsight] = useState(false);

  const insightCount = insights.length;

  // Check if there's an existing report for this conversation
  const existingReport: InsightReport | undefined = conversationId ? getReportByConversationId(conversationId) : undefined;
  
  // Check if there are new or different insights compared to the report
  // We need to compare insight IDs, not just length
  const hasNewInsights = !contextLoading && existingReport && (() => {
    const reportInsightIds = new Set(existingReport.includedInsightIds);
    const currentInsightIds = new Set(insights.map(i => i.id));
    
    // Check if there are any new insights (in current but not in report)
    const hasNew = insights.some(i => !reportInsightIds.has(i.id));
    
    // Check if there are any removed insights (in report but not in current)
    const hasRemoved = existingReport.includedInsightIds.some(id => !currentInsightIds.has(id));
    
    return hasNew || hasRemoved;
  })();

  // Pulse animation when a new insight is added
  useEffect(() => {
    if (insightCount > prevCount && prevCount > 0) {
      setIsNewInsight(true);
      const timer = setTimeout(() => setIsNewInsight(false), 2000);
      return () => clearTimeout(timer);
    }
    setPrevCount(insightCount);
  }, [insightCount, prevCount]);

  // ─── State 1: Collapsed — floating badge ─────────────────────
  if (view === 'collapsed') {
    return (
      <button
        onClick={() => setView('insights')}
        className={cn(
          'fixed right-5 top-1/2 -translate-y-1/2 z-40',
          'flex items-center gap-2 rounded-full border bg-background shadow-lg pl-3 pr-4 py-2.5',
          'hover:bg-muted/50 hover:shadow-xl transition-all duration-200',
          'group',
          isNewInsight && 'animate-bounce',
        )}
      >
        {/* Glowing dot indicator - only show when there are insights */}
        {insightCount > 0 && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
        )}

        <Lightbulb className="h-4 w-4 text-amber-500" />

        <span className="text-xs font-semibold tabular-nums">
          {insightCount}
        </span>

        <span className="text-xs text-muted-foreground hidden group-hover:inline-flex items-center gap-0.5 ml-0.5">
          insight{insightCount !== 1 ? 's' : ''}
          <ChevronRight className="h-3 w-3" />
        </span>
      </button>
    );
  }

  // ─── State 3: Report builder ─────────────────────────────────
  if (view === 'report-builder') {
    return (
      <aside className="w-80 border-l bg-background flex flex-col h-full">
        <ReportBuilder
          conversationId={conversationId}
          conversationMessages={conversationMessages}
          onExploreGap={onExploreGap}
          existingReport={existingReport as InsightReport | undefined}
        />
      </aside>
    );
  }

  // ─── State 2: Expanded insight list ──────────────────────────
  return (
    <aside className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">
            Insights{insightCount > 0 ? ` (${insightCount})` : ''}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setView('collapsed')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Insight list */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-3">
          <InsightList onScrollToMessage={onScrollToMessage} />
        </div>

        {/* Manual note button - always show */}
        <Separator />
        <div className="px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground justify-start"
            onClick={() => {
              addInsight({
                type: 'key-insight',
                title: 'New note',
                description: '',
                sourceMessageId: '',
                autoDetected: false,
              });
              toast({
                title: 'Note added',
                description: 'Edit the note title in the sidebar.',
              });
            }}
          >
            {/* <Plus className="h-3 w-3 mr-1.5" />
            Add your own note */}
          </Button>
        </div>
      </ScrollArea>

      {/* Bottom actions */}
      {insightCount > 0 && (
        <div className="px-3 py-3 border-t space-y-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              const text = insights
                .map((i) => `[${i.type}] ${i.title}${i.description ? ': ' + i.description : ''}`)
                .join('\n');
              navigator.clipboard.writeText(text);
              toast({
                title: 'Copied',
                description: 'All insights copied to clipboard.',
              });
            }}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Export insights
          </Button>
          
          {/* Dynamic button based on report state */}
          {contextLoading ? (
            // Still loading - show disabled button
            <Button
              size="sm"
              className="w-full"
              disabled
            >
              <FileText className="h-3.5 w-3.5 mr-2" />
              Loading...
            </Button>
          ) : existingReport && !hasNewInsights ? (
            // Case 1: Report exists, no new insights -> View Report
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/reports', { state: { selectedReportId: existingReport.id } })}
            >
              <Eye className="h-3.5 w-3.5 mr-2" />
              View Report
            </Button>
          ) : existingReport && hasNewInsights ? (
            // Case 2: Report exists, has new insights -> Update Report
            <Button
              size="sm"
              className="w-full"
              onClick={() => setView('report-builder')}
            >
              <FileText className="h-3.5 w-3.5 mr-2" />
              Update Report
            </Button>
          ) : (
            // Case 3: No report exists -> Create Report
            <Button
              size="sm"
              className="w-full"
              onClick={() => setView('report-builder')}
            >
              <FileText className="h-3.5 w-3.5 mr-2" />
              Create Report
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
