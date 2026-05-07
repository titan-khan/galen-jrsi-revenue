import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, MessageCircle, Settings, MoreHorizontal, Pause, Play, Trash2, RotateCw, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { useSpecialistRunData } from '@/hooks/useSpecialistRunData';
import {
  updateRecommendationStatus,
  approveRecommendation,
  rejectRecommendation,
  assignRecommendation,
} from '@/services/specialistRunService';
import type { RecommendationAssignee } from '@/types/specialist';
import { MonitoringRulesEditor } from './MonitoringRulesEditor';
import { OverviewTab } from './Detail/OverviewTab';
import { InsightRecommendationTab } from './Detail/InsightRecommendationTab';
import { LogTab } from './Detail/LogTab';
import { groupByRootCause, hasCrossReferences } from '@/utils/insightGrouping';
import { SpecialistTag } from '@/components/ui/specialist-tag';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { SpecialistStatus, MonitoringRule } from '@/types/specialist';

const STATUS_CONFIG: Record<SpecialistStatus, { label: string; dotColor: string; badgeClass: string; pulse?: boolean }> = {
  active: { label: 'Aktif', dotColor: 'bg-emerald-500', badgeClass: 'text-emerald-600 bg-emerald-500/8 border-transparent', pulse: true },
  paused: { label: 'Dijeda', dotColor: 'bg-muted-foreground/40', badgeClass: 'text-muted-foreground bg-muted border-transparent' },
};

export function SpecialistDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getSpecialistById, updateSpecialist, deleteSpecialist, getDomainConfig, isLoading: isContextLoading, isValidating } = useSpecialists();
  const [activeTab, setActiveTab] = useState('overview');
  const [configOpen, setConfigOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Check if navigated from creation wizard with a run in progress
  const initialRunning = (location.state as { initialRunning?: boolean } | null)?.initialRunning ?? false;

  const specialist = getSpecialistById(id || '');

  // Live data from DB - MUST call hooks unconditionally
  const {
    insights,
    executiveSummary,
    recommendations,
    rootCauses,
    correlations,
    aiSummary,
    runHistory,
    isLoading: isDataLoading,
    isRunning,
    error: dataError,
    refetch,
    triggerRun,
  } = useSpecialistRunData(specialist?.id, initialRunning);

  // Derive grouped insight data (passed to InsightRecommendationTab for outline)
  const grouped = useMemo(() => {
    const hasRefs = hasCrossReferences(insights, recommendations, rootCauses);
    if (!hasRefs) return null;
    return groupByRootCause(rootCauses, insights, recommendations);
  }, [rootCauses, insights, recommendations]);

  // Build prefilled message for "Ask Specialist"
  const buildPrefillMessage = useCallback(() => {
    if (!specialist) return '';

    if (executiveSummary) {
      return `Deep dive into ${specialist.name}: "${executiveSummary.headline}". ${executiveSummary.keyFinding} What are the recommended next steps?`;
    }
    if (insights.length > 0) {
      return `Analyze the latest finding from ${specialist.name}: "${insights[0].headline}". What's causing this and what should we do?`;
    }
    return `What's the latest status from ${specialist.name}? Any issues I should be aware of?`;
  }, [specialist, executiveSummary, insights]);

  const handleDeepDive = useCallback((insight: { headline: string }) => {
    if (!specialist) return;
    const message = `Deep dive into this finding from ${specialist.name}: "${insight.headline}". What's the root cause, and what actions should we take?`;
    navigate('/assistant', { state: { prefillMessage: message } });
  }, [specialist, navigate]);

  // Listen for run completion events — update lastActiveAt + show toast
  useEffect(() => {
    const handleRunComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ specialistId: string; hasInsights: boolean }>;
      if (customEvent.detail.specialistId === specialist?.id) {
        // Update the "Last run" timestamp in the context so the header refreshes
        updateSpecialist(specialist.id, { lastActiveAt: new Date().toISOString() });

        toast({
          title: "Analysis Complete",
          description: customEvent.detail.hasInsights
            ? `${specialist.name} has finished analyzing your data and generated new insights.`
            : `${specialist.name} has completed the analysis.`,
          duration: 5000,
        });
      }
    };

    window.addEventListener('specialist-run-complete', handleRunComplete);
    return () => window.removeEventListener('specialist-run-complete', handleRunComplete);
  }, [specialist?.id, specialist?.name, updateSpecialist]);

  // Show loading state while context is loading
  if (isContextLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading specialist...</p>
      </div>
    );
  }

  if (!specialist) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <p className="text-sm text-muted-foreground">Specialist not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/specialists')}>
          Back to Specialists
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[specialist.status];
  const domainConfig = getDomainConfig(specialist.domain);
  const isPaused = specialist.status === 'paused';
  const pendingActionCount = recommendations.filter(r => r.status === 'proposed').length;

  const handleApprove = async (
    recId: string,
    payload: { actor: string; note?: string; assignee?: RecommendationAssignee },
  ) => {
    await approveRecommendation(recId, payload.actor, payload.note);
    if (payload.assignee) {
      await assignRecommendation(recId, payload.assignee, payload.actor);
    }
    refetch();
  };
  const handleReject = async (recId: string, payload: { actor: string; note: string }) => {
    await rejectRecommendation(recId, payload.actor, payload.note);
    refetch();
  };
  const handleReassign = async (
    recId: string,
    payload: { actor: string; assignee: RecommendationAssignee },
  ) => {
    await assignRecommendation(recId, payload.assignee, payload.actor);
    refetch();
  };
  const handleExecute = async (recId: string) => {
    await updateRecommendationStatus(recId, 'executed');
    refetch();
  };
  const handleMeasure = async (recId: string) => {
    await updateRecommendationStatus(recId, 'measured');
    refetch();
  };

  const handleTogglePause = () => {
    updateSpecialist(specialist.id, { status: isPaused ? 'active' : 'paused' });
  };

  const handleDelete = () => {
    deleteSpecialist(specialist.id);
    navigate('/specialists');
  };

  const handleAskSpecialist = () => {
    const message = buildPrefillMessage();
    navigate('/assistant', { state: { prefillMessage: message } });
  };

  const handleRunNow = () => {
    triggerRun('manual');
  };

  const handleRulesChange = (rules: MonitoringRule[]) => {
    updateSpecialist(specialist.id, { monitoringRules: rules });
  };

  return (
    <>
      <div className="flex h-[calc(100vh-48px)]">
        {/* Main: header + tabs content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border bg-background shrink-0">
            {/* Background Refresh Indicator - Requirement 2.2 */}
            {isValidating && (
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Refreshing specialist data in background...</span>
              </div>
            )}

            {/* Back + Breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => navigate('/specialists')}
                className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <button
                  onClick={() => navigate('/specialists')}
                  className="hover:text-foreground transition-colors"
                >
                  Specialists
                </button>
                <span>/</span>
                <span className="text-foreground/80 font-medium">{specialist.name}</span>
              </div>
            </div>

            {/* Name + Actions */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-lg font-semibold text-foreground leading-tight">{specialist.name}</h1>
                  <SpecialistTag handle={specialist.handle} domain={specialist.domain} size="md" />
                </div>
                <p className="text-sm text-muted-foreground/70">{specialist.description}</p>
              </div>
              <div className="flex items-center gap-2 ml-6 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-border text-muted-foreground hover:text-foreground"
                  onClick={handleRunNow}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCw className="h-3.5 w-3.5" />
                  )}
                  {isRunning ? 'Berjalan…' : 'Jalankan'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-border text-muted-foreground hover:text-foreground"
                  onClick={handleAskSpecialist}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Tanya Spesialis
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-border text-muted-foreground hover:text-foreground"
                  onClick={() => setConfigOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Konfigurasi
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={handleTogglePause}>
                      {isPaused ? (
                        <>
                          <Play className="h-3.5 w-3.5 mr-2" />
                          Lanjutkan Spesialis
                        </>
                      ) : (
                        <>
                          <Pause className="h-3.5 w-3.5 mr-2" />
                          Jeda Spesialis
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Hapus Spesialis
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Status row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground/60 mb-4">
              <Badge variant="outline" className={cn('text-xs font-medium gap-1 h-5 px-1.5', statusConfig.badgeClass)}>
                {statusConfig.pulse && (
                  <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', statusConfig.dotColor)} />
                )}
                {statusConfig.label}
              </Badge>
              {domainConfig && (
                <>
                  <span className="text-border">·</span>
                  <span className={cn('text-xs font-medium', domainConfig.colorClass)}>
                    {domainConfig.name}
                  </span>
                </>
              )}
              <span className="text-border">·</span>
              <span>
                Terakhir{' '}
                <span className="font-medium text-foreground/80">
                  {specialist.lastActiveAt
                    ? formatDistanceToNow(new Date(specialist.lastActiveAt), { addSuffix: true, locale: idLocale })
                    : 'belum pernah'}
                </span>
              </span>
              <span className="text-border">·</span>
              <span>
                Dibuat {format(new Date(specialist.createdAt), 'd MMM yyyy', { locale: idLocale })}
              </span>
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Ikhtisar</TabsTrigger>
                <TabsTrigger value="insights" className="gap-1.5">
                  Insight & Aksi
                  {pendingActionCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-xs font-semibold text-white leading-none">
                      {pendingActionCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="log">Riwayat</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto" data-scroll-container>
            {/* Initial Run Loading Banner */}
            {isRunning && !executiveSummary && insights.length === 0 && (
              <div className="mx-6 mt-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="relative">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1.5">
                      Generating Initial Insights
                    </h3>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                      {specialist.name} is analyzing your data and generating insights. This usually takes 30-60 seconds.
                      The page will automatically update when complete.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Processing metrics</span>
                      </div>
                      <span className="text-blue-400/40">•</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:200ms]" />
                        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Analyzing patterns</span>
                      </div>
                      <span className="text-blue-400/40">•</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:400ms]" />
                        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Generating recommendations</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="overview" className="mt-0 px-6 pt-6">
                <OverviewTab
                  specialistId={specialist.id}
                  executiveSummary={executiveSummary}
                  rootCauses={rootCauses}
                  recommendations={recommendations}
                  insights={insights}
                  isLoading={isDataLoading}
                  isRunning={isRunning}
                  hasAnyInsights={insights.length > 0 || !!executiveSummary}
                  onNavigateToInsights={() => setActiveTab('insights')}
                />
              </TabsContent>

              <TabsContent value="insights" className="mt-0">
                <InsightRecommendationTab
                  specialist={specialist}
                  insights={insights}
                  executiveSummary={executiveSummary}
                  recommendations={recommendations}
                  rootCauses={rootCauses}
                  correlations={correlations}
                  grouped={grouped}
                  isLoading={isDataLoading}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onReassign={handleReassign}
                  onExecute={handleExecute}
                  onMeasure={handleMeasure}
                  onDeepDive={handleDeepDive}
                  onRunNow={handleRunNow}
                  isRunning={isRunning}
                />
              </TabsContent>

              <TabsContent value="log" className="mt-0 px-6 pt-6">
                <LogTab
                  specialistId={specialist.id}
                  runHistory={runHistory}
                  onReviewClick={() => setActiveTab('insights')}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Configure Sheet */}
      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Configure {specialist.name}</SheetTitle>
          </SheetHeader>
          <MonitoringRulesEditor
            rules={specialist.monitoringRules || []}
            onChange={handleRulesChange}
            availableMetrics={[...(specialist.metrics || []), ...(specialist.drivers || [])]}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {specialist.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this specialist and all its monitoring rules, insights, and recommendations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
