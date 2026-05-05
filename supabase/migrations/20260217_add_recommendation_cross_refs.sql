-- Add cross-referencing columns to agent_recommendations
-- Enables explicit mapping: recommendation → root cause → insight

ALTER TABLE public.agent_recommendations
  ADD COLUMN IF NOT EXISTS root_cause_rank integer,
  ADD COLUMN IF NOT EXISTS action_scope text DEFAULT 'tactical'
    CHECK (action_scope IN ('strategic', 'tactical')),
  ADD COLUMN IF NOT EXISTS insight_id text;

COMMENT ON COLUMN public.agent_recommendations.root_cause_rank IS 'Rank of the root cause this recommendation addresses (1 = most impactful)';
COMMENT ON COLUMN public.agent_recommendations.action_scope IS 'Whether this is a strategic (org-level) or tactical (per-topic) action';
COMMENT ON COLUMN public.agent_recommendations.insight_id IS 'ID of the primary insight this recommendation relates to';
