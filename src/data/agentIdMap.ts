// =============================================================================
// Agent/Specialist ID Mapping
// Maps legacy string IDs to stable UUIDs from the seed migration
// =============================================================================

// Specialist UUIDs (entity_type = 'specialist')
export const SPECIALIST_IDS = {
  OTP: 'a1b2c3d4-0001-4000-8000-000000000001',
  REVENUE: 'a1b2c3d4-0002-4000-8000-000000000002',
  NPS: 'a1b2c3d4-0003-4000-8000-000000000003',
  CREW: 'a1b2c3d4-0004-4000-8000-000000000004',
  CONVERSION: 'a1b2c3d4-0005-4000-8000-000000000005',
} as const;

// Agent UUIDs (entity_type = 'agent')
export const AGENT_IDS = {
  REVENUE_MONITOR: 'b1c2d3e4-0001-4000-8000-000000000001',
  SATISFACTION_TRACKER: 'b1c2d3e4-0002-4000-8000-000000000002',
  FLEET_OPTIMIZER: 'b1c2d3e4-0003-4000-8000-000000000003',
  FUNNEL_ANALYST: 'b1c2d3e4-0004-4000-8000-000000000004',
  MARGIN_GUARDIAN: 'b1c2d3e4-0005-4000-8000-000000000005',
} as const;

// Maps old string IDs → new stable UUIDs
export const LEGACY_ID_MAP: Record<string, string> = {
  // Specialists
  'specialist-otp-transportx': SPECIALIST_IDS.OTP,
  'specialist-revenue-transportx': SPECIALIST_IDS.REVENUE,
  'specialist-nps-transportx': SPECIALIST_IDS.NPS,
  'specialist-crew-transportx': SPECIALIST_IDS.CREW,
  'specialist-conversion-transportx': SPECIALIST_IDS.CONVERSION,
  // Agents
  'agent-revenue-001': AGENT_IDS.REVENUE_MONITOR,
  'agent-nps-002': AGENT_IDS.SATISFACTION_TRACKER,
  'agent-ops-003': AGENT_IDS.FLEET_OPTIMIZER,
  'agent-funnel-004': AGENT_IDS.FUNNEL_ANALYST,
  'agent-margin-005': AGENT_IDS.MARGIN_GUARDIAN,
};

/** Resolve a potentially-legacy ID to its UUID. Returns the input unchanged if not legacy. */
export function resolveId(id: string): string {
  return LEGACY_ID_MAP[id] || id;
}
