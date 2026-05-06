-- Recommendation governance fields
-- Enables accountability for PKB pilot:
--   - assignee (PIC) — who's responsible for executing the action
--   - approval_note / rejected_note — paper trail for governance decisions
--   - approved_by / rejected_by — actor identity
--   - recommendation_activity_log — full audit trail (created/approved/rejected/reassigned/etc)

ALTER TABLE public.agent_recommendations
  ADD COLUMN IF NOT EXISTS assignee jsonb,
  ADD COLUMN IF NOT EXISTS approval_note text,
  ADD COLUMN IF NOT EXISTS rejected_note text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS rejected_by text;

COMMENT ON COLUMN public.agent_recommendations.assignee IS 'PIC for executing this action: { name, role, unit }';
COMMENT ON COLUMN public.agent_recommendations.approval_note IS 'Note captured when recommendation was approved';
COMMENT ON COLUMN public.agent_recommendations.rejected_note IS 'Reason captured when recommendation was rejected';

CREATE TABLE IF NOT EXISTS public.recommendation_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.agent_recommendations(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'executed', 'measured', 'reassigned')),
  actor text,
  note text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_activity_log_rec
  ON public.recommendation_activity_log (recommendation_id, created_at DESC);

ALTER TABLE public.recommendation_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on recommendation_activity_log"
  ON public.recommendation_activity_log;
CREATE POLICY "Allow public read on recommendation_activity_log"
  ON public.recommendation_activity_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write on recommendation_activity_log"
  ON public.recommendation_activity_log;
CREATE POLICY "Allow public write on recommendation_activity_log"
  ON public.recommendation_activity_log FOR ALL USING (true) WITH CHECK (true);

-- ─── Backfill (idempotent) — pilot demo defaults ─────────────────────
-- Default PIC for any PKB recommendation that has no assignee yet, so the
-- panel renders a populated state instead of "Belum ditugaskan".
UPDATE public.agent_recommendations
SET assignee = jsonb_build_object(
  'name', 'Drs. Ahmad Suryadi',
  'role', 'Kasubid Monitoring PKB',
  'unit', 'Bapenda Kalteng'
)
WHERE assignee IS NULL
  AND structured_content IS NOT NULL;

-- Seed a 'created' activity log entry for each rec that has none yet.
INSERT INTO public.recommendation_activity_log (recommendation_id, action, actor, note, created_at)
SELECT r.id, 'created', 'Sistem AI Galen', 'Dibuat dari run analisis specialist', r.created_at
FROM public.agent_recommendations r
WHERE NOT EXISTS (
  SELECT 1 FROM public.recommendation_activity_log a
  WHERE a.recommendation_id = r.id AND a.action = 'created'
);
