-- ============================================================
-- saved_insights: Insights pinned/saved from chat conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_insights (
  id TEXT PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('key-insight', 'action', 'chart')),
  title TEXT NOT NULL,
  description TEXT,
  source_message_id TEXT NOT NULL,
  chart_config JSONB,
  auto_detected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_insights_conversation_id ON saved_insights(conversation_id);

-- RLS: public access (no auth in this project)
ALTER TABLE saved_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on saved_insights" ON saved_insights FOR SELECT USING (true);
CREATE POLICY "Allow public insert on saved_insights" ON saved_insights FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on saved_insights" ON saved_insights FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on saved_insights" ON saved_insights FOR DELETE USING (true);

-- ============================================================
-- saved_reports: Reports generated from insights
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  included_insight_ids TEXT[] NOT NULL DEFAULT '{}',
  insights_snapshot JSONB NOT NULL DEFAULT '[]',
  format TEXT NOT NULL CHECK (format IN ('full-report', 'executive-summary', 'action-plan')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  gaps JSONB NOT NULL DEFAULT '[]',
  content JSONB,
  generation_status TEXT NOT NULL DEFAULT 'idle' CHECK (generation_status IN ('idle', 'generating', 'complete', 'error')),
  generation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_reports_conversation_id ON saved_reports(conversation_id);

-- RLS: public access
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on saved_reports" ON saved_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert on saved_reports" ON saved_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on saved_reports" ON saved_reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on saved_reports" ON saved_reports FOR DELETE USING (true);
