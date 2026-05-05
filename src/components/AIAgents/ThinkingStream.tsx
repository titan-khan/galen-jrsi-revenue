import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { AnalysisStep, AgentArtifact, Agent, AnalysisCompletionStatus, AnalysisSummary, AnalysisPlan, ActionRecommendations, DataGapProposal } from '@/types/agent';
import { ActionCard } from './ActionCard';
import { StreamMetricCard } from './StreamMetricCard';
import { AnalysisApprovalPrompt } from './AnalysisApprovalPrompt';
import { AnalysisFeedbackInput } from './AnalysisFeedbackInput';
import { AnalysisSummaryCard } from './AnalysisSummary';
import { ApprovedSummaryCard } from './ApprovedSummaryCard';
import { ActionRecommendationsCard } from './ActionRecommendationsCard';
import { DataGapDecisionPrompt } from './DataGapDecisionPrompt';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CheckCircle2, Circle, Loader2, ChevronDown, BarChart3, Lightbulb } from 'lucide-react';
import { useMetrics } from '@/contexts/MetricsContext';
import { cn } from '@/lib/utils';

// Demo data for metrics-focused thinking stream
const createDemoSteps = (metricsContext: string, agentId?: string): AnalysisStep[] => {
  // Strategic analysis steps for the Debit Activation Strategist
  if (agentId === 'agent-5') {
    return [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Problem Identification',
        status: 'complete',
        content: 'Critical Friction Point identified in the **Debit Activation** journey. App shows "Success" but backend takes **15 minutes** to update. This expectation gap is causing customer callbacks and trust erosion.',
        timestamp: '5 minutes ago',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Strategic Financial Modeling',
        status: 'complete',
        content: 'While a text change is the cheapest fix, my **Monte Carlo simulation** suggests it carries high strategic risk. I\'ve projected the financial impact of both scenarios over 12 months.',
        timestamp: '3 minutes ago',
        artifacts: [
          {
            id: 'artifact-simulation',
            type: 'simulation',
            title: 'CLV Impact Simulation: Quick Fix vs Backend Investment',
            description: 'Monte Carlo simulation projecting Customer Lifetime Value impact. The "Cheap Fix" creates a "Trust Debt" that compounds monthly, leading to significant revenue loss.',
            metrics: [
              { label: 'Scenario A (Quick Fix)', value: '-$2.4M by Q4' },
              { label: 'Scenario B (Backend)', value: '+$1.8M relative' },
            ],
            data: {
              chartData: [
                { month: 'Jan', quickFix: 0, backendFix: -150 },
                { month: 'Feb', quickFix: -180, backendFix: -80 },
                { month: 'Mar', quickFix: -420, backendFix: 50 },
                { month: 'Apr', quickFix: -680, backendFix: 200 },
                { month: 'May', quickFix: -950, backendFix: 380 },
                { month: 'Jun', quickFix: -1250, backendFix: 580 },
                { month: 'Jul', quickFix: -1480, backendFix: 820 },
                { month: 'Aug', quickFix: -1720, backendFix: 1050 },
                { month: 'Sep', quickFix: -1980, backendFix: 1280 },
                { month: 'Oct', quickFix: -2150, backendFix: 1480 },
                { month: 'Nov', quickFix: -2320, backendFix: 1650 },
                { month: 'Dec', quickFix: -2400, backendFix: 1800 },
              ],
              inputVariables: {
                currentChurnRate: '4%',
                projectedChurnIfPersists: '12%',
                backendFixCost: '$150k',
              },
            },
          },
        ],
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Service Portfolio Analysis',
        status: 'complete',
        content: 'Applied **BCG Matrix** analysis to classify the Debit Activation service within our digital banking portfolio.',
        timestamp: '2 minutes ago',
        artifacts: [
          {
            id: 'artifact-bcg',
            type: 'insight',
            title: 'BCG Matrix: Debit Activation is a "Question Mark"',
            description: 'High growth potential (new user acquisition) but low efficiency (manual callbacks required). Strategic imperative: Invest to move this to a "Star" before it slides into a "Dog".',
            metrics: [
              { label: 'Classification', value: 'Question Mark' },
              { label: 'Strategic Action', value: 'Invest to automate' },
            ],
            data: {
              quadrant: 'question-mark',
              xAxis: { label: 'Resolution Efficiency', value: 'Low' },
              yAxis: { label: 'Request Volume Growth', value: 'High' },
            },
          },
        ],
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Strategic Gap Analysis (VRIO)',
        status: 'complete',
        content: 'Conducted **VRIO Framework** assessment on our Digital Onboarding capability. Critical failure identified at the "Organized" dimension.',
        timestamp: '1 minute ago',
        artifacts: [
          {
            id: 'artifact-vrio',
            type: 'framework',
            title: 'VRIO Analysis: Organization Gap in Digital Onboarding',
            description: 'Our frontend (App) and backend (Core Banking) are not organized to deliver the promise. We promise "Instant" but deliver "15-min delay". This prevents sustained competitive advantage.',
            metrics: [
              { label: 'Failed Dimension', value: 'Organized (O)' },
              { label: 'Competitive Position', value: 'At Parity' },
            ],
            data: {
              vrioAssessment: [
                { dimension: 'Valuable', status: 'pass', evidence: 'Seamless onboarding is #1 driver of NPS for Gen Z customers' },
                { dimension: 'Rare', status: 'fail', evidence: 'Competitors (Revolut, Monzo) offer instant activation. We are at parity, not ahead.' },
                { dimension: 'Imitable', status: 'fail', evidence: 'The technology is standard. We have no moat here.' },
                { dimension: 'Organized', status: 'critical', evidence: 'CRITICAL FAILURE. Frontend and backend not synchronized to deliver promise.' },
              ],
              expectationGap: {
                competitor: { name: 'Monzo', time: '200ms', steps: ['User Clicks Activate', 'API Call', 'Database Write', 'Card Active'] },
                ourProcess: { time: '15 min', steps: ['User Clicks Activate', 'API Queue', '15 Min Batch Delay', 'Mainframe Job', 'Card Active'] },
              },
            },
          },
        ],
      },
    ];
  }

  // Porter's Five Forces analysis for agent-6
  if (agentId === 'agent-6') {
    return [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Industry Context Analysis',
        status: 'complete',
        content: 'Analyzing the **European fintech market** dynamics for potential market entry. The sector is characterized by high regulatory complexity, established players, and rapid digital adoption.',
        timestamp: '8 minutes ago',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Supplier & Buyer Power Assessment',
        status: 'complete',
        content: 'Evaluated bargaining power across the value chain. **Supplier power is moderate** due to cloud infrastructure commoditization. **Buyer power is high** given low switching costs in digital banking.',
        timestamp: '5 minutes ago',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Competitive Rivalry Analysis',
        status: 'complete',
        content: 'The European fintech space shows **intense competitive rivalry**. Neobanks like Revolut, N26, and Monzo have established strong brand presence with aggressive pricing strategies.',
        timestamp: '3 minutes ago',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Five Forces Strategic Assessment',
        status: 'complete',
        content: 'Completed comprehensive **Porter\'s Five Forces** analysis. Market is moderately attractive with key opportunities in underserved segments.',
        timestamp: '1 minute ago',
        artifacts: [
          {
            id: 'artifact-porter',
            type: 'porter-five-forces',
            title: "Porter's Five Forces: European Fintech Market",
            description: 'Comprehensive competitive analysis reveals a moderately attractive market with high rivalry but significant barriers protecting established positions.',
            metrics: [
              { label: 'Overall Attractiveness', value: 'Moderate' },
              { label: 'Recommended Strategy', value: 'Differentiation' },
            ],
            data: {
              forces: [
                { name: 'Supplier Power', level: 'medium', score: 55, evidence: 'Cloud providers are commoditized, but payment rails (Visa, Mastercard) maintain leverage' },
                { name: 'Buyer Power', level: 'high', score: 75, evidence: 'Low switching costs, high price sensitivity, multiple alternatives available' },
                { name: 'Competitive Rivalry', level: 'high', score: 85, evidence: 'Intense competition from neobanks, established players, and big tech entrants' },
                { name: 'Threat of New Entrants', level: 'medium', score: 60, evidence: 'High regulatory barriers but low capital requirements for digital-first models' },
                { name: 'Threat of Substitutes', level: 'low', score: 35, evidence: 'Traditional banking declining, but crypto/DeFi presents emerging threat' },
              ],
              overallAttractiveness: 'Moderately Attractive',
              recommendation: 'Proceed with differentiation strategy targeting underserved SMB segment',
            },
          },
        ],
      },
    ];
  }

  // SWOT analysis for agent-7
  if (agentId === 'agent-7') {
    return [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Internal Capabilities Assessment',
        status: 'complete',
        content: 'Conducted thorough assessment of **internal capabilities** for the mobile banking product line. Evaluated technology stack, team competencies, and operational efficiency.',
        timestamp: '12 minutes ago',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Strengths Identification',
        status: 'complete',
        content: 'Key strengths identified include **strong brand recognition** in the 35+ demographic, robust security infrastructure, and extensive branch network for hybrid service model.',
        timestamp: '8 minutes ago',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Weaknesses Analysis',
        status: 'complete',
        content: 'Primary weaknesses center on **legacy technology integration** challenges, slower feature velocity compared to neobanks, and gaps in Gen Z market positioning.',
        timestamp: '5 minutes ago',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Strategic SWOT Matrix',
        status: 'complete',
        content: 'Completed comprehensive **SWOT analysis** with strategic implications for each quadrant combination.',
        timestamp: '2 minutes ago',
        artifacts: [
          {
            id: 'artifact-swot',
            type: 'swot',
            title: 'SWOT Analysis: Mobile Banking Product Line',
            description: 'Strategic position assessment revealing opportunities to leverage brand trust while addressing technology debt to capture emerging market segments.',
            metrics: [
              { label: 'Strategic Priority', value: 'Modernization' },
              { label: 'Risk Level', value: 'Medium' },
            ],
            data: {
              strengths: [
                { title: 'Brand Recognition', impact: 'high', detail: 'Top 3 brand awareness in 35+ demographic with 92% trust score' },
                { title: 'Security Infrastructure', impact: 'high', detail: 'Best-in-class fraud prevention with 99.97% detection rate' },
                { title: 'Branch Network', impact: 'medium', detail: '450+ locations enabling hybrid digital-physical service model' },
                { title: 'Regulatory Compliance', impact: 'medium', detail: 'Strong compliance track record and established regulatory relationships' },
              ],
              weaknesses: [
                { title: 'Legacy Integration', impact: 'high', detail: 'Core banking system modernization required, causing 3x feature delivery time' },
                { title: 'Gen Z Positioning', impact: 'high', detail: 'Only 12% market share in 18-25 segment vs 45% for neobanks' },
                { title: 'Feature Velocity', impact: 'medium', detail: 'Average 6-month release cycle vs 2-week sprints for competitors' },
                { title: 'Mobile UX', impact: 'medium', detail: 'App store rating 3.8/5 vs competitor average of 4.6/5' },
              ],
              opportunities: [
                { title: 'Gen Z Market', impact: 'high', detail: 'Fastest growing segment with $360B annual spending power by 2030' },
                { title: 'Open Banking APIs', impact: 'high', detail: 'PSD2 compliance enables new revenue streams and partnerships' },
                { title: 'Embedded Finance', impact: 'medium', detail: 'B2B2C opportunities in retail and e-commerce sectors' },
                { title: 'ESG Products', impact: 'medium', detail: 'Growing demand for sustainable banking and green finance products' },
              ],
              threats: [
                { title: 'Neobank Competition', impact: 'high', detail: 'Revolut, N26 capturing 65% of new account openings in target segments' },
                { title: 'Big Tech Entry', impact: 'high', detail: 'Apple Pay, Google Pay expanding into full banking services' },
                { title: 'Regulatory Changes', impact: 'medium', detail: 'Pending digital asset regulations may require significant investment' },
                { title: 'Talent Acquisition', impact: 'medium', detail: 'Difficulty attracting top engineering talent vs tech companies' },
              ],
              strategicImplications: [
                { quadrant: 'SO', strategy: 'Leverage brand trust and security to launch premium Gen Z product with sustainability focus' },
                { quadrant: 'WO', strategy: 'Accelerate API-first architecture to enable faster feature delivery and partner integrations' },
                { quadrant: 'ST', strategy: 'Use regulatory expertise as competitive moat against big tech entrants' },
                { quadrant: 'WT', strategy: 'Prioritize core banking modernization before regulatory deadlines increase costs' },
              ],
            },
          },
        ],
      },
    ];
  }

  // Default demo steps for other agents
  return [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'Metrics Collection & Scope',
      status: 'complete',
      content: `Analyzing ${metricsContext || 'selected metrics'} over the configured time period. Collecting historical data and establishing baselines.`,
      timestamp: '2 minutes ago',
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'Trend & Anomaly Detection',
      status: 'complete',
      content: 'Scanned metrics for anomalies and significant trend changes:\n\n• **Profit Margin** shows a declining trend of -2.1% over the past 30 days\n• **Product Returns** increased by 15.2%, flagged as anomaly\n• **Sales metrics** performing within expected range',
      timestamp: '1 minute ago',
    },
    {
      id: 'step-3',
      stepNumber: 3,
      title: 'Root Cause Analysis',
      status: 'complete',
      content: 'Identified primary drivers for the detected anomalies. Cross-referenced with related metrics and dimensions.',
      timestamp: '30 seconds ago',
      artifacts: [
        {
          id: 'artifact-1',
          type: 'root-cause',
          title: 'Margin Decline Driver: Shipping Costs',
          description: 'Profit margin contracted from 24.5% to 23.4% primarily due to a 12% increase in shipping costs in Q3. The Furniture category shows the largest impact.',
          metrics: [
            { label: 'Margin Change', value: '-1.1%' },
            { label: 'Shipping Cost Δ', value: '+12%' },
          ],
        },
        {
          id: 'artifact-2',
          type: 'proposed-action',
          title: 'Review Vendor Shipping Contracts',
          description: 'Recommend initiating a review of current shipping vendor contracts, focusing on Furniture category logistics. Consider alternative carriers or bulk shipping discounts.',
          metrics: [
            { label: 'Potential Savings', value: '$45k/mo' },
            { label: 'Est. Margin Recovery', value: '+0.6%' },
          ],
        },
      ],
    },
  ];
};

const statusIcons = {
  complete: CheckCircle2,
  'in-progress': Loader2,
  pending: Circle,
};

const statusColors = {
  complete: 'text-emerald-500',
  'in-progress': 'text-blue-500 animate-spin',
  pending: 'text-muted-foreground',
};

export interface ThinkingStreamHandle {
  scrollToStep: (stepId: string) => void;
}

interface ThinkingStreamProps {
  agent?: Agent;
  plan?: AnalysisPlan | null;
  onSelectArtifact?: (artifact: AgentArtifact) => void;
  analysisStatus: AnalysisCompletionStatus;
  onApproveAnalysis: () => void;
  onRequestMoreAnalysis: () => void;
  onSubmitFeedback: (feedback: string) => void;
  onCancelFeedback: () => void;
  onContinueAnalysis: () => void;
  onGenerateRecommendations: () => void;
  summary?: AnalysisSummary | null;
  actionRecommendations?: ActionRecommendations | null;
  dataGaps?: DataGapProposal[];
  onContinueWithoutData?: () => void;
  onOpenAddMetrics?: () => void;
  onNavigateToStep: (stepId: string) => void;
}

export const ThinkingStream = forwardRef<ThinkingStreamHandle, ThinkingStreamProps>(
  function ThinkingStream({ 
    agent, 
    plan,
    onSelectArtifact,
    analysisStatus,
    onApproveAnalysis,
    onRequestMoreAnalysis,
    onSubmitFeedback,
    onCancelFeedback,
    onContinueAnalysis,
    onGenerateRecommendations,
    summary,
    actionRecommendations,
    dataGaps,
    onContinueWithoutData,
    onOpenAddMetrics,
    onNavigateToStep,
  }, ref) {
    const { metrics } = useMetrics();
    const stepRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Get monitored metrics for context
    const monitoredMetrics = agent?.monitoredMetrics
      ?.map((m) => metrics.find((metric) => metric.id === m.metricId))
      .filter(Boolean) || [];

    const metricsContext = monitoredMetrics.map((m) => m?.name).join(', ');
    const DEMO_STEPS = createDemoSteps(metricsContext, agent?.id);

    const [expandedSteps, setExpandedSteps] = useState<string[]>(DEMO_STEPS.map((s) => s.id));
    const [highlightedStep, setHighlightedStep] = useState<string | null>(null);

    const scrollToStep = (stepId: string) => {
      const stepElement = stepRefs.current.get(stepId);
      if (stepElement) {
        stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Expand the step if collapsed
        if (!expandedSteps.includes(stepId)) {
          setExpandedSteps(prev => [...prev, stepId]);
        }
        // Trigger highlight animation
        setHighlightedStep(stepId);
        setTimeout(() => setHighlightedStep(null), 2000);
      }
    };

    useImperativeHandle(ref, () => ({
      scrollToStep,
    }));

    const toggleStep = (stepId: string) => {
      setExpandedSteps((prev) =>
        prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
      );
    };

    const handleNavigateToStep = (stepId: string) => {
      scrollToStep(stepId);
      onNavigateToStep(stepId);
    };

    return (
      <div className="space-y-6">
        {/* Metrics Summary */}
        {monitoredMetrics.length > 0 && (
          <div className="p-5 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Monitored Metrics</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {monitoredMetrics.slice(0, 4).map((metric) => (
                metric && (
                  <StreamMetricCard
                    key={metric.id}
                    name={metric.name}
                    value={metric.displayData.currentValue}
                    changePercent={metric.displayData.changePercent}
                    status={metric.displayData.status}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {/* Analysis Steps */}
        <div className="space-y-4">
          {DEMO_STEPS.map((step) => {
            const StatusIcon = statusIcons[step.status];
            const statusColor = statusColors[step.status];
            const isExpanded = expandedSteps.includes(step.id);
            const isHighlighted = highlightedStep === step.id;

            return (
              <Collapsible key={step.id} open={isExpanded} onOpenChange={() => toggleStep(step.id)}>
                <div 
                  ref={(el) => {
                    if (el) stepRefs.current.set(step.id, el);
                  }}
                  className={cn(
                    "border rounded-xl bg-card overflow-hidden transition-all duration-300",
                    isHighlighted && "animate-highlight-pulse ring-2 ring-primary/30"
                  )}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-4">
                      <StatusIcon className={`h-5 w-5 ${statusColor} shrink-0`} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground">
                            Step {step.stepNumber}
                          </span>
                          {step.timestamp && (
                            <span className="text-xs text-muted-foreground">• {step.timestamp}</span>
                          )}
                        </div>
                        <h4 className="font-medium text-foreground">{step.title}</h4>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-5 pt-0 pl-12">
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        {step.content.split('\n').map((line, idx) => (
                          <p key={idx} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                        ))}
                      </div>

                      {step.artifacts && step.artifacts.length > 0 && (
                        <div className="mt-5 space-y-3">
                          {step.artifacts.map((artifact) => (
                            <ActionCard
                              key={artifact.id}
                              artifact={artifact}
                              onViewDetails={onSelectArtifact || (() => {})}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Data Gap Decision - pause for user choice */}
        {analysisStatus === 'data-gap-detected' && dataGaps && dataGaps.length > 0 && onContinueWithoutData && onOpenAddMetrics && (
          <DataGapDecisionPrompt
            dataGaps={dataGaps}
            onContinue={onContinueWithoutData}
            onAddMetrics={onOpenAddMetrics}
          />
        )}

        {/* Approval Flow - ask user to approve analysis */}
        {analysisStatus === 'awaiting-approval' && (
          <AnalysisApprovalPrompt
            onApprove={onApproveAnalysis}
            onRequestMore={onRequestMoreAnalysis}
          />
        )}

        {/* Feedback Input when user requests more analysis */}
        {analysisStatus === 'needs-more' && (
          <AnalysisFeedbackInput
            onSubmit={onSubmitFeedback}
            onCancel={onCancelFeedback}
          />
        )}

        {/* Analysis Approved / Generating / Completed - show summary card */}
        {(analysisStatus === 'analysis-approved' || 
          analysisStatus === 'generating-recommendations' || 
          (analysisStatus === 'completed' && actionRecommendations)) && summary && (
          <ApprovedSummaryCard
            summary={summary}
            onNavigateToStep={handleNavigateToStep}
            onContinueAnalysis={onContinueAnalysis}
            onGenerateRecommendations={onGenerateRecommendations}
            showActions={analysisStatus === 'analysis-approved'}
            isLoading={analysisStatus === 'generating-recommendations'}
          />
        )}

        {/* Generating Recommendations - loading state */}
        {analysisStatus === 'generating-recommendations' && (
          <div className="border rounded-xl bg-card p-5 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Analyzing Action Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  Generating strategic actions based on {summary?.keyFindings.length || 0} approved finding{(summary?.keyFindings.length || 0) !== 1 ? 's' : ''}...
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}

        {/* Action Recommendations - shown after user requests them */}
        {analysisStatus === 'completed' && actionRecommendations && (
          <ActionRecommendationsCard
            recommendations={actionRecommendations}
            agentId={agent?.id || ''}
            agentName={agent?.name || ''}
            onViewDetails={(rec) => onSelectArtifact?.({
              id: rec.id,
              type: 'proposed-action',
              title: rec.title,
              description: rec.description,
              metrics: rec.potentialImpact ? [{ label: 'Impact', value: rec.potentialImpact }] : undefined,
            })}
          />
        )}

        {/* Final Summary - only show if completed without recommendations */}
        {analysisStatus === 'completed' && !actionRecommendations && summary && (
          <AnalysisSummaryCard
            summary={summary}
            onNavigateToStep={handleNavigateToStep}
          />
        )}
      </div>
    );
  }
);
