import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  FileBarChart,
  ListChecks,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useInsightPanel } from '@/contexts/InsightPanelContext';
import { useMetrics } from '@/contexts/MetricsContext';
import { useAgents } from '@/contexts/AgentsContext';
import { useTrackedRecommendations } from '@/contexts/TrackedRecommendationsContext';
import { InsightCard } from './InsightCard';
import { buildAssistantContext } from '@/services/assistantContext';
import { generateRichReportWithRetry } from '@/services/reportGenerationService';
import type { ReportFormat, Report } from '@/types/insight';
import type { CompletenessAnalysis } from '@/services/insightAiService';
import { analyzeReportCompleteness } from '@/services/insightAiService';
import { toast } from '@/hooks/use-toast';

const formatOptions: { value: ReportFormat; label: string; description: string; icon: typeof FileText }[] = [
  {
    value: 'full-report',
    label: 'Full Report',
    description: 'Narrative with charts and recommendations',
    icon: FileText,
  },
  {
    value: 'executive-summary',
    label: 'Executive Summary',
    description: 'One-page overview for leadership',
    icon: FileBarChart,
  },
  {
    value: 'action-plan',
    label: 'Action Plan',
    description: 'Recommendations with owners and timelines',
    icon: ListChecks,
  },
];

interface ReportBuilderProps {
  conversationId: string | null;
  conversationMessages?: { role: string; content: string }[];
  onExploreGap?: (question: string) => void;
  existingReport?: Report;
}

export function ReportBuilder({
  conversationId,
  conversationMessages = [],
  onExploreGap,
  existingReport,
}: ReportBuilderProps) {
  const navigate = useNavigate();
  const {
    insights,
    selectedInsightIds,
    reportFormat,
    reportGaps,
    setView,
    toggleInsightSelection,
    selectAllInsights,
    deselectAllInsights,
    setReportFormat,
    generateReport,
    updateReportGeneration,
    setReportGaps,
    dismissGap,
    updateReportMetadata,
  } = useInsightPanel();

  // Access app-wide context for the AI report
  const { metrics } = useMetrics();
  const { agents } = useAgents();
  const { recommendations } = useTrackedRecommendations();

  const [title, setTitle] = useState(existingReport?.title || 'Untitled Report');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CompletenessAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ message: string; percent: number }>({
    message: '',
    percent: 0,
  });
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  const selectedCount = selectedInsightIds.size;
  const allSelected = selectedCount === insights.length && insights.length > 0;

  // Run completeness analysis when entering report builder
  useEffect(() => {
    let cancelled = false;

    async function runAnalysis() {
      if (insights.length === 0) return;
      setIsAnalyzing(true);
      try {
        const selected = insights.filter((i) => selectedInsightIds.has(i.id));
        const result = await analyzeReportCompleteness(selected, conversationMessages);
        if (!cancelled) {
          setAnalysis(result);
          setReportGaps(result.gaps);
        }
      } catch {
        // Silent fail — gaps just won't show
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    }

    runAnalysis();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights.length, selectedInsightIds.size]);

  const handleGenerate = async () => {
    if (!conversationId) return;
    if (selectedCount === 0) {
      toast({
        title: 'No insights selected',
        description: 'Select at least one insight to include in the report.',
        variant: 'destructive',
      });
      return;
    }

    // Show warning if many insights selected
    if (selectedCount > 10 && !showTimeoutWarning) {
      setShowTimeoutWarning(true);
      return;
    }

    setIsGenerating(true);
    setGenerationProgress({ message: 'Starting...', percent: 0 });

    // 1. Create or update report shell
    let report: Report;
    if (existingReport) {
      // Update existing report metadata
      updateReportMetadata(existingReport.id, {
        title,
        includedInsightIds: [...selectedInsightIds],
        insights: insights.filter((i) => selectedInsightIds.has(i.id)),
        format: reportFormat,
        gaps: reportGaps,
        generationStatus: 'generating',
      });
      report = {
        ...existingReport,
        title,
        includedInsightIds: [...selectedInsightIds],
        insights: insights.filter((i) => selectedInsightIds.has(i.id)),
        format: reportFormat,
        gaps: reportGaps,
        generationStatus: 'generating',
        updatedAt: new Date().toISOString(),
      };
      setGeneratedReportId(existingReport.id);
    } else {
      // Create new report
      report = generateReport(conversationId, title);
      setGeneratedReportId(report.id);
    }

    // 2. Build the full context for the AI
    const assistantContext = buildAssistantContext(metrics, agents, recommendations);

    // 3. Kick off AI generation with retry and progress tracking
    try {
      const content = await generateRichReportWithRetry(
        {
          insights: report.insights,
          conversationMessages,
          context: assistantContext as unknown as Record<string, unknown>,
          format: report.format,
          title: report.title,
        },
        {
          onProgress: (message, percent) => {
            setGenerationProgress({ message, percent });
          },
        },
        2 // max 2 retries
      );

      // 4. Update report with generated content
      updateReportGeneration(report.id, 'complete', content);

      toast({
        title: existingReport ? 'Report updated' : 'Report generated',
        description: `"${report.title}" is ready to view.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateReportGeneration(report.id, 'error', undefined, errorMsg);

      toast({
        title: existingReport ? 'Report update failed' : 'Report generation failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setShowTimeoutWarning(false);
    }
  };

  // ─── Post-generation success state ─────────────────────────────
  if (generatedReportId) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setGeneratedReportId(null);
              setView('insights');
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {isGenerating ? 'Generating Report...' : 'Report Created'}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          {isGenerating ? (
            <>
              <div className="rounded-full bg-primary/10 p-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="w-full max-w-xs space-y-3">
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {generationProgress.message}
                  </p>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-1">
                  <Progress value={generationProgress.percent} className="h-2" />
                  <p className="text-xs text-muted-foreground/60">
                    {Math.round(generationProgress.percent)}% complete
                  </p>
                </div>

                {/* Estimated time */}
                <p className="text-xs text-muted-foreground/60">
                  {selectedCount <= 5 
                    ? 'Estimated time: 30-60 seconds'
                    : selectedCount <= 10
                    ? 'Estimated time: 1-2 minutes'
                    : 'Estimated time: 2-3 minutes'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedCount} insight{selectedCount !== 1 ? 's' : ''} included
                </p>
              </div>

              {/* Completeness score feedback */}
              {analysis && (
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Completeness</span>
                    <span className={cn(
                      'font-semibold',
                      analysis.isComplete ? 'text-emerald-600' : 'text-amber-600'
                    )}>
                      {analysis.score}/100
                    </span>
                  </div>
                  <Progress value={analysis.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* CTAs */}
              <div className="w-full space-y-2 mt-2">
                <Button
                  className="w-full"
                  onClick={() => navigate('/reports')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setGeneratedReportId(null);
                    setView('insights');
                  }}
                >
                  Back to Insights
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Report builder form ───────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setView('insights')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {existingReport ? 'Update Report' : 'Report Builder'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Report title */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Report Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
            placeholder="Enter report title..."
          />
        </div>

        {/* Completeness score (live analysis) */}
        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analyzing report completeness...
          </div>
        ) : analysis ? (
          <div className="rounded-lg border px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Completeness Score
              </span>
              <span className={cn(
                'font-semibold text-sm',
                analysis.score >= 70 ? 'text-emerald-600' : analysis.score >= 40 ? 'text-amber-600' : 'text-red-500'
              )}>
                {analysis.score}%
              </span>
            </div>
            <Progress value={analysis.score} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">{analysis.summary}</p>
          </div>
        ) : null}

        {/* Select/deselect all */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedCount} of {insights.length} insights selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={allSelected ? deselectAllInsights : selectAllInsights}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
        </div>

        {/* Insight checklist */}
        <div className="space-y-1.5">
          {insights.map((item) => (
            <InsightCard
              key={item.id}
              insight={item}
              selectable
              selected={selectedInsightIds.has(item.id)}
              onToggleSelect={toggleInsightSelection}
            />
          ))}
        </div>

        {/* Completeness agent gap suggestions */}
        {reportGaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              {reportGaps.length} suggestion{reportGaps.length !== 1 ? 's' : ''} to strengthen your report
            </div>
            {reportGaps.map((gap) => (
              <div
                key={gap.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
              >
                <div className="flex items-start gap-2">
                  <p className="text-xs text-muted-foreground flex-1">
                    {gap.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0"
                    onClick={() => dismissGap(gap.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {gap.suggestedQuestion && onExploreGap && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs mt-1.5 text-amber-600"
                    onClick={() => {
                      onExploreGap(gap.suggestedQuestion!);
                      setView('insights');
                    }}
                  >
                    Explore this
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Format picker */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Report Format
          </label>
          <div className="space-y-1.5">
            {formatOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = reportFormat === opt.value;
              return (
                <button
                  key={opt.value}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    isSelected
                      ? 'border-primary/40 bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setReportFormat(opt.value)}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div className="px-4 py-3 border-t space-y-2">
        {/* Timeout warning for many insights */}
        {showTimeoutWarning && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium">Large Report Warning</p>
                <p className="text-xs text-muted-foreground">
                  You've selected {selectedCount} insights. Reports with many insights may take 2-3 minutes to generate and could timeout.
                </p>
                <p className="text-xs text-muted-foreground">
                  Consider reducing to 10 or fewer insights for faster generation.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setShowTimeoutWarning(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={handleGenerate}
              >
                Continue Anyway
              </Button>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={selectedCount === 0 || isGenerating || showTimeoutWarning}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {existingReport ? 'Updating Report...' : 'Generating Report...'}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {existingReport ? 'Update Report with AI' : 'Generate Report with AI'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
