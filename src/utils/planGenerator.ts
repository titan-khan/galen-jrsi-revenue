import { Agent, AnalysisPlan, AnalysisPlanStep } from '@/types/agent';

// Template-specific plan configurations
const PLAN_TEMPLATES: Record<string, { frameworks: string[]; steps: Omit<AnalysisPlanStep, 'id'>[] }> = {
  'template-digital-onboarding': {
    frameworks: ['VRIO Analysis', 'BCG Matrix', 'Monte Carlo Simulation'],
    steps: [
      {
        stepNumber: 1,
        title: 'Problem Identification & Scoping',
        description: 'Identify critical friction points in the onboarding journey and quantify their business impact.',
        estimatedDuration: '2 min',
        outputs: ['Friction point analysis', 'Impact metrics'],
      },
      {
        stepNumber: 2,
        title: 'Financial Impact Modeling',
        description: 'Run Monte Carlo simulation to project financial outcomes of different solution scenarios.',
        estimatedDuration: '3 min',
        frameworks: ['Monte Carlo Simulation'],
        outputs: ['CLV impact projection', 'Scenario comparison'],
      },
      {
        stepNumber: 3,
        title: 'Service Portfolio Analysis',
        description: 'Apply BCG Matrix to classify the service within your digital portfolio.',
        estimatedDuration: '2 min',
        frameworks: ['BCG Matrix'],
        outputs: ['Portfolio classification', 'Strategic recommendation'],
      },
      {
        stepNumber: 4,
        title: 'Strategic Gap Assessment',
        description: 'Conduct VRIO framework analysis to identify capability gaps preventing competitive advantage.',
        estimatedDuration: '3 min',
        frameworks: ['VRIO Analysis'],
        outputs: ['VRIO assessment', 'Gap analysis'],
      },
    ],
  },
  'template-porter-five-forces': {
    frameworks: ["Porter's Five Forces"],
    steps: [
      {
        stepNumber: 1,
        title: 'Industry Context Analysis',
        description: 'Analyze market dynamics, regulatory environment, and competitive landscape overview.',
        estimatedDuration: '2 min',
        outputs: ['Market overview', 'Regulatory summary'],
      },
      {
        stepNumber: 2,
        title: 'Supplier & Buyer Power Assessment',
        description: 'Evaluate bargaining power dynamics across the value chain.',
        estimatedDuration: '3 min',
        frameworks: ["Porter's Five Forces"],
        outputs: ['Power analysis', 'Leverage points'],
      },
      {
        stepNumber: 3,
        title: 'Competitive Rivalry Analysis',
        description: 'Assess intensity of competition and identify key competitors.',
        estimatedDuration: '3 min',
        frameworks: ["Porter's Five Forces"],
        outputs: ['Rivalry assessment', 'Competitor mapping'],
      },
      {
        stepNumber: 4,
        title: 'Five Forces Strategic Assessment',
        description: 'Synthesize all five forces into a comprehensive strategic recommendation.',
        estimatedDuration: '2 min',
        frameworks: ["Porter's Five Forces"],
        outputs: ['Five forces matrix', 'Entry strategy recommendation'],
      },
    ],
  },
  'template-swot-analysis': {
    frameworks: ['SWOT Analysis'],
    steps: [
      {
        stepNumber: 1,
        title: 'Internal Capabilities Assessment',
        description: 'Evaluate technology stack, team competencies, and operational efficiency.',
        estimatedDuration: '2 min',
        outputs: ['Capability inventory', 'Efficiency metrics'],
      },
      {
        stepNumber: 2,
        title: 'Strengths Identification',
        description: 'Identify and quantify internal strengths with supporting evidence.',
        estimatedDuration: '2 min',
        frameworks: ['SWOT Analysis'],
        outputs: ['Strengths list', 'Evidence documentation'],
      },
      {
        stepNumber: 3,
        title: 'Weaknesses Analysis',
        description: 'Analyze internal weaknesses and their impact on strategic objectives.',
        estimatedDuration: '2 min',
        frameworks: ['SWOT Analysis'],
        outputs: ['Weaknesses assessment', 'Impact analysis'],
      },
      {
        stepNumber: 4,
        title: 'Strategic SWOT Matrix',
        description: 'Complete SWOT with opportunities/threats and derive strategic implications.',
        estimatedDuration: '4 min',
        frameworks: ['SWOT Analysis'],
        outputs: ['Full SWOT matrix', 'Strategic implications'],
      },
    ],
  },
};

// Default plan for templates without specific configuration
const DEFAULT_PLAN = {
  frameworks: ['Trend Analysis', 'Root Cause Analysis'],
  steps: [
    {
      stepNumber: 1,
      title: 'Metrics Collection & Baseline',
      description: 'Collect historical data and establish performance baselines.',
      estimatedDuration: '2 min',
      outputs: ['Historical data', 'Baseline metrics'],
    },
    {
      stepNumber: 2,
      title: 'Trend & Anomaly Detection',
      description: 'Scan metrics for anomalies and significant trend changes.',
      estimatedDuration: '2 min',
      frameworks: ['Trend Analysis'],
      outputs: ['Trend analysis', 'Anomaly flags'],
    },
    {
      stepNumber: 3,
      title: 'Root Cause Analysis',
      description: 'Identify primary drivers for detected issues and cross-reference with related metrics.',
      estimatedDuration: '3 min',
      frameworks: ['Root Cause Analysis'],
      outputs: ['Root cause identification', 'Proposed actions'],
    },
  ],
};

// Title templates based on agent template
const PLAN_TITLES: Record<string, string> = {
  'template-digital-onboarding': 'Digital Onboarding Analysis',
  'template-porter-five-forces': "Porter's Five Forces Analysis",
  'template-swot-analysis': 'SWOT Strategic Analysis',
};

export function generateAnalysisPlan(agent: Agent, metricNames: string[]): AnalysisPlan {
  const planTemplate = PLAN_TEMPLATES[agent.templateId] || DEFAULT_PLAN;
  
  const proposedSteps: AnalysisPlanStep[] = planTemplate.steps.map((step, index) => ({
    ...step,
    id: `plan-step-${index + 1}`,
  }));

  const totalMinutes = proposedSteps.reduce((acc, step) => {
    const mins = parseInt(step.estimatedDuration?.replace(/\D/g, '') || '2');
    return acc + mins;
  }, 0);

  const title = PLAN_TITLES[agent.templateId] || `${agent.name} Analysis`;

  return {
    id: `plan-${Date.now()}`,
    agentId: agent.id,
    title,
    objectiveRestatement: agent.goal || `Analyze ${agent.name} metrics and provide actionable insights`,
    scopeSummary: {
      metrics: metricNames,
      timeRange: agent.timeRange?.replace(/-/g, ' ') || 'last 30 days',
      dimensions: ['Category', 'Region', 'Segment'],
    },
    proposedSteps,
    frameworksToApply: planTemplate.frameworks,
    expectedDeliverables: proposedSteps.flatMap(s => s.outputs || []),
    estimatedDuration: `~${totalMinutes} minutes`,
    generatedAt: new Date().toISOString(),
    status: 'draft',
  };
}