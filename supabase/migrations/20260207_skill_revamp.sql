-- =============================================================================
-- SKILL SYSTEM REVAMP — Progressive Disclosure & Pipeline Support
-- Adds new columns to agent_skills for SKILL.md alignment
-- Adds skill_pipelines table for composable skill chaining
-- =============================================================================

-- Phase 1: Add new progressive-disclosure columns to agent_skills
ALTER TABLE public.agent_skills
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'builtin',
  ADD COLUMN IF NOT EXISTS trigger_phrases text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS input_spec jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS output_spec jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skill_md_body text,
  ADD COLUMN IF NOT EXISTS query_context_spec jsonb,
  ADD COLUMN IF NOT EXISTS execution_config jsonb,
  ADD COLUMN IF NOT EXISTS pipeline_position jsonb;

-- Add check constraint for source_type
ALTER TABLE public.agent_skills
  ADD CONSTRAINT chk_source_type CHECK (source_type IN ('builtin', 'uploaded'));

-- Index for trigger phrase search (GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_agent_skills_trigger_phrases
  ON public.agent_skills USING GIN (trigger_phrases);

-- Index for source_type filtering
CREATE INDEX IF NOT EXISTS idx_agent_skills_source_type
  ON public.agent_skills(source_type);

-- Index for category + active filtering (common query pattern)
CREATE INDEX IF NOT EXISTS idx_agent_skills_category_active
  ON public.agent_skills(category, is_active);

-- Phase 2: Skill pipelines table for composable chaining
CREATE TABLE IF NOT EXISTS public.skill_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]',
  -- steps format: [{ "skillId": uuid, "order": int, "passthroughMap": {}, "condition": "" }]
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for skill_pipelines
ALTER TABLE public.skill_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on skill_pipelines"
  ON public.skill_pipelines FOR SELECT USING (true);

CREATE POLICY "Allow public insert on skill_pipelines"
  ON public.skill_pipelines FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on skill_pipelines"
  ON public.skill_pipelines FOR UPDATE USING (true);

-- Auto-update timestamp
CREATE TRIGGER update_skill_pipelines_updated_at
  BEFORE UPDATE ON public.skill_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 3: Add error tracking columns to skill_executions
ALTER TABLE public.skill_executions
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS is_retryable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_id uuid,
  ADD COLUMN IF NOT EXISTS pipeline_step integer;

-- Phase 4: Backfill trigger_phrases from existing descriptions
UPDATE public.agent_skills SET trigger_phrases = ARRAY['revenue', 'analysis', 'report']
  WHERE name = 'revenue-analysis' AND trigger_phrases = '{}';

UPDATE public.agent_skills SET trigger_phrases = ARRAY['nps', 'customer satisfaction', 'detractor', 'promoter']
  WHERE name = 'nps-analysis' AND trigger_phrases = '{}';

UPDATE public.agent_skills SET trigger_phrases = ARRAY['operational', 'performance', 'otp', 'sla', 'delay']
  WHERE name = 'operational-excellence' AND trigger_phrases = '{}';

UPDATE public.agent_skills SET trigger_phrases = ARRAY['root cause', 'driver', 'anomaly', 'metric']
  WHERE name = 'root-cause-analysis' AND trigger_phrases = '{}';

UPDATE public.agent_skills SET trigger_phrases = ARRAY['executive', 'report', 'dashboard', 'insight']
  WHERE name = 'executive-reporting' AND trigger_phrases = '{}';

-- Phase 5: Backfill query_context_spec from hardcoded routing logic
-- This replaces the hardcoded skill-name routing in the edge function

UPDATE public.agent_skills SET query_context_spec = '[
  {"table": "fact_revenue", "select": ["gross_value_amount", "booking_datetime", "route_id", "customer_id", "origin_city", "destination_city"], "orderBy": {"field": "booking_datetime", "ascending": false}, "limit": 1000},
  {"table": "dim_route", "select": ["route_id", "route_name", "origin_city", "destination_city", "price_card"], "filters": [{"field": "active_flag", "operator": "eq", "value": true}]}
]'::jsonb WHERE name = 'revenue-analysis';

UPDATE public.agent_skills SET query_context_spec = '[
  {"table": "fact_nps_response", "select": ["month", "customer_type", "route_id", "promoters_count", "passives_count", "detractors_count", "total_responses"], "orderBy": {"field": "month", "ascending": false}, "limit": 100},
  {"table": "fact_nps_response_raw", "select": ["month", "customer_type", "route_id", "nps_score", "survey_channel"], "orderBy": {"field": "month", "ascending": false}, "limit": 500}
]'::jsonb WHERE name = 'nps-analysis';

UPDATE public.agent_skills SET query_context_spec = '[
  {"table": "fact_trip", "select": ["trip_id", "trip_date", "trip_status", "is_on_time", "delay_minutes", "route_id", "driver_id", "vehicle_id"], "orderBy": {"field": "trip_date", "ascending": false}, "limit": 1000},
  {"table": "dim_driver", "select": ["driver_id", "driver_name", "employment_type", "experience_years"], "filters": [{"field": "active_flag", "operator": "eq", "value": true}]}
]'::jsonb WHERE name = 'operational-excellence';

UPDATE public.agent_skills SET query_context_spec = '[
  {"table": "fact_revenue", "select": ["gross_value_amount", "booking_datetime", "route_id", "customer_id"], "orderBy": {"field": "booking_datetime", "ascending": false}, "limit": 500},
  {"table": "fact_nps_response", "select": ["*"], "orderBy": {"field": "month", "ascending": false}, "limit": 50},
  {"table": "fact_trip", "select": ["trip_id", "trip_date", "is_on_time", "delay_minutes"], "orderBy": {"field": "trip_date", "ascending": false}, "limit": 500},
  {"table": "dim_customer", "select": ["customer_id", "customer_type", "loyalty_tier", "home_city"], "filters": [{"field": "active_flag", "operator": "eq", "value": true}], "limit": 200}
]'::jsonb WHERE name IN ('root-cause-analysis', 'executive-reporting');

-- Phase 6: Backfill skill_md_body from legacy fields
-- Converts purpose + hard_rules + section_logic + output_template into markdown
UPDATE public.agent_skills SET skill_md_body =
  '# ' || display_name || E'\n\n' ||
  '## Purpose' || E'\n' || purpose || E'\n\n' ||
  '## Hard Rules (CONSTRAINTS)' || E'\n' ||
  (SELECT string_agg('- **' || upper(r->>'category') || '**: ' || (r->>'rule'), E'\n')
   FROM jsonb_array_elements(hard_rules) AS r) || E'\n\n' ||
  '## Section Logic' || E'\n' ||
  (SELECT string_agg('### ' || (s->>'section') || E'\n' ||
    (SELECT string_agg('- ' || rule, E'\n') FROM jsonb_array_elements_text(s->'rules') AS rule),
    E'\n\n')
   FROM jsonb_array_elements(section_logic) AS s) || E'\n\n' ||
  COALESCE('## Confidence Scoring' || E'\n' || (confidence_scoring->>'description') || E'\n' ||
    'Report these metrics: ' || (SELECT string_agg(m, ', ') FROM jsonb_array_elements_text(confidence_scoring->'metrics') AS m) || E'\n\n', '') ||
  '## Output Template' || E'\nFollow this template structure EXACTLY:' || E'\n\n' || output_template
WHERE skill_md_body IS NULL;
