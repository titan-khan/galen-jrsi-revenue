-- Add validation_result column to skill_executions for output validation tracking
-- This is informational only — validation does not block output
ALTER TABLE public.skill_executions
  ADD COLUMN IF NOT EXISTS validation_result jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.skill_executions.validation_result IS
  'Output validation results: { isValid, warnings[], sectionsFound[], sectionsMissing[] }. Informational only — does not block output.';
