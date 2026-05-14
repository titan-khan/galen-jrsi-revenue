// Mock data driving the Risk Lens decision-loop surfaces.
// Backed by the wireframes in the risk-v0-1 design bundle.

export type Severity = 'HIGH' | 'MED' | 'LOW' | 'CRIT';
export type EventStatus =
  | 'NEW'
  | 'ACK'
  | 'IN_PROGRESS'
  | 'SNOOZED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'DISMISSED';
export type MAMResponse = 'AVOID' | 'REDUCE' | 'TRANSFER' | 'ACCEPT';

export interface ProvenanceItem {
  source: string;
  when: string;
  credibility: number;
  headline: string;
  url?: string;
}

export interface InternalCase {
  caseId: string;
  claimant: string;
  region: string;
  ageDays: number;
  slaText: string;
  slaBreach: boolean;
  status: EventStatus;
  lastAction: string;
}

export interface ScoreFactor {
  label: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface SimilarCase {
  id: string;
  region: string;
  ageDays: number;
  outcome: string;
  isGolden?: boolean;
}

export interface TimelineSignal {
  time: string;
  source: string;
  credibility: number | null;
  extractionConfidence: number | null;
  claim: string;
}

export interface AmplifierActor {
  handle: string;
  kind: string;
  credibility: number;
  detail: string;
  tone: 'high' | 'med' | 'low';
}

export interface MAMRecommendation {
  response: MAMResponse;
  action: string;
  executor: string;
  slaWindow: string;
  rationale: string;
  requiresApproval: boolean;
}

export interface RiskEvent {
  id: string;
  title: string;
  region: string;
  regionCode: string;
  detectedAgo: string;
  eventType: string;
  severity: Severity;
  status: EventStatus;
  priorityScore: number;
  severityScore: number;
  momentumPct: number;
  confidenceScore: number;
  tags: string[];
  amplifierActive: boolean;
  worklistLine1: string;
  worklistLine2: string;
  externalMentionCount: number;
  externalSince: string;
  amplifiers: AmplifierActor[];
  provenance: ProvenanceItem[];
  velocityNote: string;
  internalCase: InternalCase;
  internalBindingNote: string;
  couplingExternal: {
    pattern: string;
    bullets: string[];
  };
  couplingInternal: {
    pattern: string;
    bullets: string[];
  };
  couplingMatchedAt: string;
  couplingSignature: string;
  similarCases: SimilarCase[];
  mam: MAMRecommendation;
  scoreFactors: ScoreFactor[];
  signalTimeline: TimelineSignal[];
  evalGroundTruth: {
    label: 'true positive' | 'true negative' | 'false positive' | 'false negative';
    expectedSeverity: number;
    detectedMonth: number;
    groundTruthMonth: number;
  };
}

export interface WorklistStubEvent {
  id: string;
  priorityScore: number;
  severity: Severity;
  status: EventStatus;
  title: string;
  ageText: string;
  summary: string;
}

const jambiEvent: RiskEvent = {
  id: 'jambi-cl-2024-08731',
  title: 'Long-pending claim · Jambi · case CL-2024-08731',
  region: 'Jambi',
  regionCode: 'ID-JA',
  detectedAgo: '6h ago',
  eventType: 'claim_processing_delay',
  severity: 'HIGH',
  status: 'NEW',
  priorityScore: 0.89,
  severityScore: 0.82,
  momentumPct: 47,
  confidenceScore: 0.91,
  tags: ['operational', 'reputational'],
  amplifierActive: true,
  worklistLine1: 'Claim age 487d · SLA breach 5.4×',
  worklistLine2: '47 mentions / 24h · @LBHJakarta active · TikTok cluster',
  externalMentionCount: 14,
  externalSince: '14 May 06:42',
  amplifiers: [
    {
      handle: '@LBHJakarta',
      kind: 'consumer_advocacy',
      credibility: 0.85,
      detail: '3 posts · reach 412k',
      tone: 'high',
    },
    {
      handle: 'Tribun Jambi',
      kind: 'journalist',
      credibility: 0.7,
      detail: '1 article',
      tone: 'med',
    },
    {
      handle: '4 unknown TikTok accounts',
      kind: 'unverified',
      credibility: 0.4,
      detail: 'amplifying claimant video',
      tone: 'low',
    },
  ],
  provenance: [
    {
      source: 'TikTok',
      when: '2h ago',
      credibility: 0.4,
      headline:
        "@keluargakorbanjambi — 'sudah 487 hari nunggu santunan ayah saya...'",
    },
    {
      source: 'Detik.com',
      when: '5h ago',
      credibility: 0.75,
      headline:
        'Kasus santunan Jambi: keluarga korban kembali bersuara setelah lebih dari setahun',
    },
    {
      source: 'X',
      when: '6h ago',
      credibility: 0.4,
      headline:
        '@LBHJakarta — thread on long-pending Jasa Raharja claims, names case CL-2024-08731',
    },
    {
      source: 'OJK',
      when: '4h ago',
      credibility: 0.9,
      headline: 'OJK consumer protection bulletin references Jambi pattern',
    },
  ],
  velocityNote: 'Ramp from 2/h → 11/h between 12:00 and 18:00 WIB',
  internalCase: {
    caseId: 'CL-2024-08731',
    claimant: '[masked] · age 34 · Jambi',
    region: 'ID-JA',
    ageDays: 487,
    slaText: '90d · breach 5.4×',
    slaBreach: true,
    status: 'ACK',
    lastAction: 'document review · 142 days ago',
  },
  internalBindingNote: 'binding: claim_case_age · fresh 18m',
  couplingExternal: {
    pattern: 'regional news mention + claimant social activity',
    bullets: [
      'regional news: Tribun Jambi + Detik',
      'claimant social: 3 TikTok posts',
      'amplifier engaged: @LBHJakarta',
    ],
  },
  couplingInternal: {
    pattern: 'case age > SLA AND open status',
    bullets: [
      'binding claim_case_age · fresh 18m',
      'case age 487d > SLA 90d',
      'status: open / ACK',
    ],
  },
  couplingMatchedAt: '14 May 2026 06:42 WIB',
  couplingSignature: 'claim_processing_delay.v3',
  similarCases: [
    {
      id: 'CL-2023-12104',
      region: 'Riau',
      ageDays: 312,
      outcome: 'resolved (preemptive disbursement)',
    },
    {
      id: 'CL-2023-08821',
      region: 'Sumut',
      ageDays: 256,
      outcome: 'resolved (escalation to direksi)',
    },
    {
      id: 'Jambi 2024 · golden',
      region: 'Jambi',
      ageDays: 1080,
      outcome: 'canonical case · detected month 36 manually',
      isGolden: true,
    },
  ],
  mam: {
    response: 'AVOID',
    action: 'preemptive_disbursement_review',
    executor: 'claims_operations_manager · Jambi region',
    slaWindow: '1–3 days',
    rationale:
      'claimant identity public, amplifier credibility high (0.85), case is operationally resolvable within SLA',
    requiresApproval: true,
  },
  scoreFactors: [
    { label: 'public_exposure', value: 0.91, weight: 0.25, contribution: 0.23 },
    { label: 'SLA breach factor', value: 0.95, weight: 0.3, contribution: 0.29 },
    { label: 'amplifier_weight', value: 0.88, weight: 0.2, contribution: 0.18 },
    { label: 'momentum (24h)', value: 0.71, weight: 0.15, contribution: 0.11 },
    { label: 'confidence_score', value: 0.91, weight: 0.1, contribution: 0.09 },
  ],
  signalTimeline: [
    {
      time: '06:12',
      source: 'Detik.com',
      credibility: 0.75,
      extractionConfidence: 0.94,
      claim:
        "Article 'Kasus santunan Jambi: keluarga korban kembali bersuara' — entity-linked to claimant",
    },
    {
      time: '06:18',
      source: 'X',
      credibility: 0.4,
      extractionConfidence: 0.87,
      claim:
        '@LBHJakarta thread mentioning long-pending Jasa Raharja claims, names CL-2024-08731',
    },
    {
      time: '06:42',
      source: 'internal',
      credibility: null,
      extractionConfidence: null,
      claim:
        'coupling_signature match emitted — composite_priority 0.89 — routed to worklist',
    },
    {
      time: '07:10',
      source: 'TikTok',
      credibility: 0.4,
      extractionConfidence: 0.81,
      claim: '@keluargakorbanjambi posts video, 14k views in 1h',
    },
    {
      time: '09:00',
      source: 'OJK',
      credibility: 0.9,
      extractionConfidence: 0.96,
      claim:
        'OJK consumer protection bulletin references Jambi pattern (linked event)',
    },
  ],
  evalGroundTruth: {
    label: 'true positive',
    expectedSeverity: 0.85,
    detectedMonth: 6,
    groundTruthMonth: 36,
  },
};

const krlBekasiEvent: RiskEvent = {
  id: 'krl-bekasi-surge',
  title: 'Mass casualty + claim surge · KRL Bekasi',
  region: 'Bekasi',
  regionCode: 'ID-JB',
  detectedAgo: '2h ago',
  eventType: 'mass_casualty_event',
  severity: 'HIGH',
  status: 'NEW',
  priorityScore: 0.76,
  severityScore: 0.78,
  momentumPct: 92,
  confidenceScore: 0.84,
  tags: ['operational', 'regulatory'],
  amplifierActive: true,
  worklistLine1: '16 cases opened today · regional',
  worklistLine2: 'Detik + Kompas · DPR Komisi V query',
  externalMentionCount: 38,
  externalSince: '14 May 11:18',
  amplifiers: [
    {
      handle: 'DPR Komisi V',
      kind: 'regulator',
      credibility: 0.9,
      detail: 'formal inquiry',
      tone: 'high',
    },
    {
      handle: 'Kompas.id',
      kind: 'journalist',
      credibility: 0.85,
      detail: 'lead article',
      tone: 'med',
    },
  ],
  provenance: [
    {
      source: 'Detik.com',
      when: '1h ago',
      credibility: 0.75,
      headline: '16 korban kecelakaan KRL Bekasi · daftar santunan dibuka',
    },
    {
      source: 'Kompas.id',
      when: '1h ago',
      credibility: 0.85,
      headline:
        'DPR Komisi V minta Jasa Raharja percepat pencairan santunan korban KRL',
    },
    {
      source: 'X',
      when: '40m ago',
      credibility: 0.5,
      headline: '@KomisiVDPR thread on insurance response time',
    },
    {
      source: 'TikTok',
      when: '2h ago',
      credibility: 0.4,
      headline: 'Family video at Bekasi station appealing for help',
    },
  ],
  velocityNote: '+92% mention growth in 2h · 11 outlets cumulative',
  internalCase: {
    caseId: 'BATCH-KRL-BEKASI-2026-05-14',
    claimant: '16 claimants · masked',
    region: 'ID-JB',
    ageDays: 0,
    slaText: 'opened today',
    slaBreach: false,
    status: 'NEW',
    lastAction: 'batch intake · 1h ago',
  },
  internalBindingNote: 'binding: incident_log · fresh 9m',
  couplingExternal: {
    pattern: 'regulator query + national press lead',
    bullets: [
      'regulator engaged: DPR Komisi V',
      'national press lead: Kompas.id + Detik',
      'velocity above threshold (+92%/h)',
    ],
  },
  couplingInternal: {
    pattern: 'batch claim intake · same incident_id',
    bullets: [
      'incident_id matched 16 cases',
      'intake within 24h window',
      'all cases NEW status',
    ],
  },
  couplingMatchedAt: '14 May 2026 12:08 WIB',
  couplingSignature: 'mass_casualty_event.v2',
  similarCases: [
    {
      id: 'INCIDENT-LAMPUNG-2024-03',
      region: 'Lampung',
      ageDays: 0,
      outcome: 'resolved (fast-track disbursement)',
    },
  ],
  mam: {
    response: 'REDUCE',
    action: 'mass_casualty_fasttrack',
    executor: 'regional_ops_director · Jawa Barat',
    slaWindow: '24h',
    rationale:
      'regulator query active, public attention concentrated, fast-track playbook reduces severity escalation',
    requiresApproval: true,
  },
  scoreFactors: [
    { label: 'public_exposure', value: 0.86, weight: 0.25, contribution: 0.22 },
    { label: 'momentum (24h)', value: 0.92, weight: 0.2, contribution: 0.18 },
    { label: 'amplifier_weight', value: 0.85, weight: 0.2, contribution: 0.17 },
    { label: 'severity_signal', value: 0.78, weight: 0.25, contribution: 0.19 },
    { label: 'confidence_score', value: 0.84, weight: 0.1, contribution: 0.08 },
  ],
  signalTimeline: [
    {
      time: '11:18',
      source: 'Detik.com',
      credibility: 0.75,
      extractionConfidence: 0.92,
      claim: 'Article opens — 16 reported casualties at KRL Bekasi station',
    },
    {
      time: '11:42',
      source: 'internal',
      credibility: null,
      extractionConfidence: null,
      claim: 'batch intake of 16 claims, all incident_id KRL-BEK-2026-05-14',
    },
    {
      time: '12:08',
      source: 'internal',
      credibility: null,
      extractionConfidence: null,
      claim: 'coupling match emitted · priority 0.76',
    },
    {
      time: '12:30',
      source: 'Kompas.id',
      credibility: 0.85,
      extractionConfidence: 0.94,
      claim: 'DPR Komisi V formally requests fast-track response',
    },
  ],
  evalGroundTruth: {
    label: 'true positive',
    expectedSeverity: 0.8,
    detectedMonth: 0,
    groundTruthMonth: 0,
  },
};

const sumselDenialEvent: RiskEvent = {
  id: 'sumsel-denial-cluster',
  title: 'Denial cluster · Sumatra Selatan',
  region: 'Sumatra Selatan',
  regionCode: 'ID-SS',
  detectedAgo: '1d ago',
  eventType: 'claim_denial_dispute',
  severity: 'HIGH',
  status: 'ACK',
  priorityScore: 0.71,
  severityScore: 0.68,
  momentumPct: 15,
  confidenceScore: 0.79,
  tags: ['reputational'],
  amplifierActive: true,
  worklistLine1: '12 disputed denials · 4 unique claimants amplifying',
  worklistLine2: 'LBH Palembang engagement · TikTok',
  externalMentionCount: 21,
  externalSince: '13 May 14:00',
  amplifiers: [
    {
      handle: 'LBH Palembang',
      kind: 'consumer_advocacy',
      credibility: 0.78,
      detail: '5 posts',
      tone: 'high',
    },
  ],
  provenance: [
    {
      source: 'TikTok',
      when: '1d ago',
      credibility: 0.4,
      headline: '@klaimditolak — 4 testimonial videos compiled',
    },
    {
      source: 'X',
      when: '22h ago',
      credibility: 0.5,
      headline: 'LBH Palembang thread on disputed denials, names 12 cases',
    },
    {
      source: 'Tribun Sumsel',
      when: '18h ago',
      credibility: 0.6,
      headline: 'Sengketa klaim · LBH dukung 12 pemohon',
    },
  ],
  velocityNote: 'Steady drumbeat — no spike but persistent across 24h',
  internalCase: {
    caseId: 'CLUSTER-SS-2026-05',
    claimant: '12 cases · region cluster',
    region: 'ID-SS',
    ageDays: 38,
    slaText: '30d · breach 1.3×',
    slaBreach: true,
    status: 'ACK',
    lastAction: 'denial reviews · ongoing',
  },
  internalBindingNote: 'binding: denial_records · fresh 1h',
  couplingExternal: {
    pattern: 'advocacy thread + regional press follow-on',
    bullets: [
      'advocacy thread (LBH Palembang)',
      'regional press follow-on (Tribun Sumsel)',
      '4 claimant videos clustered',
    ],
  },
  couplingInternal: {
    pattern: 'denied claims in region above baseline',
    bullets: [
      '12 denied claims in 30d window',
      'baseline 4 / 30d · 3× elevation',
      'all linked by region cluster',
    ],
  },
  couplingMatchedAt: '13 May 2026 14:20 WIB',
  couplingSignature: 'claim_denial_dispute.v2',
  similarCases: [],
  mam: {
    response: 'REDUCE',
    action: 'denial_review_panel',
    executor: 'regional_legal_lead · Sumsel',
    slaWindow: '5 days',
    rationale: 'volume sufficient to merit panel review; advocacy actor credible',
    requiresApproval: true,
  },
  scoreFactors: [
    { label: 'cluster_volume', value: 0.82, weight: 0.3, contribution: 0.25 },
    { label: 'amplifier_weight', value: 0.78, weight: 0.2, contribution: 0.16 },
    { label: 'public_exposure', value: 0.62, weight: 0.2, contribution: 0.12 },
    { label: 'severity_signal', value: 0.68, weight: 0.2, contribution: 0.14 },
    { label: 'confidence_score', value: 0.79, weight: 0.1, contribution: 0.08 },
  ],
  signalTimeline: [
    {
      time: '13 May 14:00',
      source: 'TikTok',
      credibility: 0.4,
      extractionConfidence: 0.83,
      claim: 'First claimant video posted in cluster',
    },
    {
      time: '13 May 14:20',
      source: 'internal',
      credibility: null,
      extractionConfidence: null,
      claim: 'coupling match · 12 denied claims clustered',
    },
  ],
  evalGroundTruth: {
    label: 'true positive',
    expectedSeverity: 0.7,
    detectedMonth: 1,
    groundTruthMonth: 4,
  },
};

const ojkQueryEvent: RiskEvent = {
  id: 'ojk-jambi-pattern',
  title: 'OJK consumer query · Jambi pattern',
  region: 'national',
  regionCode: 'ID',
  detectedAgo: '4h ago',
  eventType: 'regulatory_query',
  severity: 'HIGH',
  status: 'NEW',
  priorityScore: 0.68,
  severityScore: 0.74,
  momentumPct: 12,
  confidenceScore: 0.93,
  tags: ['regulatory'],
  amplifierActive: false,
  worklistLine1: 'OJK formal request for case data on long-pending pattern',
  worklistLine2: 'Linked to event #0.89 above (Jambi)',
  externalMentionCount: 3,
  externalSince: '14 May 09:00',
  amplifiers: [
    {
      handle: 'OJK consumer protection',
      kind: 'regulator',
      credibility: 0.95,
      detail: 'formal letter + bulletin',
      tone: 'high',
    },
  ],
  provenance: [
    {
      source: 'OJK',
      when: '4h ago',
      credibility: 0.95,
      headline: 'OJK formal request · long-pending claim pattern in Jambi region',
    },
    {
      source: 'Bisnis.com',
      when: '3h ago',
      credibility: 0.75,
      headline: 'OJK soroti pola klaim tertunda Jasa Raharja di Jambi',
    },
  ],
  velocityNote: 'Low velocity · regulator-driven, not public-driven',
  internalCase: {
    caseId: 'OJK-REQ-2026-05-14-001',
    claimant: 'regulator request · 22 case IDs attached',
    region: 'ID-JA',
    ageDays: 0,
    slaText: '14d response window',
    slaBreach: false,
    status: 'NEW',
    lastAction: 'received · 4h ago',
  },
  internalBindingNote: 'binding: regulator_inbox · fresh 6m',
  couplingExternal: {
    pattern: 'formal regulator request · written',
    bullets: [
      'OJK letter received via regulator_inbox',
      '22 case IDs explicitly named',
      'public bulletin published downstream',
    ],
  },
  couplingInternal: {
    pattern: '≥10 case IDs in regulator query match open cases',
    bullets: [
      '22 case IDs in OJK request',
      '19 of 22 match open / ACK cases in system',
      'overlap with active Jambi event',
    ],
  },
  couplingMatchedAt: '14 May 2026 09:06 WIB',
  couplingSignature: 'regulatory_query.v1',
  similarCases: [
    {
      id: 'OJK-REQ-2024-11',
      region: 'national',
      ageDays: 0,
      outcome: 'responded · 12d turnaround',
    },
  ],
  mam: {
    response: 'TRANSFER',
    action: 'regulator_response_package',
    executor: 'corporate_secretary',
    slaWindow: '14 days',
    rationale:
      'formal regulator request; ownership belongs at corporate secretary, not analyst',
    requiresApproval: true,
  },
  scoreFactors: [
    { label: 'regulator_credibility', value: 0.95, weight: 0.35, contribution: 0.33 },
    { label: 'case_overlap', value: 0.86, weight: 0.25, contribution: 0.22 },
    { label: 'severity_signal', value: 0.74, weight: 0.2, contribution: 0.15 },
    { label: 'public_exposure', value: 0.4, weight: 0.1, contribution: 0.04 },
    { label: 'confidence_score', value: 0.93, weight: 0.1, contribution: 0.09 },
  ],
  signalTimeline: [
    {
      time: '09:00',
      source: 'OJK',
      credibility: 0.95,
      extractionConfidence: 0.96,
      claim: 'OJK formal letter received via regulator_inbox',
    },
    {
      time: '09:06',
      source: 'internal',
      credibility: null,
      extractionConfidence: null,
      claim: 'coupling match · 19 of 22 case IDs overlap open cases',
    },
    {
      time: '10:30',
      source: 'Bisnis.com',
      credibility: 0.75,
      extractionConfidence: 0.9,
      claim: 'Public coverage of OJK bulletin',
    },
  ],
  evalGroundTruth: {
    label: 'true positive',
    expectedSeverity: 0.72,
    detectedMonth: 0,
    groundTruthMonth: 0,
  },
};

export const RISK_EVENTS: RiskEvent[] = [
  jambiEvent,
  krlBekasiEvent,
  sumselDenialEvent,
  ojkQueryEvent,
];

export const RISK_EVENT_INDEX: Record<string, RiskEvent> = Object.fromEntries(
  RISK_EVENTS.map((e) => [e.id, e]),
);

export function getRiskEvent(id: string | undefined): RiskEvent | undefined {
  if (!id) return undefined;
  return RISK_EVENT_INDEX[id];
}

// Medium-severity stubs shown collapsed in the worklist
export const MED_STUB_EVENTS: WorklistStubEvent[] = [
  {
    id: 'surabaya-disbursement-delay',
    priorityScore: 0.54,
    severity: 'MED',
    status: 'IN_PROGRESS',
    title: 'Disbursement delay · Surabaya',
    ageText: '8h',
    summary: 'single case amplified · local press',
  },
  {
    id: 'fraud-multi-claim-cluster',
    priorityScore: 0.51,
    severity: 'MED',
    status: 'ACK',
    title: 'Fraud indicator · multi-claim cluster',
    ageText: '5h',
    summary: 'internal flag · no external coverage yet',
  },
  {
    id: 'medan-claimant-campaign',
    priorityScore: 0.48,
    severity: 'MED',
    status: 'NEW',
    title: 'Claimant social campaign · Medan',
    ageText: '11h',
    summary: 'Instagram reels · low amp credibility',
  },
  {
    id: 'pekanbaru-regional-news',
    priorityScore: 0.41,
    severity: 'MED',
    status: 'SNOOZED',
    title: 'Regional news · disbursement timing',
    ageText: '2d',
    summary: 'Tribun Pekanbaru · single article',
  },
  {
    id: 'dprd-tweet-medan',
    priorityScore: 0.38,
    severity: 'MED',
    status: 'NEW',
    title: 'DPRD member tweet · service quality',
    ageText: '3h',
    summary: 'low reach amplifier · single mention',
  },
  {
    id: 'portal-complaints-aggregator',
    priorityScore: 0.34,
    severity: 'MED',
    status: 'ACK',
    title: 'Claim portal complaints · aggregator',
    ageText: '1d',
    summary: 'OJK aggregator · 7 complaints',
  },
  {
    id: 'tiktok-response-time',
    priorityScore: 0.31,
    severity: 'MED',
    status: 'NEW',
    title: 'Social cluster · accident response time',
    ageText: '9h',
    summary: 'TikTok · pre-amplifier',
  },
  {
    id: 'aceh-bahasa-daerah',
    priorityScore: 0.29,
    severity: 'MED',
    status: 'NEW',
    title: 'Bahasa daerah social mentions · Aceh',
    ageText: '6h',
    summary: 'language normalization · low confidence',
  },
];

export const WORKLIST_STATS = {
  open: 12,
  high: 4,
  medium: 8,
  low: 0,
  lastRefresh: '2m ago',
} as const;

export const DEGRADED_SOURCES = {
  count: 2,
  detail: 'Tribun regional · down · 14h. Affects regional outage detection.',
} as const;
