-- Create agent_skills table for skill definitions
CREATE TABLE public.agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'analysis',
  icon text DEFAULT 'FileText',
  
  -- Skill Definition (SKILL.md content)
  purpose text NOT NULL,
  input_requirements jsonb NOT NULL DEFAULT '[]',
  hard_rules jsonb NOT NULL DEFAULT '[]',
  section_logic jsonb NOT NULL DEFAULT '[]',
  confidence_scoring jsonb,
  
  -- Output Template (TEMPLATE.md content)
  output_template text NOT NULL,
  
  -- Metadata
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create skill_executions table for logging
CREATE TABLE public.skill_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid REFERENCES public.agent_skills(id) ON DELETE CASCADE,
  agent_id uuid,
  input_data jsonb NOT NULL,
  output_content text,
  confidence_scores jsonb,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

-- Create agents table (replacing in-memory state)
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  goal text,
  template_id text,
  category text NOT NULL DEFAULT 'operations',
  autonomy_level text NOT NULL DEFAULT 'supervised',
  status text NOT NULL DEFAULT 'draft',
  current_phase text DEFAULT 'idle',
  
  -- Metrics and scheduling
  monitored_metric_ids text[] DEFAULT '{}',
  time_range text DEFAULT 'last-30-days',
  schedule jsonb,
  anomaly_threshold integer DEFAULT 70,
  
  -- Skills (NEW)
  skill_ids uuid[] DEFAULT '{}',
  skill_chain jsonb,
  
  -- Trust and tracking
  trust_score integer DEFAULT 0,
  total_runs integer DEFAULT 0,
  last_run_at timestamptz,
  
  -- Analysis state
  current_plan jsonb,
  
  -- Metadata
  created_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agent_runs table
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  trigger text DEFAULT 'manual',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  plan jsonb,
  findings jsonb,
  recommendations jsonb,
  skill_outputs jsonb,
  error_message text
);

-- Create agent_recommendations table
CREATE TABLE public.agent_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  skill_execution_id uuid REFERENCES public.skill_executions(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'proposed',
  potential_impact text,
  potential_impact_numeric numeric,
  estimated_effort text,
  realized_impact jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access (matching existing pattern)
CREATE POLICY "Allow public read on agent_skills" ON public.agent_skills FOR SELECT USING (true);
CREATE POLICY "Allow public read on skill_executions" ON public.skill_executions FOR SELECT USING (true);
CREATE POLICY "Allow public read on agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Allow public read on agent_runs" ON public.agent_runs FOR SELECT USING (true);
CREATE POLICY "Allow public read on agent_recommendations" ON public.agent_recommendations FOR SELECT USING (true);

-- Allow insert/update/delete for now (no auth in this app)
CREATE POLICY "Allow public insert on agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agents" ON public.agents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on agents" ON public.agents FOR DELETE USING (true);

CREATE POLICY "Allow public insert on agent_runs" ON public.agent_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agent_runs" ON public.agent_runs FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on skill_executions" ON public.skill_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on skill_executions" ON public.skill_executions FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on agent_recommendations" ON public.agent_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agent_recommendations" ON public.agent_recommendations FOR UPDATE USING (true);

-- Indexes for performance
CREATE INDEX idx_skill_executions_skill_id ON public.skill_executions(skill_id);
CREATE INDEX idx_skill_executions_agent_id ON public.skill_executions(agent_id);
CREATE INDEX idx_agent_runs_agent_id ON public.agent_runs(agent_id);
CREATE INDEX idx_agent_recommendations_agent_id ON public.agent_recommendations(agent_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_category ON public.agents(category);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_skills_updated_at
  BEFORE UPDATE ON public.agent_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial skills

-- 1. Executive Reporting Skill
INSERT INTO public.agent_skills (name, display_name, description, category, icon, purpose, input_requirements, hard_rules, section_logic, confidence_scoring, output_template) VALUES (
  'executive-reporting',
  'Executive Report Generator',
  'Transform structured business analysis (metrics, root causes, and impacts) into a decision-ready executive report.',
  'reporting',
  'FileText',
  'Prioritize clarity over completeness and quantified insights over narrative. Transform raw analysis inputs into a strict, executive-ready format. Produce a Single Trusted Narrative for leadership by synthesizing outputs from multiple analytical agents.',
  '[
    {"name": "North Star Metric", "required": true, "fields": ["name", "currentValue", "previousValue", "period"], "description": "The primary metric being reported on"},
    {"name": "Metric Summary", "required": true, "fields": ["metrics"], "description": "Array of metrics with previous vs current values, deltas, and signals"},
    {"name": "Root Causes", "required": true, "fields": ["causes"], "description": "Maximum of 3 evidence-backed root causes with confidence levels"},
    {"name": "Business Impact", "required": true, "fields": ["revenueImpact", "operationalImpact"], "description": "Revenue and operational impact assessment"},
    {"name": "Recommendations", "required": true, "fields": ["actions"], "description": "Clear actions with owners, priority, and expected impact"}
  ]'::jsonb,
  '[
    {"id": "quantification", "category": "quantification", "rule": "Always use concrete values, deltas, or ranges. Avoid qualitative terms unless paired with numbers (e.g., increase of +2.1pp)."},
    {"id": "brevity", "category": "brevity", "rule": "Executive Summary must be 120-150 words maximum. Assume executive attention span is limited."},
    {"id": "root-cause-discipline", "category": "discipline", "rule": "Maximum of 3 root causes. Exclude minor or speculative factors."},
    {"id": "no-hallucination", "category": "confidence", "rule": "If confidence < 0.5, label explicitly as Low Confidence or Directional Only."},
    {"id": "format-compliance", "category": "format", "rule": "Follow the output template exactly. Do not rename, reorder, merge, or omit sections."}
  ]'::jsonb,
  '[
    {"section": "Executive Summary", "rules": ["Sentence 1: Movement of the North Star metric and its primary driver.", "Sentence 2: Quantified business impact.", "Sentence 3: Recommended actions and expected timeframe."]},
    {"section": "Recommended Actions", "rules": ["Sort strictly by Time-to-Impact (fastest first).", "Every action must be actionable, have a single accountable owner, and state expected impact."]},
    {"section": "Risk of Inaction", "rules": ["Clearly state the cost of doing nothing: Financial, Operational, or Reputational."]}
  ]'::jsonb,
  '{"metrics": ["metric_accuracy", "attribution_confidence"], "description": "Scores exist to signal decision risk, not data perfection."}'::jsonb,
  '# 📊 Executive Performance Report
**Date:** {{date}}
**Focus Area:** {{northStarMetric.name}}

---

## 1. Executive Summary
{{executiveSummary}}

---

## 2. North Star Snapshot
| Metric | Current | Previous | Delta | Signal |
| :--- | :--- | :--- | :--- | :--- |
| **{{northStarMetric.name}}** | **{{northStarMetric.currentValue}}** | {{northStarMetric.previousValue}} | {{northStarMetric.delta}} | {{northStarMetric.signal}} |

---

## 3. Metric Movement Summary
{{#each metricSummary}}
- **{{name}}:** {{currentValue}} ({{delta}}) – {{context}}
{{/each}}

---

## 4. Root Cause Analysis (Top 3)
{{#each rootCauses}}
{{@index}}. **{{title}}** (Confidence: {{confidence}})
   - *Evidence:* {{evidence}}
   - *Metric Path:* {{metricPath}}
{{/each}}

---

## 5. Voice of Customer / Signals
{{#each customerSignals}}
> "{{quote}}"
{{/each}}

- **Primary Theme:** {{primaryTheme.name}} ({{primaryTheme.percentage}}% of total volume)

---

## 6. Business Impact Assessment
- **Revenue Impact:** {{businessImpact.revenue}}
- **Operational Impact:** {{businessImpact.operational}}

---

## 7. Recommended Actions
| Priority | Action | Owner | Expected Impact |
| :--- | :--- | :--- | :--- |
{{#each recommendations}}
| {{priority}} | {{action}} | {{owner}} | {{expectedImpact}} |
{{/each}}

---

## 8. Risk of Inaction
{{riskOfInaction}}

---

## 9. Data Confidence & Quality
- **Metric Accuracy:** {{confidenceScores.metricAccuracy}}
- **Attribution Confidence:** {{confidenceScores.attributionConfidence}}
- **Limitations:** {{limitations}}'
);

-- 2. Revenue Analysis Skill
INSERT INTO public.agent_skills (name, display_name, description, category, icon, purpose, input_requirements, hard_rules, section_logic, output_template) VALUES (
  'revenue-analysis',
  'Revenue Analysis',
  'Analyze revenue metrics to identify growth opportunities and revenue leaks.',
  'analysis',
  'DollarSign',
  'Perform deep-dive analysis on revenue data to identify trends, anomalies, and actionable opportunities for revenue optimization.',
  '[
    {"name": "Revenue Data", "required": true, "fields": ["totalRevenue", "periodStart", "periodEnd"], "description": "Revenue figures for the analysis period"},
    {"name": "Segmentation", "required": false, "fields": ["byRoute", "byCustomerType", "byChannel"], "description": "Optional segmentation dimensions"}
  ]'::jsonb,
  '[
    {"id": "segmentation", "category": "analysis", "rule": "Always segment by route, customer type, and time period when data is available."},
    {"id": "deltas", "category": "quantification", "rule": "Calculate both MoM and YoY deltas for all metrics."},
    {"id": "drivers", "category": "focus", "rule": "Identify top 3 revenue drivers and top 3 revenue leakages."}
  ]'::jsonb,
  '[
    {"section": "Revenue Overview", "rules": ["Start with total revenue and primary delta.", "Highlight the single biggest change."]},
    {"section": "Segment Analysis", "rules": ["Break down by route first, then customer type.", "Identify concentration risk if top segment > 40%."]}
  ]'::jsonb,
  '# 💰 Revenue Analysis Report
**Period:** {{periodStart}} - {{periodEnd}}

## Revenue Overview
- **Total Revenue:** {{totalRevenue}}
- **MoM Change:** {{momDelta}}
- **YoY Change:** {{yoyDelta}}

## Top Revenue Drivers
{{#each topDrivers}}
{{@index}}. **{{name}}:** {{value}} ({{contribution}}% of total)
{{/each}}

## Revenue Leakages
{{#each leakages}}
{{@index}}. **{{name}}:** {{value}} - {{reason}}
{{/each}}

## Segment Breakdown
{{segmentAnalysis}}

## Recommendations
{{#each recommendations}}
- {{action}} (Expected Impact: {{impact}})
{{/each}}'
);

-- 3. NPS Analysis Skill
INSERT INTO public.agent_skills (name, display_name, description, category, icon, purpose, input_requirements, hard_rules, section_logic, output_template) VALUES (
  'nps-analysis',
  'NPS Analysis',
  'Analyze NPS responses using correct calculation methodology and segment insights.',
  'analysis',
  'HeartPulse',
  'Calculate and analyze Net Promoter Score correctly, segmenting by customer type and route to identify satisfaction drivers and detractors.',
  '[
    {"name": "NPS Responses", "required": true, "fields": ["promoters", "passives", "detractors", "totalResponses"], "description": "NPS response counts by category"},
    {"name": "Period", "required": true, "fields": ["month", "year"], "description": "Analysis period"}
  ]'::jsonb,
  '[
    {"id": "calculation", "category": "accuracy", "rule": "NEVER calculate average of NPS scores. NPS = (Promoters% - Detractors%) × 100."},
    {"id": "segmentation", "category": "analysis", "rule": "Always segment by customer type and route when data is available."},
    {"id": "verbatims", "category": "evidence", "rule": "Include verbatim customer quotes when available to support findings."}
  ]'::jsonb,
  '[
    {"section": "NPS Score", "rules": ["Lead with the calculated NPS score.", "Show the calculation breakdown.", "Compare to previous period."]},
    {"section": "Segment Analysis", "rules": ["Identify highest and lowest scoring segments.", "Highlight segments with declining trends."]}
  ]'::jsonb,
  '# 📈 NPS Analysis Report
**Period:** {{period}}

## NPS Score
- **Current NPS:** {{npsScore}}
- **Calculation:** ({{promotersPercent}}% Promoters - {{detractorsPercent}}% Detractors)
- **Previous Period:** {{previousNps}} ({{npsDelta}})

## Response Distribution
| Category | Count | Percentage |
| :--- | :--- | :--- |
| Promoters (9-10) | {{promoters}} | {{promotersPercent}}% |
| Passives (7-8) | {{passives}} | {{passivesPercent}}% |
| Detractors (0-6) | {{detractors}} | {{detractorsPercent}}% |

## Segment Analysis
{{segmentAnalysis}}

## Key Themes
{{#each themes}}
- **{{name}}:** {{percentage}}% of feedback
{{/each}}

## Recommendations
{{#each recommendations}}
- {{action}}
{{/each}}'
);

-- 4. Operational Excellence Skill
INSERT INTO public.agent_skills (name, display_name, description, category, icon, purpose, input_requirements, hard_rules, section_logic, output_template) VALUES (
  'operational-excellence',
  'Operational Excellence',
  'Monitor SLA compliance, on-time performance, and operational efficiency metrics.',
  'monitoring',
  'Clock',
  'Track operational KPIs including on-time performance, SLA compliance, and efficiency metrics to identify improvement opportunities.',
  '[
    {"name": "Trip Data", "required": true, "fields": ["totalTrips", "onTimeTrips", "delayedTrips"], "description": "Trip performance metrics"},
    {"name": "Period", "required": true, "fields": ["startDate", "endDate"], "description": "Analysis period"}
  ]'::jsonb,
  '[
    {"id": "otp-calculation", "category": "accuracy", "rule": "Calculate OTP as percentage of trips arriving within the defined threshold (typically 15 minutes)."},
    {"id": "segmentation", "category": "analysis", "rule": "Segment by route type, driver, and vehicle class."},
    {"id": "thresholds", "category": "alerting", "rule": "Flag any metric below SLA threshold in red."}
  ]'::jsonb,
  '[
    {"section": "Performance Summary", "rules": ["Lead with OTP percentage.", "Show trend vs previous period."]},
    {"section": "Root Causes", "rules": ["Identify top 3 delay causes.", "Quantify impact of each."]}
  ]'::jsonb,
  '# ⏱️ Operational Excellence Report
**Period:** {{startDate}} - {{endDate}}

## Performance Summary
- **On-Time Performance:** {{otpPercent}}%
- **SLA Target:** {{slaTarget}}%
- **Status:** {{slaStatus}}

## Trip Breakdown
| Status | Count | Percentage |
| :--- | :--- | :--- |
| On-Time | {{onTimeTrips}} | {{onTimePercent}}% |
| Delayed | {{delayedTrips}} | {{delayedPercent}}% |
| Cancelled | {{cancelledTrips}} | {{cancelledPercent}}% |

## Top Delay Causes
{{#each delayCauses}}
{{@index}}. **{{cause}}:** {{count}} trips ({{percentage}}%)
{{/each}}

## Segment Analysis
{{segmentAnalysis}}

## Recommendations
{{#each recommendations}}
- {{action}} (Priority: {{priority}})
{{/each}}'
);

-- 5. Root Cause Analysis Skill
INSERT INTO public.agent_skills (name, display_name, description, category, icon, purpose, input_requirements, hard_rules, section_logic, output_template) VALUES (
  'root-cause-analysis',
  'Root Cause Analysis',
  'Identify primary drivers of metric changes with evidence-backed confidence levels.',
  'analysis',
  'Search',
  'Systematically analyze metric movements to identify root causes, quantify their contribution, and assign confidence levels based on available evidence.',
  '[
    {"name": "Target Metric", "required": true, "fields": ["name", "currentValue", "previousValue", "delta"], "description": "The metric experiencing change"},
    {"name": "Related Metrics", "required": false, "fields": ["metrics"], "description": "Potentially related metrics for correlation analysis"}
  ]'::jsonb,
  '[
    {"id": "evidence-based", "category": "rigor", "rule": "Every root cause must have quantified evidence. No speculation."},
    {"id": "contribution", "category": "quantification", "rule": "Estimate contribution percentage for each root cause."},
    {"id": "confidence", "category": "transparency", "rule": "Assign confidence level (High/Medium/Low) based on data quality and sample size."}
  ]'::jsonb,
  '[
    {"section": "Root Causes", "rules": ["Order by contribution percentage (highest first).", "Maximum 5 root causes.", "Include metric trace for each."]},
    {"section": "Correlation Analysis", "rules": ["Show correlation coefficients where applicable.", "Distinguish correlation from causation."]}
  ]'::jsonb,
  '# 🔍 Root Cause Analysis
**Metric:** {{targetMetric.name}}
**Change:** {{targetMetric.delta}}

## Summary
{{summary}}

## Identified Root Causes
{{#each rootCauses}}
### {{@index}}. {{title}}
- **Contribution:** {{contribution}}%
- **Confidence:** {{confidence}}
- **Evidence:** {{evidence}}
- **Metric Path:** {{metricPath}}
{{/each}}

## Correlation Analysis
{{correlationAnalysis}}

## Data Quality Notes
- **Sample Size:** {{sampleSize}}
- **Data Completeness:** {{dataCompleteness}}%
- **Limitations:** {{limitations}}'
);