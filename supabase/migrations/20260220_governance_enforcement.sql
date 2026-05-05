-- =============================================================================
-- Governance Enforcement: Schema additions for post-parse validation
-- Adds validation_result tracking and formalizes previously untracked columns
-- =============================================================================

-- 1. Add validation_result column to agent_runs for tracking governance compliance
ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS validation_result jsonb;

COMMENT ON COLUMN public.agent_runs.validation_result IS
  'Post-parse governance validation result: { isValid, warningCount, autoFixCount, warnings[] }';

-- 2. Formalize previously untracked columns on agent_recommendations (WP-6)
-- These columns are already written by run-specialist but were never in a migration.
-- Using IF NOT EXISTS makes this idempotent — safe if columns already exist.
ALTER TABLE public.agent_recommendations
  ADD COLUMN IF NOT EXISTS impact_type text DEFAULT 'efficiency',
  ADD COLUMN IF NOT EXISTS impact_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impact_currency text DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS impact_confidence integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS structured_content jsonb,
  ADD COLUMN IF NOT EXISTS deadline text;

COMMENT ON COLUMN public.agent_recommendations.impact_type IS 'Type: revenue, cost, risk, or efficiency';
COMMENT ON COLUMN public.agent_recommendations.impact_value IS 'Estimated IDR impact value';
COMMENT ON COLUMN public.agent_recommendations.structured_content IS 'McKinsey-style: { current_state, target_state, calculation, quarterly_impact, tactics }';

-- 3. Index for querying runs by validation status
CREATE INDEX IF NOT EXISTS idx_agent_runs_validation
  ON public.agent_runs USING GIN (validation_result);
