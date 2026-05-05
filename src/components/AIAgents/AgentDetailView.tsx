import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConversationHeader } from './ConversationHeader';
import { ThinkingStream, ThinkingStreamHandle } from './ThinkingStream';
import { DetailPanel } from './DetailPanel';
import { MessageInput } from './MessageInput';
import { AgentDetailSkeleton } from './AgentDetailSkeleton';
import { PlanCard, PlanSkeleton } from './AnalysisPlan';
import { RunHistory } from './RunHistory';
import { AnomalyAlerts } from './AnomalyAlerts';
import { AgentSettings } from './AgentSettings';
import { useAgents } from '@/contexts/AgentsContext';
import { AgentArtifact, AnalysisCompletionStatus, AnalysisSummary, AnalysisSummaryItem, AgentPhase, AnalysisPlan, ActionRecommendations, ActionRecommendation, DataGapProposal } from '@/types/agent';
import { BarChart3, Play, Pause, History, AlertTriangle as AlertTriangleIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useMetrics } from '@/contexts/MetricsContext';
import { generateAnalysisPlan } from '@/utils/planGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Helper to generate summary from demo steps (findings only, no action items)
const generateSummaryFromSteps = (agentId?: string): AnalysisSummary => {
  const keyFindings: AnalysisSummaryItem[] = [];

  if (agentId === 'agent-5') {
    keyFindings.push(
      {
        id: 'finding-1',
        stepId: 'step-1',
        title: 'Critical Friction Point in Debit Activation',
        type: 'finding',
        priority: 'high',
        confidence: 'high',
        description: 'App shows "Success" but backend takes 15 minutes to update, causing customer callbacks and trust erosion.',
        dataSources: ['App Analytics', 'Call Center Logs'],
      },
      {
        id: 'finding-2',
        stepId: 'step-4',
        title: 'VRIO Analysis: Organization Gap',
        type: 'finding',
        priority: 'high',
        confidence: 'high',
        description: 'Frontend and backend are not synchronized to deliver the "instant activation" promise.',
        dataSources: ['System Architecture Review'],
      },
      {
        id: 'finding-3',
        stepId: 'step-2',
        title: 'Trust Debt Compounds Monthly',
        type: 'finding',
        priority: 'medium',
        confidence: 'medium',
        description: 'Monte Carlo simulation shows Quick Fix creates compounding trust issues leading to -$2.4M by Q4.',
        dataSources: ['Financial Models', 'Churn Data'],
      }
    );
  } else if (agentId === 'agent-6') {
    keyFindings.push(
      {
        id: 'finding-1',
        stepId: 'step-3',
        title: 'Intense Competitive Rivalry',
        type: 'finding',
        priority: 'high',
        confidence: 'high',
        description: 'Neobanks like Revolut, N26, and Monzo have established strong brand presence with aggressive pricing.',
        dataSources: ['Market Research', 'Competitor Analysis'],
      },
      {
        id: 'finding-2',
        stepId: 'step-4',
        title: 'Market is Moderately Attractive',
        type: 'finding',
        priority: 'medium',
        confidence: 'medium',
        description: 'High rivalry but significant barriers protecting established positions. Opportunities in underserved segments.',
        dataSources: ['Porter\'s Five Forces Analysis'],
      }
    );
  } else if (agentId === 'agent-7') {
    keyFindings.push(
      {
        id: 'finding-1',
        stepId: 'step-2',
        title: 'Strong Brand Recognition in 35+ Demographic',
        type: 'finding',
        priority: 'medium',
        confidence: 'high',
        description: 'Top 3 brand awareness with 92% trust score and best-in-class security infrastructure.',
        dataSources: ['Brand Tracking Survey', 'NPS Data'],
      },
      {
        id: 'finding-2',
        stepId: 'step-3',
        title: 'Legacy Integration Challenges',
        type: 'finding',
        priority: 'high',
        confidence: 'high',
        description: 'Core banking system modernization required, causing 3x feature delivery time vs competitors.',
        dataSources: ['Engineering Metrics', 'Delivery Analytics'],
      }
    );
  } else {
    keyFindings.push(
      {
        id: 'finding-1',
        stepId: 'step-2',
        title: 'Profit Margin Declining Trend',
        type: 'finding',
        priority: 'high',
        confidence: 'high',
        description: 'Profit margin shows a declining trend of -2.1% over the past 30 days.',
        dataSources: ['Financial Reports'],
      },
      {
        id: 'finding-2',
        stepId: 'step-3',
        title: 'Shipping Costs Driving Margin Decline',
        type: 'finding',
        priority: 'high',
        confidence: 'medium',
        description: 'Profit margin contracted from 24.5% to 23.4% due to 12% increase in shipping costs in Q3.',
        dataSources: ['Cost Analysis', 'Vendor Data'],
      }
    );
  }

  return {
    keyFindings,
    generatedAt: new Date().toISOString(),
  };
};

// Helper to generate action recommendations based on agent analysis
const generateRecommendationsFromAgent = (agentId?: string): ActionRecommendations => {
  const items: ActionRecommendation[] = [];

  if (agentId === 'agent-5') {
    items.push(
      {
        id: 'rec-1',
        stepId: 'step-2',
        relatedFindingId: 'finding-3',
        relatedFindingTitle: 'Trust Debt Compounds Monthly',
        title: 'Invest in Backend Modernization',
        priority: 'high',
        description: 'Implement real-time activation sync between app and core banking. Monte Carlo simulation shows +$1.8M relative benefit vs quick fix.',
        potentialImpact: '+$1.8M by Q4',
        estimatedEffort: '3-4 months',
      },
      {
        id: 'rec-2',
        stepId: 'step-3',
        relatedFindingId: 'finding-1',
        relatedFindingTitle: 'Critical Friction Point in Debit Activation',
        title: 'Move Debit Activation to "Star" Category',
        priority: 'medium',
        description: 'Strategic investment to automate the process before it slides into a "Dog" category in BCG matrix.',
        potentialImpact: 'Improved customer retention',
        estimatedEffort: '2-3 months',
      },
      {
        id: 'rec-3',
        stepId: 'step-4',
        relatedFindingId: 'finding-2',
        relatedFindingTitle: 'VRIO Analysis: Organization Gap',
        title: 'Implement Real-time Status Sync',
        priority: 'high',
        description: 'Address the "Organized" gap in VRIO framework by synchronizing frontend and backend to deliver on the instant activation promise.',
        potentialImpact: 'Competitive parity with neobanks',
        estimatedEffort: '4-6 weeks',
      }
    );
  } else if (agentId === 'agent-6') {
    items.push({
      id: 'rec-1',
      stepId: 'step-4',
      relatedFindingId: 'finding-2',
      relatedFindingTitle: 'Market is Moderately Attractive',
      title: 'Pursue Differentiation Strategy',
      priority: 'high',
      description: 'Target underserved SMB segment with differentiated offerings to avoid direct competition with established neobanks.',
      potentialImpact: '15-20% market share in SMB',
      estimatedEffort: '6-12 months',
    });
  } else if (agentId === 'agent-7') {
    items.push(
      {
        id: 'rec-1',
        stepId: 'step-4',
        relatedFindingId: 'finding-1',
        relatedFindingTitle: 'Strong Brand Recognition in 35+ Demographic',
        title: 'Launch Premium Gen Z Product',
        priority: 'high',
        description: 'Leverage brand trust and security to launch sustainability-focused product for younger demographic.',
        potentialImpact: 'Capture 25% Gen Z market',
        estimatedEffort: '8-10 months',
      },
      {
        id: 'rec-2',
        stepId: 'step-4',
        relatedFindingId: 'finding-2',
        relatedFindingTitle: 'Legacy Integration Challenges',
        title: 'Accelerate API-First Architecture',
        priority: 'medium',
        description: 'Enable faster feature delivery and partner integrations through core banking modernization.',
        potentialImpact: '2x faster feature velocity',
        estimatedEffort: '12-18 months',
      }
    );
  } else {
    items.push({
      id: 'rec-1',
      stepId: 'step-3',
      relatedFindingId: 'finding-2',
      relatedFindingTitle: 'Shipping Costs Driving Margin Decline',
      title: 'Review Vendor Shipping Contracts',
      priority: 'high',
      description: 'Focus on Furniture category logistics. Consider alternative carriers or bulk shipping discounts.',
      potentialImpact: '$45k/mo savings',
      estimatedEffort: '2-4 weeks',
    });
  }

  return {
    items,
    generatedAt: new Date().toISOString(),
  };
};

export function AgentDetailView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getAgentById, updateAgent, isLoading } = useAgents();
  const { metrics } = useMetrics();
  const [selectedArtifact, setSelectedArtifact] = useState<AgentArtifact | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisCompletionStatus>('awaiting-approval');
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [phase, setPhase] = useState<AgentPhase>('idle');
  const [currentPlan, setCurrentPlan] = useState<AnalysisPlan | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [dataGaps, setDataGaps] = useState<DataGapProposal[]>([]);
  const [actionRecommendations, setActionRecommendations] = useState<ActionRecommendations | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'anomalies' | 'settings'>('analysis');
  const thinkingStreamRef = useRef<ThinkingStreamHandle>(null);
  const hasAutoStarted = useRef(false);

  const agent = getAgentById(id || '');

  // Demo data gaps - must be defined before early returns and before useEffect
  const demoDataGaps: DataGapProposal[] = useMemo(() => {
    if (agent?.id === 'agent-5') {
      return [
        {
          id: 'gap-1',
          type: 'metric',
          name: 'Customer Churn Rate',
          description: 'Monthly customer churn percentage by segment',
          reason: 'Required for CLV impact calculation and trust debt modeling',
          status: 'proposed',
        },
        {
          id: 'gap-2',
          type: 'dimension',
          name: 'Geographic Region',
          description: 'Regional breakdown of activation issues',
          reason: 'To identify if the problem is localized or systemic',
          status: 'proposed',
        },
      ];
    }
    return [];
  }, [agent?.id]);

  // Initialize data gaps when agent changes - must be before early returns
  useEffect(() => {
    if (agent && dataGaps.length === 0 && demoDataGaps.length > 0) {
      setDataGaps(demoDataGaps);
    }
  }, [agent?.id, demoDataGaps]);

  // Determine initial phase based on agent state
  useEffect(() => {
    if (!hasAutoStarted.current && agent) {
      hasAutoStarted.current = true;
      
      // Remove any autostart param from URL
      if (searchParams.get('autostart') === 'true') {
        setSearchParams({}, { replace: true });
      }

      // Check if agent has already been executed (has results)
      const hasExecuted = agent.lastRunAt || (agent.actionsCount && agent.actionsCount > 0) || agent.status === 'running';
      
      if (hasExecuted) {
        // Show completed results directly - generate plan for display context
        const metricNames = agent.monitoredMetrics
          ?.map((m) => metrics.find((metric) => metric.id === m.metricId)?.name)
          .filter(Boolean) as string[] || [];
        const plan = generateAnalysisPlan(agent, metricNames);
        setCurrentPlan({ ...plan, status: 'approved' });
        
        // Generate summary and show approved state (allows user to choose next action)
        const summary = generateSummaryFromSteps(agent.id);
        setAnalysisSummary(summary);
        setAnalysisStatus('analysis-approved');
        setPhase('completed');
      } else {
        // New agent - start planning automatically
        setPhase('planning');
        setTimeout(() => {
          const metricNames = agent.monitoredMetrics
            ?.map((m) => metrics.find((metric) => metric.id === m.metricId)?.name)
            .filter(Boolean) as string[] || [];
          const plan = generateAnalysisPlan(agent, metricNames);
          setCurrentPlan(plan);
          setPhase('plan-ready');
        }, 1500);
      }
    }
  }, [agent, metrics, searchParams, setSearchParams]);

  if (isLoading) {
    return <AgentDetailSkeleton />;
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">Agent not found</h2>
        <Button variant="outline" onClick={() => navigate('/ai-agents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  // Get metric names for the plan
  const monitoredMetricNames = agent.monitoredMetrics
    ?.map((m) => metrics.find((metric) => metric.id === m.metricId)?.name)
    .filter(Boolean) as string[] || [];

  const handleStartPlanning = () => {
    setPhase('planning');
    // Simulate plan generation delay
    setTimeout(() => {
      const plan = generateAnalysisPlan(agent, monitoredMetricNames);
      setCurrentPlan(plan);
      setPhase('plan-ready');
      toast.success('Analysis plan generated');
    }, 1500);
  };

  const handleApprovePlan = () => {
    if (currentPlan) {
      setCurrentPlan({ ...currentPlan, status: 'approved' });
      setPhase('executing');
      updateAgent(agent.id, { status: 'running' });
      toast.success('Plan approved - Starting analysis');
      
      // Check for data gaps after brief analysis period
      if (demoDataGaps.length > 0) {
        setTimeout(() => {
          setAnalysisStatus('data-gap-detected');
        }, 2000);
      }
    }
  };

  const handleEditWithFeedback = (feedback: string) => {
    setIsUpdatingPlan(true);
    setPhase('planning');
    toast.info(`Updating plan with feedback: "${feedback}"`);
    // Simulate plan regeneration with feedback
    setTimeout(() => {
      const plan = generateAnalysisPlan(agent, monitoredMetricNames);
      // In real implementation, feedback would be passed to AI to modify the plan
      setCurrentPlan({ ...plan, status: 'modified' });
      setPhase('plan-ready');
      setIsUpdatingPlan(false);
      toast.success('Plan updated based on your feedback');
    }, 1500);
  };

  const handleCancelPlan = () => {
    setPhase('idle');
    setCurrentPlan(null);
  };

  const handleSendMessage = (message: string) => {
    toast.info(`Message sent: "${message}"`);
  };

  const handleApprove = () => {
    toast.success('Action approved and queued for execution');
    setSelectedArtifact(null);
  };

  const handleReject = () => {
    toast.info('Action rejected');
    setSelectedArtifact(null);
  };

  const handleModify = () => {
    toast.info('Opening modification panel...');
  };


  // Handler for approving analysis (moves to analysis-approved phase)
  const handleApproveAnalysis = () => {
    const summary = generateSummaryFromSteps(agent.id);
    setAnalysisSummary(summary);
    setAnalysisStatus('analysis-approved');
    toast.success('Analysis approved! Choose your next step.');
  };

  const handleRequestMoreAnalysis = () => {
    setAnalysisStatus('needs-more');
  };

  const handleSubmitFeedback = (feedback: string) => {
    toast.info(`Running additional analysis: "${feedback}"`);
    setAnalysisStatus('analyzing');
    setTimeout(() => {
      setAnalysisStatus('awaiting-approval');
      toast.success('Additional analysis complete');
    }, 2000);
  };

  const handleCancelFeedback = () => {
    setAnalysisStatus('awaiting-approval');
  };

  const handleContinueAnalysis = () => {
    setAnalysisStatus('needs-more');
  };

  const handleGenerateRecommendations = () => {
    setAnalysisStatus('generating-recommendations');
    toast.info('Generating action recommendations...');
    
    setTimeout(() => {
      // Generate demo recommendations based on agent
      const recommendations = generateRecommendationsFromAgent(agent.id);
      setActionRecommendations(recommendations);
      setAnalysisStatus('completed');
      setPhase('completed');
      toast.success('Action recommendations generated');
    }, 1500);
  };

  // Handler for continuing without adding data gaps
  const handleContinueWithoutData = () => {
    setDataGaps(prev => prev.map(gap => ({ ...gap, status: 'skipped' as const })));
    setAnalysisStatus('awaiting-approval');
    toast.info('Continuing analysis with current data');
  };

  // Handler for opening add metrics flow
  const handleOpenAddMetrics = () => {
    // Mark all gaps as added (in real implementation, this would open a selection panel)
    setDataGaps(prev => prev.map(gap => ({ ...gap, status: 'added' as const })));
    setAnalysisStatus('awaiting-approval');
    toast.success('Metrics added - Continuing analysis');
  };

  const handleNavigateToStep = (stepId: string) => {
    thinkingStreamRef.current?.scrollToStep(stepId);
  };

  const handleToggleMonitoring = () => {
    const newState = !agent.isMonitoring;
    updateAgent(agent.id, { isMonitoring: newState });
    toast.success(newState ? 'Monitoring started' : 'Monitoring paused');
  };

  const handleManualRun = () => {
    setPhase('planning');
    toast.info('Starting manual run...');
    setTimeout(() => {
      const plan = generateAnalysisPlan(agent, monitoredMetricNames);
      setCurrentPlan(plan);
      setPhase('plan-ready');
    }, 1500);
  };

  const handleUpdateAgent = (updates: Partial<typeof agent>) => {
    updateAgent(agent.id, updates);
  };

  const handleDeleteAgent = () => {
    // In a real app, you'd show a confirmation dialog first
    toast.success('Agent deleted');
    navigate('/ai-agents');
  };

  // Demo count of new anomalies
  const newAnomaliesCount = 1;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Unified Header with monitoring controls */}
      <div className="border-b bg-background">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ai-agents')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{agent.name}</h1>
                {agent.isMonitoring && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Monitoring
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{agent.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agent.schedule?.frequency === 'continuous' && (
              <Button
                variant={agent.isMonitoring ? 'outline' : 'default'}
                size="sm"
                onClick={handleToggleMonitoring}
              >
                {agent.isMonitoring ? (
                  <>
                    <Pause className="h-4 w-4 mr-1.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" />
                    Start
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleManualRun}>
              <Play className="h-4 w-4 mr-1.5" />
              Run Now
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="h-10">
              <TabsTrigger value="analysis" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-4 w-4" />
                Run History
              </TabsTrigger>
              <TabsTrigger value="anomalies" className="gap-1.5">
                <AlertTriangleIcon className="h-4 w-4" />
                Anomalies
                {newAnomaliesCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                    {newAnomaliesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis' ? (
        /* Main Content Area - Split Layout (Original Analysis View) */
        <div className="flex flex-1 overflow-hidden relative">
          {/* Main Panel */}
          <div 
            className={cn(
              "flex flex-col overflow-hidden transition-all duration-300",
              selectedArtifact ? "w-1/2" : "w-full"
            )}
          >
            {/* Overlay when detail panel is open */}
            {selectedArtifact && (
              <div className="absolute inset-0 bg-black/5 pointer-events-none z-0" />
            )}
            
            {/* Scrollable Content - Centered */}
            <div className="flex-1 overflow-y-auto relative z-10">
              <div className={cn(
                "mx-auto px-6 py-6",
                selectedArtifact ? "max-w-2xl" : "max-w-3xl"
              )}>
                {/* Phase: Planning (including idle auto-start) - Show skeleton */}
                {(phase === 'idle' || phase === 'planning') && (
                  <PlanSkeleton />
                )}

                {/* Phase: Plan Ready - Show plan for approval */}
                {phase === 'plan-ready' && currentPlan && (
                  <PlanCard
                    plan={currentPlan}
                    onApprove={handleApprovePlan}
                    onEditWithFeedback={handleEditWithFeedback}
                    onCancel={handleCancelPlan}
                    isUpdating={isUpdatingPlan}
                  />
                )}

                {/* Phase: Executing or Completed - Show thinking stream */}
                {(phase === 'executing' || phase === 'completed') && (
                  <ThinkingStream 
                    ref={thinkingStreamRef}
                    agent={agent} 
                    plan={currentPlan}
                    onSelectArtifact={setSelectedArtifact}
                    analysisStatus={analysisStatus}
                    onApproveAnalysis={handleApproveAnalysis}
                    onRequestMoreAnalysis={handleRequestMoreAnalysis}
                    onSubmitFeedback={handleSubmitFeedback}
                    onCancelFeedback={handleCancelFeedback}
                    onContinueAnalysis={handleContinueAnalysis}
                    onGenerateRecommendations={handleGenerateRecommendations}
                    summary={analysisSummary}
                    actionRecommendations={actionRecommendations}
                    dataGaps={dataGaps}
                    onContinueWithoutData={handleContinueWithoutData}
                    onOpenAddMetrics={handleOpenAddMetrics}
                    onNavigateToStep={handleNavigateToStep}
                  />
                )}
              </div>
            </div>

            {/* Message Input - Only show when executing or completed */}
            {(phase === 'executing' || phase === 'completed') && (
              <div className="border-t bg-background relative z-10">
                <div className={cn(
                  "mx-auto px-6 py-4",
                  selectedArtifact ? "max-w-2xl" : "max-w-3xl"
                )}>
                  <MessageInput 
                    onSend={handleSendMessage}
                    placeholder="Ask the agent about these metrics..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel - 50% width when open, floating with shadow */}
          {selectedArtifact && (
            <div className="w-1/2 bg-background shadow-2xl border-l z-20 overflow-hidden relative">
              <div className="absolute inset-0 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.15)]" />
              <div className="relative h-full">
                <DetailPanel
                  artifact={selectedArtifact}
                  onClose={() => setSelectedArtifact(null)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onModify={handleModify}
                />
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <RunHistory agentId={agent.id} />
          </div>
        </div>
      ) : activeTab === 'anomalies' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <AnomalyAlerts agentId={agent.id} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <AgentSettings 
              agent={agent}
              onUpdate={handleUpdateAgent}
              onDelete={handleDeleteAgent}
            />
          </div>
        </div>
      )}
    </div>
  );
}
