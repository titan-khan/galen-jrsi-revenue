import { lazy, Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Trash2,
  Clock,
  Lightbulb,
  Zap,
  BarChart3,
  AlertTriangle,
  MessageCircle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useInsightPanel } from '@/contexts/InsightPanelContext';
import { useMetrics } from '@/contexts/MetricsContext';
import { useAgents } from '@/contexts/AgentsContext';
import { useTrackedRecommendations } from '@/contexts/TrackedRecommendationsContext';
import { buildAssistantContext } from '@/services/assistantContext';
import { generateRichReport } from '@/services/reportGenerationService';
import { formatDistanceToNow } from 'date-fns';
import { ReportViewer } from '@/components/Reports/ReportViewer';
import { toast } from '@/hooks/use-toast';
import type { Report, ReportFormat, InsightType } from '@/types/insight';

const ReportGeneratingState = lazy(
  () => import('@/components/Reports/ReportGeneratingState')
);

const formatLabels: Record<ReportFormat, string> = {
  'full-report': 'Full Report',
  'executive-summary': 'Executive Summary',
  'action-plan': 'Action Plan',
};

const typeIcons: Record<InsightType, typeof Lightbulb> = {
  'key-insight': Lightbulb,
  action: Zap,
  chart: BarChart3,
};

const typeColors: Record<InsightType, string> = {
  'key-insight': 'text-amber-500 bg-amber-500/10',
  action: 'text-blue-500 bg-blue-500/10',
  chart: 'text-emerald-500 bg-emerald-500/10',
};

// ---------------------------------------------------------------------------
// Helper: Navigate to assistant with conversation context
// ---------------------------------------------------------------------------
function useNavigateToConversation() {
  const navigate = useNavigate();

  return useCallback(
    (conversationId?: string, reportId?: string) => {
      if (conversationId) {
        navigate(`/assistant/${conversationId}`, { 
          state: { 
            reportId: reportId,
          } 
        });
      } else {
        navigate('/assistant');
      }
    },
    [navigate]
  );
}

// ---------------------------------------------------------------------------
// Legacy detail view — used as fallback when report has no AI content
// ---------------------------------------------------------------------------

function ReportDetailLegacy({ report, onBack, onDelete }: { report: Report; onBack: () => void; onDelete: (id: string) => void }) {
  const navigateToConversation = useNavigateToConversation();
  const { updateReportTitle } = useInsightPanel();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(report.title);
  const timeAgo = formatDistanceToNow(new Date(report.createdAt), { addSuffix: true });

  // Calculate completeness score from gaps
  const gapCount = report.gaps.length;
  const insightCount = report.insights.length;
  const hasKeyInsight = report.insights.some((i) => i.type === 'key-insight');
  const hasAction = report.insights.some((i) => i.type === 'action');
  const hasChart = report.insights.some((i) => i.type === 'chart');
  const coverageScore = (hasKeyInsight ? 33 : 0) + (hasAction ? 33 : 0) + (hasChart ? 34 : 0);

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== report.title) {
      updateReportTitle(report.id, editedTitle.trim());
      toast({
        title: 'Title updated',
        description: 'Report title has been updated successfully.',
      });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(report.title);
    setIsEditingTitle(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        All Reports
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-xl font-semibold h-9"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                onClick={handleSaveTitle}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              {/* <h1 className="text-xl font-semibold">{report.title}</h1> */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditingTitle(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <Badge variant="secondary" className="text-xs">
              {formatLabels[report.format]}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
            <Badge
              variant={report.status === 'complete' ? 'default' : 'outline'}
              className={cn(
                'text-xs',
                report.status === 'draft' && 'text-amber-600 border-amber-300'
              )}
            >
              {report.status === 'complete' ? 'Complete' : 'Draft'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToConversation(report.conversationId)}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Continue in Chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onDelete(report.id);
              onBack();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Coverage score */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Report Coverage</span>
          <span className={cn(
            'text-sm font-semibold',
            coverageScore >= 70 ? 'text-emerald-600' : coverageScore >= 40 ? 'text-amber-600' : 'text-red-500'
          )}>
            {coverageScore}%
          </span>
        </div>
        <Progress value={coverageScore} className="h-2" />
        <div className="grid grid-cols-3 gap-3">
          {(['key-insight', 'action', 'chart'] as InsightType[]).map((type) => {
            const Icon = typeIcons[type];
            const count = report.insights.filter((i) => i.type === type).length;
            const hasType = count > 0;
            return (
              <div
                key={type}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2',
                  hasType ? 'bg-muted/30' : 'opacity-40'
                )}
              >
                <Icon className={cn('h-4 w-4', hasType ? typeColors[type].split(' ')[0] : 'text-muted-foreground')} />
                <div>
                  <p className="text-xs font-medium capitalize">
                    {type === 'key-insight' ? 'Insights' : type === 'action' ? 'Actions' : 'Charts'}
                  </p>
                  <p className="text-xs text-muted-foreground">{count} item{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gaps */}
      {gapCount > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            {gapCount} gap{gapCount !== 1 ? 's' : ''} identified
          </div>
          {report.gaps.map((gap) => (
            <div key={gap.id} className="flex items-start gap-2 text-xs text-muted-foreground pl-5">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>{gap.description}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Insight list */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Included Insights ({insightCount})
        </h2>
        {report.insights.map((insight) => {
          const Icon = typeIcons[insight.type];
          return (
            <div
              key={insight.id}
              className="flex items-start gap-3 rounded-lg border px-4 py-3"
            >
              <div className={cn('flex-shrink-0 rounded-md p-1.5', typeColors[insight.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{insight.title}</p>
                {insight.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report detail — dispatches to the right view based on generation state
// ---------------------------------------------------------------------------

function ReportDetail({
  report,
  onBack,
  onDelete,
  onRetry,
}: {
  report: Report;
  onBack: () => void;
  onDelete: (id: string) => void;
  onRetry: (report: Report) => void;
}) {
  const navigateToConversation = useNavigateToConversation();
  const { updateReportTitle, activeConversationId, insights: currentInsights } = useInsightPanel();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(report.title);

  // Check if there are new insights in the conversation that aren't in the report
  // Only check if we're viewing a report from the currently active conversation
  const isActiveConversation = activeConversationId === report.conversationId;
  const hasNewInsights = isActiveConversation && currentInsights.length > report.insights.length;

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== report.title) {
      updateReportTitle(report.id, editedTitle.trim());
      toast({
        title: 'Title updated',
        description: 'Report title has been updated successfully.',
      });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(report.title);
    setIsEditingTitle(false);
  };

  // Currently generating -> show multi-phase loading state
  if (report.generationStatus === 'generating') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          All Reports
        </Button>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ReportGeneratingState title={report.title} />
        </Suspense>
      </div>
    );
  }

  // Generation error -> show error state with retry button
  if (report.generationStatus === 'error') {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          All Reports
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Report generation failed</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {report.generationError || 'An unknown error occurred during generation.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onRetry(report)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry Generation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToConversation(report.conversationId)}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Back to Assistant
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(report.id);
                onBack();
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // AI-generated content available -> show rich report viewer
  if (report.content) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            All Reports
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToConversation(report.conversationId, report.id)}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              {hasNewInsights ? 'Update Report' : 'Continue in Chat'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-800"
              onClick={() => {
                onDelete(report.id);
                onBack();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Title with edit capability */}
        <div className="mb-4">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl font-bold h-12"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-emerald-600 hover:text-emerald-700"
                onClick={handleSaveTitle}
              >
                <Check className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleCancelEdit}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="text-2xl font-bold">{report.title}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditingTitle(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-semibold h-5 px-2 uppercase tracking-wide border-transparent ml-auto',
                  report.format === 'full-report' &&
                    'bg-primary/10 text-primary',
                  report.format === 'executive-summary' &&
                    'bg-blue-500/10 text-blue-600',
                  report.format === 'action-plan' &&
                    'bg-amber-500/10 text-amber-600',
                )}
              >
                {report.format === 'full-report' ? 'Full Report' : report.format === 'executive-summary' ? 'Executive Summary' : 'Action Plan'}
              </Badge>
            </div>
          )}
        </div>

        {/* Rich report */}
        <ReportViewer report={report} />
      </div>
    );
  }

  // Fallback: legacy card-list view for reports created before AI generation
  return (
    <ReportDetailLegacy
      report={report}
      onBack={onBack}
      onDelete={onDelete}
    />
  );
}

// ---------------------------------------------------------------------------
// Report row in list view — updated with generation status indicators
// ---------------------------------------------------------------------------

function ReportRow({
  report,
  onSelect,
  onDelete,
}: {
  report: Report;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(report.createdAt), { addSuffix: true });

  return (
    <div
      className="flex items-center gap-4 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onSelect(report.id)}
    >
      <div className={cn(
        'flex-shrink-0 rounded-md p-2.5',
        report.generationStatus === 'generating'
          ? 'bg-primary/10'
          : report.generationStatus === 'error'
            ? 'bg-red-500/10'
            : 'bg-primary/10',
      )}>
        {report.generationStatus === 'generating' ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : report.generationStatus === 'error' ? (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        ) : (
          <FileText className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{report.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {formatLabels[report.format]}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
          <span className="text-xs text-muted-foreground">
            {report.insights.length} insight{report.insights.length !== 1 ? 's' : ''}
          </span>
          {report.generationStatus === 'generating' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
              Generating...
            </Badge>
          ) : report.generationStatus === 'error' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-300">
              Failed
            </Badge>
          ) : report.content ? (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              AI Report
            </Badge>
          ) : (
            <Badge
              variant={report.status === 'complete' ? 'default' : 'outline'}
              className={cn(
                'text-[10px] px-1.5 py-0',
                report.status === 'draft' && 'text-amber-600 border-amber-300'
              )}
            >
              {report.status === 'complete' ? 'Complete' : 'Draft'}
            </Badge>
          )}
          {report.gaps.length > 0 && !report.content && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
              {report.gaps.length} gap{report.gaps.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:text-destructive flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(report.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { reports, deleteReport, updateReportGeneration } = useInsightPanel();
  const { metrics } = useMetrics();
  const { agents } = useAgents();
  const { recommendations } = useTrackedRecommendations();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const navigateToConversation = useNavigateToConversation();

  const selectedReport = selectedReportId
    ? reports.find((r) => r.id === selectedReportId)
    : null;

  // Retry report generation for a failed report
  const handleRetry = useCallback(
    async (report: Report) => {
      // 1. Set status back to 'generating'
      updateReportGeneration(report.id, 'generating');

      // 2. Build context
      const assistantContext = buildAssistantContext(metrics, agents, recommendations);

      // 3. Re-trigger AI generation
      try {
        const content = await generateRichReport({
          insights: report.insights,
          conversationMessages: [], // Conversation messages aren't stored on the report, so pass empty
          context: assistantContext as unknown as Record<string, unknown>,
          format: report.format,
          title: report.title,
        });

        updateReportGeneration(report.id, 'complete', content);

        toast({
          title: 'Report generated',
          description: `"${report.title}" is ready to view.`,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        updateReportGeneration(report.id, 'error', undefined, errorMsg);

        toast({
          title: 'Report generation failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    },
    [metrics, agents, recommendations, updateReportGeneration]
  );

  // Detail view
  if (selectedReport) {
    return (
      <ReportDetail
        report={selectedReport}
        onBack={() => setSelectedReportId(null)}
        onDelete={deleteReport}
        onRetry={handleRetry}
      />
    );
  }

  // List view
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reports generated from your chat conversations
        </p>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No reports yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Start a conversation with the Assistant, save insights, and create a report from the insight panel.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigateToConversation()}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Go to Assistant
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onSelect={setSelectedReportId}
                onDelete={deleteReport}
              />
            ))}
        </div>
      )}
    </div>
  );
}
