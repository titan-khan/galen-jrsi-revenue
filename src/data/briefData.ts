// Mock data for the Brief (monitor setup) wizard.
// Maps to risk-v0-1/project/wireframes/intent.jsx.

export type ChipTone = 'default' | 'destructive' | 'amber' | 'primary' | 'emerald';
export type SourceStatus = 'recommended' | 'optional' | 'limited';
export type SourceTier = 0 | 1 | 2 | 3;

export interface BriefChip {
  label: string;
  tone?: ChipTone;
  suggested?: boolean;
}

export interface ExtractedField {
  key: string;
  label: string;
  hint: string;
  suggestedCount: number;
  chips: BriefChip[];
}

export interface InternalSystem {
  name: string;
  status: 'ok' | 'partial' | 'missing';
  detail: string;
}

export interface SampleMatch {
  source: string;
  age: string;
  body: string;
  tone: ChipTone;
  tag: string;
}

export const BRIEF_DEFAULT_TEXT =
  "Pantau keluhan publik soal santunan Jasa Raharja yang lambat atau ditolak — terutama di X, TikTok, dan media regional. Fokus ke kasus yang ada nomor klaim atau lokasi spesifik, plus mass-casualty event (kecelakaan beruntun, banjir besar) yang bisa picu klaim massal. Skip topik politik & iklan.";

// Pre-seeded briefs used when "Promote to monitor" arrives with a ?from= param.
// Keyed by research thread id.
export const PROMOTED_BRIEFS: Record<string, { text: string; sourceTitle: string }> = {
  'karawang-q1': {
    sourceTitle: 'Karawang claim delays · March 2026',
    text:
      'Watch Karawang & Bekasi branches for repeat of the March claim_processing_delay spike — both mass_casualty_event and SLA-breach claims. Focus on Cipali corridor; flag any single-day intake > 10 claims tied to a verified incident. Watch for viral complaints amplified by @LBHJakarta and TikTok within 48h of incident.',
  },
};

export const BRIEF_TEMPLATES = [
  'insurance claim grievances · ID',
  'fraud / collusion patterns',
  'mass casualty alerting',
  '+ blank',
] as const;

export const BRIEF_EXTRACTED: ExtractedField[] = [
  {
    key: 'entities',
    label: 'Watchlist entities',
    hint: 'organisations, brands, handles',
    suggestedCount: 2,
    chips: [
      { label: 'Jasa Raharja' },
      { label: '@JasaRaharja_RI' },
      { label: 'JR santunan' },
      { label: 'JR korban' },
      { label: 'BPJS Ketenagakerjaan', tone: 'primary', suggested: true },
      { label: 'Asuransi Jasindo', tone: 'primary', suggested: true },
    ],
  },
  {
    key: 'event-types',
    label: 'Event types to detect',
    hint: 'from JRSI taxonomy v3',
    suggestedCount: 1,
    chips: [
      { label: 'claim_processing_delay', tone: 'destructive' },
      { label: 'claim_denial_dispute', tone: 'destructive' },
      { label: 'mass_casualty_event', tone: 'amber' },
      { label: 'fraud_indicator_pattern', tone: 'amber' },
      { label: 'regulatory_inquiry', tone: 'primary', suggested: true },
    ],
  },
  {
    key: 'geo',
    label: 'Geographic scope',
    hint: 'ISO 3166-2',
    suggestedCount: 0,
    chips: [
      { label: 'ID (national)' },
      { label: 'ID-JK Jakarta', tone: 'amber' },
      { label: 'ID-JB Jawa Barat', tone: 'amber' },
      { label: 'ID-JI Jawa Timur', tone: 'amber' },
    ],
  },
  {
    key: 'amplifiers',
    label: 'Amplifiers to watch',
    hint: 'advocacy + watchdog accounts',
    suggestedCount: 1,
    chips: [
      { label: '@LBHJakarta' },
      { label: '@LBHIndonesia' },
      { label: '@YLKI_id' },
      { label: '@OmbudsmanRI137', tone: 'primary', suggested: true },
    ],
  },
];

export const BRIEF_TENANT = {
  name: 'Jasa Raharja',
  kind: 'BUMN · insurance',
  detail: 'Mandatory accident insurance, ID · 33 branches',
};

export const INTERNAL_SYSTEMS: InternalSystem[] = [
  { name: 'jrsi_claims', status: 'ok', detail: '2.3M records · case_id format ok' },
  { name: 'jrsi_customers', status: 'ok', detail: '5.8M records' },
  { name: 'branch_directory', status: 'ok', detail: '33 locations geocoded' },
  { name: 'fraud_flags', status: 'partial', detail: 'partial · last sync 6d ago' },
  { name: 'call_center_tickets', status: 'missing', detail: 'not bound · connect to enable' },
];

export const BRIEF_SAMPLE_MATCHES: SampleMatch[] = [
  {
    source: 'X · 2d ago',
    age: '2d ago',
    body: '@user · "sudah 8 bulan tunggu santunan…"',
    tone: 'destructive',
    tag: 'claim_delay · Karawang',
  },
  {
    source: 'Detik · 4d ago',
    age: '4d ago',
    body: 'Kecelakaan beruntun tol Cipali, 6 korban',
    tone: 'amber',
    tag: 'mass_casualty · ID-JB',
  },
  {
    source: 'TikTok · 5d ago',
    age: '5d ago',
    body: 'review klaim ditolak tanpa alasan',
    tone: 'amber',
    tag: 'claim_denial',
  },
];

export const BRIEF_PREVIEW = {
  matchedPerWeek: 64,
  weeklyCouplingEstimate: 9,
};

// ============ Step 2 · Source picker ============

export interface SourceCandidate {
  id: string;
  category: 'social' | 'news' | 'regulatory';
  name: string;
  adapter: string;
  tier: SourceTier;
  credibility: number;
  coverage: number;
  costLabel: string;
  language: string;
  status: SourceStatus;
  on: boolean;
}

export const SOURCE_CANDIDATES: SourceCandidate[] = [
  // Social
  { id: 'x', category: 'social', name: 'X firehose', adapter: 'XStreamAdapter', tier: 3, credibility: 0.4, coverage: 92, costLabel: '$3.4k', language: 'id, en', status: 'recommended', on: true },
  { id: 'tiktok', category: 'social', name: 'TikTok aggregator', adapter: 'TikTokAggAdapter', tier: 2, credibility: 0.55, coverage: 71, costLabel: '$1.8k', language: 'id', status: 'recommended', on: true },
  { id: 'instagram', category: 'social', name: 'Instagram public', adapter: 'IGPublicAdapter', tier: 2, credibility: 0.5, coverage: 48, costLabel: '$1.2k', language: 'id', status: 'optional', on: false },
  { id: 'youtube', category: 'social', name: 'YouTube comments', adapter: 'YTCommentAdapter', tier: 2, credibility: 0.45, coverage: 32, costLabel: '$680', language: 'id', status: 'limited', on: false },
  // News
  { id: 'detik', category: 'news', name: 'Detik.com', adapter: 'news_api', tier: 1, credibility: 0.78, coverage: 84, costLabel: '$620', language: 'id', status: 'recommended', on: true },
  { id: 'kompas', category: 'news', name: 'Kompas.com', adapter: 'news_api', tier: 1, credibility: 0.82, coverage: 78, costLabel: '$440', language: 'id', status: 'recommended', on: true },
  { id: 'tribun', category: 'news', name: 'Tribun network', adapter: 'rss + scraper', tier: 1, credibility: 0.65, coverage: 65, costLabel: '$105', language: 'id', status: 'recommended', on: true },
  { id: 'tempo', category: 'news', name: 'Tempo', adapter: 'news_api', tier: 1, credibility: 0.85, coverage: 42, costLabel: '$240', language: 'id', status: 'optional', on: false },
  // Regulatory
  { id: 'ojk', category: 'regulatory', name: 'OJK consumer feed', adapter: 'ojk_feed', tier: 0, credibility: 0.95, coverage: 28, costLabel: 'free', language: 'id', status: 'recommended', on: true },
  { id: 'korlantas', category: 'regulatory', name: 'Korlantas POLRI', adapter: 'korlantas_feed', tier: 0, credibility: 0.9, coverage: 18, costLabel: 'free', language: 'id', status: 'recommended', on: true },
  { id: 'bmkg', category: 'regulatory', name: 'BMKG', adapter: 'bmkg_feed', tier: 0, credibility: 0.92, coverage: 11, costLabel: 'free', language: 'id', status: 'limited', on: false },
  { id: 'lbh', category: 'regulatory', name: 'LBH press releases', adapter: 'lbh_rss', tier: 0, credibility: 0.8, coverage: 22, costLabel: 'free', language: 'id', status: 'optional', on: false },
];

export const BUNDLE_SUMMARY = {
  totalSpendLabel: '$6.4k',
  budgetLabel: '$9k',
  spendPct: 71,
  briefCoverage: 94,
  coverageBreakdown: [
    { label: 'claim_processing_delay', value: 96, tone: 'emerald' as const },
    { label: 'claim_denial_dispute', value: 91, tone: 'emerald' as const },
    { label: 'mass_casualty_event', value: 98, tone: 'emerald' as const },
    { label: 'fraud_indicator_pattern', value: 62, tone: 'amber' as const, note: 'weak' },
  ],
  bindingCallout:
    'Fraud signal lives mostly in call_center_tickets — internal, not external. Connect that binding to lift coverage to 89%.',
  throughput: [
    { label: 'signals / day', value: '≈ 3.6k' },
    { label: 'after Tier-A triage', value: '≈ 150' },
    { label: 'coupling events / week', value: '≈ 14' },
    { label: 'cost per coupling event', value: '≈ $3.20', tone: 'emerald' as const },
  ],
};

// ============ Step 3 · Readiness ============

export interface ReadinessCheck {
  state: 'ok' | 'warn' | 'fail';
  label: string;
  detail: string;
}

export interface CouplingSignatureItem {
  signature: string;
  binding: string;
  tone: ChipTone;
}

export const READINESS_FLOW = [
  { label: 'your brief', sub: '4 entities · 4 event types · ID' },
  { label: '8 external sources', sub: 'X · TikTok · Detik · Kompas · Tribun · OJK · Korlantas · LBH' },
  { label: 'specialist pipeline', sub: '10 stages · Tier-A → Tier-B', tone: 'amber' as const },
  { label: 'coupling events', sub: 'matched against internal records', tone: 'destructive' as const },
  { label: 'Worklist', sub: 'analyst entry point' },
];

export const READINESS_CHECKS: ReadinessCheck[] = [
  { state: 'ok', label: 'Brief parsed · tenantConfig generated', detail: '4 entities · 4 event types · ID national + 3 priority provinces' },
  { state: 'ok', label: '8 source adapters configured', detail: 'credentials present · rate limits known · sample fetches passed' },
  { state: 'ok', label: 'Specialist pipeline armed', detail: '10 stages registered · LLM keys validated · Tier-A threshold 0.5' },
  { state: 'ok', label: '3 internal bindings active', detail: 'jrsi_claims · jrsi_customers · branch_directory' },
  { state: 'warn', label: '1 internal binding partial', detail: 'fraud_flags 6d stale · fraud coverage capped at 62% until sync runs' },
  { state: 'warn', label: '1 amplifier needs approval', detail: '@OmbudsmanRI137 added by AI · review before enabling' },
];

export const COUPLING_SIGNATURES: CouplingSignatureItem[] = [
  { signature: 'claim_processing_delay.v3', binding: '→ jrsi_claims · case_age > sla AND open', tone: 'destructive' },
  { signature: 'claim_denial_dispute.v2', binding: '→ jrsi_claims · status = denied AND age < 30d', tone: 'amber' },
  { signature: 'mass_casualty_event.v1', binding: '→ branch_directory · region match + claim spike', tone: 'amber' },
  { signature: 'fraud_indicator_pattern.v0', binding: '→ fraud_flags · partial · needs sync', tone: 'default' },
];

export const FORECAST_30D = {
  couplingEvents: 67,
  highPriority: 9,
  estSpend: '$215',
  note:
    'Includes 7-day backfill. Live volume settles to ~14 events/week after week 1 as active discovery tunes the query.',
};

export const ROUTING_DAY1 = [
  { severity: 'HIGH', destination: 'Slack #risk-lens + email to Director Operasional' },
  { severity: 'MED', destination: 'Worklist only' },
  { severity: 'LOW', destination: 'indexed · not surfaced' },
];
