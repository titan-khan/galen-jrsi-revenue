// Mock data for the Acquisition & Pipeline surfaces.
// Mirrors the wireframes in risk-v0-1/project/wireframes/acquisition.jsx.

export type StageStatus = 'ok' | 'skip' | 'fail' | 'warn';

export interface SpecialistStageRun {
  index: string;
  agent: string;
  elapsed: string;
  status: StageStatus;
  badge?: string;
  llmCost?: string;
  summary: string;
  expandedByDefault?: boolean;
}

export interface SignalTraceRecord {
  traceId: string;
  source: 'X' | 'TikTok' | 'Detik.com' | 'Kompas.id' | 'OJK' | 'internal';
  capturedAt: string;
  rawText: string;
  reach: string;
  amplifierTag?: string;
  startedAt: string;
  completedAt: string;
  wallTime: string;
  totalLlmCost: string;
  replaySig: string;
  outcome: {
    severity: 'HIGH' | 'MED' | 'LOW';
    priority: number;
    eventId: string;
    matchedCase: string;
    routedTo: string;
  };
  stages: SpecialistStageRun[];
}

export const SIGNAL_TRACE: SignalTraceRecord = {
  traceId: 'sig_2026-05-13_142500_x_392847',
  source: 'X',
  capturedAt: '14 May 2026 · 14:32 WIB',
  rawText:
    'sudah 8 bulan ayah saya nunggu santunan dari Jasa Raharja di Karawang, semua dokumen lengkap tapi nggak ada kabar...',
  reach: '200 RT · 1h',
  amplifierTag: '@LBHJakarta engaged',
  startedAt: '14:32:18',
  completedAt: '14:38:04',
  wallTime: '5m 46s',
  totalLlmCost: '$0.041',
  replaySig: 'a3f9c2…b1e7',
  outcome: {
    severity: 'HIGH',
    priority: 0.71,
    eventId: 'EVT-2026-05-13-0089',
    matchedCase: 'JR-2025-31847',
    routedTo: 'Manager Klaim Karawang',
  },
  stages: [
    {
      index: '01',
      agent: 'RiskSignalDedupSpecialist',
      elapsed: '1.2s',
      status: 'ok',
      badge: 'merged 1 near-dup',
      llmCost: '0.000',
      summary: [
        'dedup_method: embedding_similarity',
        'near_dup_id: sig_2026-05-13_141802_detik_x',
        'cosine_similarity: 0.93',
        'merged_with_provenance: true',
      ].join('\n'),
    },
    {
      index: '02',
      agent: 'RiskTriageSpecialist',
      elapsed: '0.4s',
      status: 'ok',
      badge: 'passed Tier A',
      llmCost: '0.001',
      expandedByDefault: true,
      summary: [
        'tier_a_relevance: 0.78 (≥ 0.5 threshold)',
        "matched_event_keywords: ['santunan', 'jasa raharja', 'nunggu']",
        'language_detected: id',
        'routed_to_tier_b: true',
      ].join('\n'),
    },
    {
      index: '03',
      agent: 'RiskClassifierSpecialist',
      elapsed: '2.1s',
      status: 'ok',
      badge: 'conf 0.83',
      llmCost: '0.020',
      expandedByDefault: true,
      summary: [
        'event_type_id: claim_processing_delay',
        'confidence: 0.83',
        'entities: [',
        "  { name: 'Karawang', type: 'location' },",
        "  { name: 'Jasa Raharja', type: 'organization' },",
        "  { name: 'JR-2025-31847', type: 'case_id' }",
        ']',
        'skill: jrsi_custom_taxonomy_v3',
      ].join('\n'),
    },
    {
      index: '04',
      agent: 'RiskEntityResolverSpecialist',
      elapsed: '1.8s',
      status: 'ok',
      badge: '4 entities',
      llmCost: '0.008',
      summary: ['geo_resolved: ID-JB.Karawang', 'case_id_validated: JR-2025-31847 (live)'].join(
        '\n',
      ),
    },
    {
      index: '05',
      agent: 'RiskAmplifierDetectorSpecialist',
      elapsed: '0.3s',
      status: 'ok',
      badge: 'LBH detected',
      llmCost: '0.002',
      summary: 'amplifier: lbh-jakarta, type: consumer_advocacy, cred: 0.85',
    },
    {
      index: '06',
      agent: 'RiskCouplingDetectorSpecialist',
      elapsed: '1.5s',
      status: 'ok',
      badge: 'matched JR-2025-31847',
      llmCost: '0.004',
      expandedByDefault: true,
      summary: [
        'coupling_signature: claim_processing_delay.v3',
        'internal_pattern: case_age > sla AND open',
        'candidates_in_region: 23',
        'matched_case: JR-2025-31847 (age 247d, sla 90d, 2.7× breach)',
        'intersection: AND ✓',
      ].join('\n'),
    },
    {
      index: '07',
      agent: 'RiskEventScorerSpecialist',
      elapsed: '1.9s',
      status: 'ok',
      badge: 'priority 0.71',
      llmCost: '0.003',
      summary: [
        'severity: 0.62 · momentum: +180%/h · amplifier: 0.85 · confidence: 0.83',
        'composite_priority: 0.71',
      ].join('\n'),
    },
    {
      index: '08',
      agent: 'RiskMAMRecommenderSpecialist',
      elapsed: '1.7s',
      status: 'ok',
      badge: 'AVOID',
      llmCost: '0.002',
      summary: [
        'response_class: avoid',
        'action: preemptive_disbursement_review',
        'executor: claims_operations_manager (Karawang)',
      ].join('\n'),
    },
    {
      index: '09',
      agent: 'RiskEventRouterSpecialist',
      elapsed: '0.5s',
      status: 'ok',
      badge: '2 recipients',
      llmCost: '0.001',
      summary: [
        'routes_matched: 1 (HIGH severity + claim_processing_delay)',
        'channels: slack, email',
        'recipients: Mgr Klaim Karawang, Dir Operasional',
      ].join('\n'),
    },
  ],
};

// ============ Source Connector ============

export interface QueryFragment {
  label: string;
  value: string;
}

export interface ConnectorBudget {
  spent: number;
  total: number;
  daysRemaining: number;
  projected: number;
  overshoot: number;
}

export interface RecentFailure {
  time: string;
  detail: string;
}

export interface SourceConnectorConfig {
  id: string;
  name: string;
  type: string;
  adapter: string;
  tier: 'cheap' | 'medium' | 'expensive';
  credibility: number;
  health: 'Healthy' | 'Warning' | 'Down';
  query: QueryFragment[];
  builtFrom: {
    watchlistEntities: number;
    eventTypes: string;
    amplifierEntities: number;
    activeDiscoveryNote: string;
  };
  cadence: {
    polling: string;
    lastFetch: string;
    backpressure: string;
  };
  budget: ConnectorBudget;
  throughputNote: string;
  throughputStats: { label: string; value: string }[];
  recentFailures: RecentFailure[];
  errorTolerance: string;
  dataResidency: 'ID' | 'SG' | 'US';
  retentionDays: number;
  lawfulBasis: string;
}

export const SOURCE_CONNECTORS: SourceConnectorConfig[] = [
  {
    id: 'x-firehose',
    name: 'X (Twitter) firehose',
    type: 'social_platform',
    adapter: 'XStreamAdapter',
    tier: 'expensive',
    credibility: 0.4,
    health: 'Healthy',
    query: [
      { label: 'mentions', value: '@JasaRaharja_RI' },
      { label: 'entities', value: '"jasa raharja" OR "JR santunan" OR "JR korban"' },
      {
        label: 'keywords',
        value: '("santunan" OR "klaim" OR "pencairan") AND ("lambat" OR "ditunda" OR "tunggu")',
      },
      { label: 'hashtags', value: '#santunan #korban #kecelakaan' },
      { label: 'amplifiers', value: '@LBHJakarta @LBHIndonesia @YLKI_id' },
      { label: 'geo', value: 'country:ID' },
      { label: 'lang', value: 'lang:id' },
      { label: 'date', value: 'rolling 24h' },
    ],
    builtFrom: {
      watchlistEntities: 4,
      eventTypes: 'claim_delay, denial, mass_casualty, fraud',
      amplifierEntities: 12,
      activeDiscoveryNote: 'active discovery expanded query +3× last 14d',
    },
    cadence: {
      polling: '5 min',
      lastFetch: '15s ago',
      backpressure: 'nominal · queue 4',
    },
    budget: {
      spent: 3412,
      total: 5000,
      daysRemaining: 17,
      projected: 5034,
      overshoot: 34,
    },
    throughputNote:
      'signals/hour · stable around 3.6k/h, spike at 14:30 (Karawang case)',
    throughputStats: [
      { label: 'signals', value: '87k' },
      { label: 'passed triage', value: '4.2%' },
      { label: 'coupling events', value: '11' },
    ],
    recentFailures: [
      { time: '14:28', detail: '429 rate-limited · 1 retry · ok' },
      { time: '09:14', detail: '5xx · 2 retries · ok' },
    ],
    errorTolerance: '2 errors / 24h · within tolerance',
    dataResidency: 'SG',
    retentionDays: 30,
    lawfulBasis: 'UU PDP 27/2022 Art. 20(c) — kepentingan publik · konten publik',
  },
];

export function getConnector(id: string | undefined): SourceConnectorConfig | undefined {
  if (!id) return undefined;
  return SOURCE_CONNECTORS.find((c) => c.id === id);
}

// ============ Cost Dashboard ============

export interface CostLine {
  label: string;
  value: number;
  max: number;
  tone?: 'destructive' | 'amber' | 'emerald' | 'muted' | 'primary';
  valueLabel?: string;
}

export interface CostDashboardData {
  period: string;
  dayOfMonth: string;
  llmSpend: { mtd: string; budget: string; projected: string; overBy?: string };
  acquisitionSpend: { mtd: string; budget: string; note: string };
  costPerCouplingEvent: { value: string; events: number; target: string };
  llmByStage: CostLine[];
  llmByStageFooter: string;
  acquisitionBySource: CostLine[];
  acquisitionFooter: string;
  costByEventType: CostLine[];
  costOverTimeNote: string;
}

export const COST_DASHBOARD: CostDashboardData = {
  period: 'May 2026',
  dayOfMonth: 'day 14 of 31',
  llmSpend: {
    mtd: '$7.2k',
    budget: '$15k',
    projected: '$16.0k',
    overBy: '$1k',
  },
  acquisitionSpend: {
    mtd: '$6.1k',
    budget: '$9k',
    note: 'X firehose & TikTok aggregator dominate',
  },
  costPerCouplingEvent: {
    value: '$3.20',
    events: 67,
    target: '≤ $5 · under',
  },
  llmByStage: [
    { label: 'RiskClassifierSpecialist', value: 3940, max: 4000, tone: 'destructive', valueLabel: '$3.9k' },
    { label: 'RiskMAMRecommenderSpecialist', value: 1620, max: 4000, tone: 'amber', valueLabel: '$1.6k' },
    { label: 'RiskEventScorerSpecialist', value: 890, max: 4000, tone: 'amber', valueLabel: '$890' },
    { label: 'RiskEntityResolverSpecialist', value: 510, max: 4000, valueLabel: '$510' },
    { label: 'RiskCouplingDetectorSpecialist', value: 140, max: 4000, valueLabel: '$140' },
    { label: 'RiskTriageSpecialist', value: 92, max: 4000, tone: 'emerald', valueLabel: '$92' },
    { label: 'RiskSignalDedupSpecialist', value: 28, max: 4000, tone: 'emerald', valueLabel: '$28' },
  ],
  llmByStageFooter:
    'Tier A triage drops 94% of signals before they reach Tier B classification — saves ~$45k/mo at current volume.',
  acquisitionBySource: [
    { label: 'X firehose', value: 3400, max: 3500, tone: 'destructive', valueLabel: '$3.4k' },
    { label: 'TikTok aggregator', value: 1820, max: 3500, tone: 'amber', valueLabel: '$1.8k' },
    { label: 'Detik.com news API', value: 620, max: 3500, valueLabel: '$620' },
    { label: 'Kompas news API', value: 440, max: 3500, valueLabel: '$440' },
    { label: 'Tribun aggregator', value: 105, max: 3500, valueLabel: '$105' },
    { label: 'OJK consumer feed', value: 0, max: 3500, tone: 'emerald', valueLabel: 'free' },
    { label: 'BMKG / Korlantas', value: 0, max: 3500, tone: 'emerald', valueLabel: 'free' },
  ],
  acquisitionFooter:
    'X firehose 97% utilized. Auto-throttle in 3 days unless budget raised or amplifier list narrowed.',
  costByEventType: [
    { label: 'claim_processing_delay', value: 2810, max: 3000, tone: 'destructive', valueLabel: '$2.8k · 42 events' },
    { label: 'claim_denial_dispute', value: 1430, max: 3000, tone: 'amber', valueLabel: '$1.4k · 18 events' },
    { label: 'mass_casualty_event', value: 680, max: 3000, valueLabel: '$680 · 4 events' },
    { label: 'fraud_indicator_pattern', value: 210, max: 3000, tone: 'muted', valueLabel: '$210 · partial' },
  ],
  costOverTimeNote:
    'Daily spend trend · trending up · 12 May spike from active discovery expansion',
};

// ============ Active Discovery ============

export interface DiscoveryFlowStep {
  label: string;
  sub: string;
  tone?: 'primary' | 'amber' | 'destructive' | 'muted';
  big?: boolean;
}

export interface DiscoveryExpansion {
  id: string;
  title: string;
  hits: string;
  decay: string;
  note: string;
  tone: 'destructive' | 'amber' | 'primary' | 'muted';
}

export interface DiscoveryBound {
  label: string;
  value: string;
  status?: { tone: 'destructive' | 'amber' | 'emerald' | 'primary' | 'muted'; label: string };
}

export interface DiscoveryDecay {
  label: string;
  detail: string;
}

export interface ActiveDiscoveryData {
  activeCount: number;
  baselineFactor: string;
  decayWindow: string;
  minStrength: string;
  flow: DiscoveryFlowStep[];
  expansions: DiscoveryExpansion[];
  remainingNote: string;
  bounds: DiscoveryBound[];
  recentDecays: DiscoveryDecay[];
}

export const ACTIVE_DISCOVERY: ActiveDiscoveryData = {
  activeCount: 14,
  baselineFactor: '3× baseline',
  decayWindow: '14 days',
  minStrength: '3 mentions',
  flow: [
    { label: 'initial query', sub: 'tenantConfig baseline', tone: 'primary' },
    { label: 'signal captured', sub: 'Tribun Jambi article' },
    { label: 'entities extracted', sub: "'Jambi', 'CL-2024-08731'" },
    {
      label: 'query expanded',
      sub: '+ region tracking + case ID',
      tone: 'amber',
      big: true,
    },
  ],
  expansions: [
    {
      id: 'jambi-cl-2024-08731',
      title: 'Jambi region · CL-2024-08731',
      hits: '+9 hits · 6h',
      decay: '247 days remaining',
      note: 'case-specific tracking',
      tone: 'destructive',
    },
    {
      id: 'karawang-jr-2025-31847',
      title: 'Karawang · JR-2025-31847',
      hits: '+4 hits · 1h',
      decay: '324 days remaining',
      note: 'new — triggered today',
      tone: 'amber',
    },
    {
      id: 'sumsel-denial',
      title: 'Sumsel · denial cluster',
      hits: '+12 hits · 3d',
      decay: '11 days remaining',
      note: 'decay starting',
      tone: 'primary',
    },
    {
      id: 'keluarga-jambi-handle',
      title: '@keluargakorbanjambi handle',
      hits: '+6 hits · 5h',
      decay: '13 days remaining',
      note: 'amplifier-adjacent account',
      tone: 'primary',
    },
    {
      id: 'santunan-hashtag',
      title: '#santunanjambi hashtag',
      hits: '+18 hits · 4h',
      decay: '13 days remaining',
      note: 'co-occurrence with main entity',
      tone: 'primary',
    },
  ],
  remainingNote: '+ 9 more · all auto-decaying',
  bounds: [
    {
      label: 'max factor',
      value: '3× baseline query count',
      status: { tone: 'emerald', label: 'at 2.8×' },
    },
    {
      label: 'min strength',
      value: '≥ 3 mentions OR 1 high-credibility',
    },
    {
      label: 'decay window',
      value: '14 days w/o reinforcement',
    },
    {
      label: 'audit',
      value: 'all expansions logged',
      status: { tone: 'emerald', label: 'on' },
    },
  ],
  recentDecays: [
    { label: '"Banjir Jakarta"', detail: 'decayed 11 May · no reinforcement 14d' },
    { label: '"#JRkorban" hashtag', detail: 'decayed 9 May' },
    { label: '"Aceh Tamiang case"', detail: 'decayed 4 May' },
  ],
};

// ============ Pipeline source health summary (Hub) ============

export interface SourceHealthRow {
  name: string;
  kind: string;
  status: 'Healthy' | 'Warning' | 'Down';
  throughput: string;
  errors: string;
  lastFetch: string;
  costMonthly: string;
  connectorId?: string;
}

export const SOURCE_HEALTH_ROWS: SourceHealthRow[] = [
  { name: 'Detik.com news API', kind: 'news_api · national', status: 'Healthy', throughput: '4.2k/d', errors: '0', lastFetch: '2m ago', costMonthly: '$1.2k' },
  { name: 'X (Twitter) firehose', kind: 'social_platform · ID', status: 'Healthy', throughput: '87k/d', errors: '2', lastFetch: '15s ago', costMonthly: '$3.4k', connectorId: 'x-firehose' },
  { name: 'TikTok scraper', kind: 'social_platform · ID', status: 'Warning', throughput: '1.1k/d', errors: '14', lastFetch: '22m ago', costMonthly: '$420' },
  { name: 'OJK consumer feed', kind: 'regulatory_feed', status: 'Healthy', throughput: '47/d', errors: '0', lastFetch: '11m ago', costMonthly: '$0' },
  { name: 'Tribun regional', kind: 'local_press_aggregator', status: 'Down', throughput: '0 / 24h', errors: '—', lastFetch: '14h ago', costMonthly: '$210' },
  { name: 'Kompas.id', kind: 'news_api · national', status: 'Healthy', throughput: '2.8k/d', errors: '0', lastFetch: '1m ago', costMonthly: '$890' },
];
