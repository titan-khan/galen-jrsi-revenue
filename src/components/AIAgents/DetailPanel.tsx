import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentArtifact } from '@/types/agent';
import { 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Clock, 
  TrendingDown, 
  AlertTriangle,
  BarChart3,
  ArrowRight,
  ArrowUpRight,
  Lightbulb,
  Zap,
  Target,
  TrendingUp,
  Grid3X3,
  Check,
  X,
  AlertCircle,
  Shield,
  Search,
  Bookmark,
  MessageSquare,
  Layers,
  GitBranch,
  Flag,
  Calculator,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface DetailPanelProps {
  artifact: AgentArtifact;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onModify?: () => void;
}

const artifactTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  'root-cause': {
    label: 'Root Cause',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
  },
  'proposed-action': {
    label: 'Proposed Action',
    icon: ArrowRight,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  insight: {
    label: 'Insight',
    icon: BarChart3,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  chart: {
    label: 'Visualization',
    icon: BarChart3,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  table: {
    label: 'Data Table',
    icon: BarChart3,
    color: 'text-slate-600',
    bgColor: 'bg-slate-500/10',
  },
  'metric-summary': {
    label: 'Metric Summary',
    icon: TrendingDown,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10',
  },
  simulation: {
    label: 'Monte Carlo Simulation',
    icon: TrendingUp,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
  },
  framework: {
    label: 'Strategic Framework',
    icon: Target,
    color: 'text-rose-600',
    bgColor: 'bg-rose-500/10',
  },
  'porter-five-forces': {
    label: "Porter's Five Forces",
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
  swot: {
    label: 'SWOT Analysis',
    icon: Grid3X3,
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10',
  },
};

// Get context-aware action suggestions based on artifact type
const getActionSuggestionsForArtifact = (artifactType: string) => {
  // Default analysis-focused actions
  const analysisActions = [
    {
      icon: Search,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      title: 'Dig Deeper',
      description: 'Explore underlying factors and run additional analysis on this finding.',
      priority: 'High',
    },
    {
      icon: Bookmark,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      title: 'Add to Key Takeaways',
      description: 'Include this finding in the analysis summary for stakeholder review.',
      priority: 'Medium',
    },
    {
      icon: MessageSquare,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600',
      title: 'Request Clarification',
      description: 'Ask the agent to elaborate or provide more context on this finding.',
      priority: 'Low',
    },
  ];

  if (artifactType === 'root-cause') {
    return [
      {
        icon: Layers,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600',
        title: 'Investigate Further',
        description: 'Conduct deeper root cause analysis with additional data sources.',
        priority: 'High',
      },
      {
        icon: GitBranch,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600',
        title: 'Explore Related Causes',
        description: 'Identify other potential contributing factors to this issue.',
        priority: 'Medium',
      },
      {
        icon: Flag,
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-600',
        title: 'Flag for Action',
        description: 'Mark this root cause as requiring immediate attention.',
        priority: 'High',
      },
    ];
  }

  if (artifactType === 'proposed-action') {
    return [
      {
        icon: CheckCircle2,
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-600',
        title: 'Approve Action',
        description: 'Add this recommendation to the approved action plan.',
        priority: 'High',
      },
      {
        icon: Edit2,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600',
        title: 'Modify Action',
        description: 'Adjust the parameters or scope of this recommendation.',
        priority: 'Medium',
      },
      {
        icon: Calculator,
        iconBg: 'bg-purple-500/10',
        iconColor: 'text-purple-600',
        title: 'Run Impact Simulation',
        description: 'Model the potential outcomes of implementing this action.',
        priority: 'Medium',
      },
    ];
  }

  if (artifactType === 'simulation' || artifactType === 'framework' || artifactType === 'porter-five-forces' || artifactType === 'swot') {
    return [
      {
        icon: RefreshCw,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600',
        title: 'Run Different Scenario',
        description: 'Adjust input parameters and re-run the analysis.',
        priority: 'High',
      },
      {
        icon: Share2,
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-600',
        title: 'Export Results',
        description: 'Download or share this analysis with your team.',
        priority: 'Medium',
      },
      {
        icon: Bookmark,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600',
        title: 'Add to Key Takeaways',
        description: 'Include this finding in the analysis summary for stakeholder review.',
        priority: 'Medium',
      },
    ];
  }

  return analysisActions;
};

export function DetailPanel({
  artifact,
  onClose,
  onApprove,
  onReject,
  onModify,
}: DetailPanelProps) {
  const isActionable = artifact.type === 'proposed-action';
  const config = artifactTypeConfig[artifact.type] || artifactTypeConfig.insight;
  const TypeIcon = config.icon;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between p-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 ${config.bgColor}`}>
            <TypeIcon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="min-w-0">
            <Badge variant="secondary" className="text-xs mb-1">{config.label}</Badge>
            <h3 className="font-semibold text-foreground line-clamp-1">{artifact.title}</h3>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Preview Image/Visualization - Conditional based on type */}
          {artifact.type === 'simulation' && artifact.data?.chartData ? (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-medium text-foreground mb-4">12-Month CLV Projection ($k)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={artifact.data.chartData as Array<{ month: string; quickFix: number; backendFix: number }>}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="quickFix" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.3}
                      name="Scenario A (Quick Fix)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="backendFix" 
                      stackId="2"
                      stroke="#22c55e" 
                      fill="#22c55e" 
                      fillOpacity={0.3}
                      name="Scenario B (Backend Fix)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {artifact.data.inputVariables && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <span className="text-xs text-muted-foreground block">Current Churn</span>
                    <span className="text-sm font-semibold">{(artifact.data.inputVariables as { currentChurnRate: string }).currentChurnRate}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <span className="text-xs text-muted-foreground block">Projected Churn</span>
                    <span className="text-sm font-semibold text-red-500">{(artifact.data.inputVariables as { projectedChurnIfPersists: string }).projectedChurnIfPersists}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <span className="text-xs text-muted-foreground block">Backend Cost</span>
                    <span className="text-sm font-semibold">{(artifact.data.inputVariables as { backendFixCost: string }).backendFixCost}</span>
                  </div>
                </div>
              )}
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-200/50">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Key Insight:</strong> The "Cheap Fix" creates a "Trust Debt" that compounds monthly. The simulation strongly recommends Scenario B.
                </p>
              </div>
            </div>
          ) : artifact.type === 'framework' && artifact.data?.vrioAssessment ? (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <h4 className="text-sm font-medium text-foreground">VRIO Capability Audit</h4>
              <div className="space-y-2">
                {(artifact.data.vrioAssessment as Array<{ dimension: string; status: string; evidence: string }>).map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    item.status === 'pass' ? 'bg-emerald-500/5 border-emerald-200/50' :
                    item.status === 'critical' ? 'bg-red-500/10 border-red-300/50' :
                    'bg-muted/50 border-border'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {item.status === 'pass' ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : item.status === 'critical' ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={`text-sm font-medium ${
                        item.status === 'pass' ? 'text-emerald-700 dark:text-emerald-400' :
                        item.status === 'critical' ? 'text-red-700 dark:text-red-400' :
                        'text-muted-foreground'
                      }`}>
                        {item.dimension}
                      </span>
                      <Badge variant={item.status === 'pass' ? 'default' : item.status === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {item.status === 'pass' ? 'PASS' : item.status === 'critical' ? 'CRITICAL' : 'FAIL'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">{item.evidence}</p>
                  </div>
                ))}
              </div>
              
              {/* Expectation Gap Timeline */}
              {artifact.data.expectationGap && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-sm font-medium text-foreground">The Expectation Gap</h4>
                  <div className="space-y-3">
                    {/* Competitor Timeline */}
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-200/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          {(artifact.data.expectationGap as { competitor: { name: string } }).competitor.name}
                        </span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">
                          {(artifact.data.expectationGap as { competitor: { time: string } }).competitor.time}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {((artifact.data.expectationGap as { competitor: { steps: string[] } }).competitor.steps).map((step: string, idx: number) => (
                          <div key={idx} className="flex items-center">
                            <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">{step}</span>
                            {idx < ((artifact.data.expectationGap as { competitor: { steps: string[] } }).competitor.steps).length - 1 && (
                              <ArrowRight className="h-3 w-3 text-emerald-500 mx-1 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Our Process Timeline */}
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-200/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-red-700 dark:text-red-400">Our Process</span>
                        <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-300">
                          {(artifact.data.expectationGap as { ourProcess: { time: string } }).ourProcess.time}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {((artifact.data.expectationGap as { ourProcess: { steps: string[] } }).ourProcess.steps).map((step: string, idx: number) => (
                          <div key={idx} className="flex items-center">
                            <span className={`text-[10px] px-2 py-1 rounded whitespace-nowrap ${
                              step.includes('Delay') ? 'bg-red-500/30 text-red-700 dark:text-red-300 font-medium' : 'bg-red-500/10 text-red-700 dark:text-red-300'
                            }`}>{step}</span>
                            {idx < ((artifact.data.expectationGap as { ourProcess: { steps: string[] } }).ourProcess.steps).length - 1 && (
                              <ArrowRight className="h-3 w-3 text-red-400 mx-1 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : artifact.type === 'porter-five-forces' && artifact.data?.forces ? (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <h4 className="text-sm font-medium text-foreground">Porter's Five Forces Analysis</h4>
              
              {/* Forces Pentagon Visualization */}
              <div className="relative mx-auto w-64 h-64">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30" />
                </div>
                {/* Center indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-orange-500/20">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                {/* Supplier Power - Top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center">
                  <div className="text-xs font-medium text-foreground">Supplier Power</div>
                  <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-700 border-amber-300 text-[10px]">
                    {((artifact.data.forces as Array<{ name: string; score: number }>).find(f => f.name === 'Supplier Power')?.score || 0)}
                  </Badge>
                </div>
                {/* Buyer Power - Right */}
                <div className="absolute top-1/4 right-0 text-right">
                  <div className="text-xs font-medium text-foreground">Buyer Power</div>
                  <Badge variant="outline" className="mt-1 bg-red-500/10 text-red-700 border-red-300 text-[10px]">
                    {((artifact.data.forces as Array<{ name: string; score: number }>).find(f => f.name === 'Buyer Power')?.score || 0)}
                  </Badge>
                </div>
                {/* Rivalry - Bottom Right */}
                <div className="absolute bottom-0 right-4 text-right">
                  <div className="text-xs font-medium text-foreground">Rivalry</div>
                  <Badge variant="outline" className="mt-1 bg-red-500/10 text-red-700 border-red-300 text-[10px]">
                    {((artifact.data.forces as Array<{ name: string; score: number }>).find(f => f.name === 'Competitive Rivalry')?.score || 0)}
                  </Badge>
                </div>
                {/* New Entrants - Bottom Left */}
                <div className="absolute bottom-0 left-4 text-left">
                  <div className="text-xs font-medium text-foreground">New Entrants</div>
                  <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-700 border-amber-300 text-[10px]">
                    {((artifact.data.forces as Array<{ name: string; score: number }>).find(f => f.name === 'Threat of New Entrants')?.score || 0)}
                  </Badge>
                </div>
                {/* Substitutes - Left */}
                <div className="absolute top-1/4 left-0 text-left">
                  <div className="text-xs font-medium text-foreground">Substitutes</div>
                  <Badge variant="outline" className="mt-1 bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px]">
                    {((artifact.data.forces as Array<{ name: string; score: number }>).find(f => f.name === 'Threat of Substitutes')?.score || 0)}
                  </Badge>
                </div>
              </div>

              {/* Force Details */}
              <div className="space-y-2">
                {(artifact.data.forces as Array<{ name: string; level: string; score: number; evidence: string }>).map((force, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    force.level === 'high' ? 'bg-red-500/5 border-red-200/50' :
                    force.level === 'medium' ? 'bg-amber-500/5 border-amber-200/50' :
                    'bg-emerald-500/5 border-emerald-200/50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{force.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              force.level === 'high' ? 'bg-red-500' :
                              force.level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${force.score}%` }}
                          />
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${
                          force.level === 'high' ? 'bg-red-500/10 text-red-700 border-red-300' :
                          force.level === 'medium' ? 'bg-amber-500/10 text-amber-700 border-amber-300' :
                          'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                        }`}>
                          {force.level.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{force.evidence}</p>
                  </div>
                ))}
              </div>

              {/* Overall Assessment */}
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-200/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Market Attractiveness</span>
                  <Badge className="bg-orange-500 text-white">{(artifact.data as { overallAttractiveness: string }).overallAttractiveness}</Badge>
                </div>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Recommendation:</strong> {(artifact.data as { recommendation: string }).recommendation}
                </p>
              </div>
            </div>
          ) : artifact.type === 'swot' && artifact.data?.strengths ? (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <h4 className="text-sm font-medium text-foreground">SWOT Strategic Analysis</h4>
              
              {/* SWOT 2x2 Matrix */}
              <div className="grid grid-cols-2 gap-2">
                {/* Strengths */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Strengths</span>
                  </div>
                  <div className="space-y-1.5">
                    {(artifact.data.strengths as Array<{ title: string; impact: string }>).slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.impact === 'high' ? 'bg-emerald-600' : 'bg-emerald-400'}`} />
                        <span className="text-xs text-foreground">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Weaknesses */}
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Weaknesses</span>
                  </div>
                  <div className="space-y-1.5">
                    {(artifact.data.weaknesses as Array<{ title: string; impact: string }>).slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.impact === 'high' ? 'bg-red-600' : 'bg-red-400'}`} />
                        <span className="text-xs text-foreground">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Opportunities */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Opportunities</span>
                  </div>
                  <div className="space-y-1.5">
                    {(artifact.data.opportunities as Array<{ title: string; impact: string }>).slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.impact === 'high' ? 'bg-blue-600' : 'bg-blue-400'}`} />
                        <span className="text-xs text-foreground">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Threats */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Threats</span>
                  </div>
                  <div className="space-y-1.5">
                    {(artifact.data.threats as Array<{ title: string; impact: string }>).slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.impact === 'high' ? 'bg-amber-600' : 'bg-amber-400'}`} />
                        <span className="text-xs text-foreground">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategic Implications */}
              {artifact.data.strategicImplications && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-foreground">Strategic Implications</h5>
                  {(artifact.data.strategicImplications as Array<{ quadrant: string; strategy: string }>).map((impl, idx) => (
                    <div key={idx} className={`p-2 rounded-lg border text-xs ${
                      impl.quadrant === 'SO' ? 'bg-emerald-500/5 border-emerald-200/50' :
                      impl.quadrant === 'WO' ? 'bg-blue-500/5 border-blue-200/50' :
                      impl.quadrant === 'ST' ? 'bg-purple-500/5 border-purple-200/50' :
                      'bg-amber-500/5 border-amber-200/50'
                    }`}>
                      <Badge variant="outline" className={`text-[10px] mr-2 ${
                        impl.quadrant === 'SO' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300' :
                        impl.quadrant === 'WO' ? 'bg-blue-500/10 text-blue-700 border-blue-300' :
                        impl.quadrant === 'ST' ? 'bg-purple-500/10 text-purple-700 border-purple-300' :
                        'bg-amber-500/10 text-amber-700 border-amber-300'
                      }`}>
                        {impl.quadrant}
                      </Badge>
                      <span className="text-muted-foreground">{impl.strategy}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-200/50">
                <p className="text-sm text-teal-800 dark:text-teal-200">
                  <strong>Key Takeaway:</strong> Focus on SO strategies (leveraging strengths to capture opportunities) while prioritizing WT mitigation to protect against critical vulnerabilities.
                </p>
              </div>
            </div>
          ) : artifact.type === 'insight' && artifact.data?.quadrant ? (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-medium text-foreground mb-4">BCG Matrix: Service Portfolio</h4>
              <div className="grid grid-cols-2 gap-2 aspect-square max-w-xs mx-auto">
                <div className={`p-3 rounded-lg border ${artifact.data.quadrant === 'star' ? 'bg-emerald-500/20 border-emerald-400' : 'bg-muted/30'}`}>
                  <span className="text-xs font-medium">⭐ Star</span>
                  <p className="text-[10px] text-muted-foreground">High Growth, High Efficiency</p>
                </div>
                <div className={`p-3 rounded-lg border ${artifact.data.quadrant === 'question-mark' ? 'bg-amber-500/20 border-amber-400' : 'bg-muted/30'}`}>
                  <span className="text-xs font-medium">❓ Question Mark</span>
                  <p className="text-[10px] text-muted-foreground">High Growth, Low Efficiency</p>
                  {artifact.data.quadrant === 'question-mark' && (
                    <Badge className="mt-1 text-[10px]" variant="secondary">Debit Activation</Badge>
                  )}
                </div>
                <div className={`p-3 rounded-lg border ${artifact.data.quadrant === 'cash-cow' ? 'bg-blue-500/20 border-blue-400' : 'bg-muted/30'}`}>
                  <span className="text-xs font-medium">🐄 Cash Cow</span>
                  <p className="text-[10px] text-muted-foreground">Low Growth, High Efficiency</p>
                </div>
                <div className={`p-3 rounded-lg border ${artifact.data.quadrant === 'dog' ? 'bg-red-500/20 border-red-400' : 'bg-muted/30'}`}>
                  <span className="text-xs font-medium">🐕 Dog</span>
                  <p className="text-[10px] text-muted-foreground">Low Growth, Low Efficiency</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-200/50">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Strategic Imperative:</strong> Invest to move "Debit Activation" to a Star. Do not let it slide into a Dog.
                </p>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-xl border overflow-hidden">
              <div className="h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-muted/50">
                <div className={`p-4 rounded-xl ${config.bgColor}`}>
                  <TypeIcon className={`h-8 w-8 ${config.color}`} />
                </div>
                <span className="text-sm text-muted-foreground">Preview visualization</span>
              </div>
            </div>
          )}

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {artifact.description}
          </p>

          {/* Metrics */}
          {artifact.metrics && artifact.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {artifact.metrics.map((metric, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-muted/50 border">
                  <span className="text-xs text-muted-foreground block mb-1">{metric.label}</span>
                  <span className="text-2xl font-bold text-foreground">{metric.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* What would you like to do? - NotebookLM style action cards */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">What would you like to do?</h3>
            
            <div className="space-y-3">
              {getActionSuggestionsForArtifact(artifact.type).map((action, idx) => {
                const ActionIcon = action.icon;
                return (
                  <div 
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-md group"
                    onClick={onModify}
                  >
                    <div className={`p-2.5 rounded-lg ${action.iconBg} shrink-0`}>
                      <ActionIcon className={`h-5 w-5 ${action.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{action.title}</h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {action.description}
                      </p>
                      <button className="text-sm text-primary mt-2 hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Show more details
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Impact Analysis for Root Causes */}
          {artifact.type === 'root-cause' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Impact Analysis</h4>
              <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-200/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Contributing Factors</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <li>• Increased shipping costs (+12%)</li>
                      <li>• Furniture category most affected</li>
                      <li>• Q3 seasonal pattern deviation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expected Outcome for Actions */}
          {artifact.type === 'proposed-action' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Expected Outcome</h4>
              <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-200/50">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Timeline</span>
                    <span className="font-medium text-foreground">2-4 weeks</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium text-foreground">High (85%)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Risk Level</span>
                    <span className="font-medium text-foreground">Low</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Log - Simplified */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Activity</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Identified 2 minutes ago</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                <span>Pending review</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Sticky Action Footer for Actionable Items */}
      {isActionable && (
        <div className="p-4 border-t bg-background space-y-3">
          <div className="flex gap-2">
            <Button onClick={onApprove} className="flex-1" size="lg">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button variant="outline" onClick={onModify} size="lg">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onReject} size="lg" className="text-muted-foreground hover:text-destructive">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            All actions are logged for compliance review.
          </p>
        </div>
      )}
    </div>
  );
}
