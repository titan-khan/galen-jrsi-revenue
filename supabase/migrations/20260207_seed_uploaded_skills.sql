-- =============================================================================
-- SEED UPLOADED SKILLS — Domain knowledge from uploaded skill definitions
-- These represent the 5 pipeline skills with Claude-powered execution
-- =============================================================================

-- 1. Problem Articulation Agent (Pipeline position: 0 — entry point)
INSERT INTO public.agent_skills (
  name, display_name, description, category, icon, source_type,
  purpose, trigger_phrases,
  input_spec, output_spec,
  input_requirements, hard_rules, section_logic, confidence_scoring,
  output_template, skill_md_body, query_context_spec, execution_config,
  pipeline_position
) VALUES (
  'problem-articulation',
  'Problem Articulation Agent',
  'Bridge natural language problem statements with structured analysis workflows. Transforms vague problems into actionable analysis plans for monitoring agents.',
  'strategy',
  'Target',
  'uploaded',
  'Act as a pre-analysis gateway that transforms vague business problems into actionable analysis plans. Use a 4-step process: Problem Understanding, Hypothesis Generation (MECE), Metrics Validation, and Structured Output.',
  ARRAY['articulate problem', 'business problem', 'analysis plan', 'what should I analyze', 'help me understand'],
  '[{"name": "problem_description", "type": "text", "required": true, "description": "Natural language description of the business problem"}]'::jsonb,
  '[{"name": "structured_input", "type": "json", "description": "Goal, metrics, and use_case for downstream monitoring agent"}]'::jsonb,
  '[{"name": "Problem Description", "required": true, "fields": ["text"], "description": "Natural language problem statement"}]'::jsonb,
  '[
    {"id": "mece", "category": "structure", "rule": "Always generate a 3-level MECE hypothesis tree to structure the problem."},
    {"id": "use-case-detection", "category": "routing", "rule": "Detect the use case (NPS, Revenue, OTP, Quality, Custom) with a confidence score. Route to the correct monitoring agent."},
    {"id": "metrics-validation", "category": "validation", "rule": "Validate that recommended metrics exist in the data warehouse schema before recommending them."},
    {"id": "output-format", "category": "format", "rule": "Always output exactly 3 fields: goal (string), metrics (array of metric names), use_case (enum: nps|revenue|otp|quality|custom)."}
  ]'::jsonb,
  '[
    {"section": "Problem Understanding", "rules": ["Parse the user''s natural language input.", "Detect the use case with confidence score.", "If confidence < 0.6, ask clarifying questions."]},
    {"section": "Hypothesis Generation", "rules": ["Create MECE hypothesis tree with 3 levels.", "Each branch must be mutually exclusive.", "Collectively they must cover all plausible explanations."]},
    {"section": "Structured Output", "rules": ["Generate goal as a measurable objective.", "List only metrics available in the data warehouse.", "Map to the correct monitoring agent use_case."]}
  ]'::jsonb,
  NULL,
  '## Output Format
```json
{
  "goal": "{{measurable_objective}}",
  "metrics": ["{{metric_1}}", "{{metric_2}}"],
  "use_case": "{{nps|revenue|otp|quality|custom}}"
}
```

## Hypothesis Tree
{{hypothesis_tree}}

## Recommended Analysis
- **Target Agent:** {{agent_name}}
- **Confidence:** {{confidence_score}}
- **Key Metrics:** {{metrics_list}}',
  '# Problem Articulation Agent

## Purpose
Act as a pre-analysis gateway that transforms vague business problems into structured, actionable analysis plans for monitoring agents (NPS, OTP, Revenue, Quality).

## Methodology: 4-Step Process
1. **Problem Understanding**: Parse natural language → detect use case with confidence score
2. **Hypothesis Generation**: Create 3-level MECE (Mutually Exclusive, Collectively Exhaustive) hypothesis tree
3. **Metrics Validation**: Validate metrics against data warehouse schema
4. **Structured Output**: Generate goal + metrics + use_case for downstream agent

## Use Case Detection Table
| Use Case | Focus | Key Metrics | Target Agent |
|----------|-------|-------------|--------------|
| NPS | Customer satisfaction | NPS Score, Promoters%, Detractors% | nps-monitoring-agent |
| OTP | Delivery/schedule | On-Time Rate, Delays, SLA | operational-excellence |
| Revenue | Financial growth | Revenue, Margin, Units, Price | revenue-monitoring-agent |
| Quality | Product/service | Defect Rate, Compliance, Inspection | quality-monitoring |
| Custom | User-defined | User-specified | custom-monitoring |

## Hard Rules
- ALWAYS generate a MECE hypothesis tree before recommending metrics
- If confidence < 0.6, ASK clarifying questions instead of guessing
- Output MUST contain exactly: goal, metrics[], use_case
- Validate all metrics exist in the database schema before recommending them

## Output Format
Return a JSON object with: goal (measurable string), metrics (array), use_case (enum)',
  '[
    {"table": "metadata_business_dictionary", "select": ["term", "business_definition", "agent_guidance"], "limit": 50},
    {"table": "metadata_data_dictionary", "select": ["table_name", "column_name", "business_definition", "agent_usage_note"], "limit": 100}
  ]'::jsonb,
  '{"model": "claude-sonnet-4-5-20250929", "maxTokens": 4096, "timeoutMs": 60000}'::jsonb,
  '{"order": 0, "role": "entry_point", "feeds": ["nps-analysis", "revenue-analysis", "operational-excellence"]}'::jsonb
);

-- 2. Data Warehouse Adapter (Pipeline position: 1 — data transformer)
INSERT INTO public.agent_skills (
  name, display_name, description, category, icon, source_type,
  purpose, trigger_phrases,
  input_spec, output_spec,
  input_requirements, hard_rules, section_logic, confidence_scoring,
  output_template, skill_md_body, query_context_spec, execution_config,
  pipeline_position
) VALUES (
  'data-warehouse-adapter',
  'Data Warehouse Adapter',
  'Transform star schema data warehouse exports into flat files ready for analytics agents. Auto-detects schema, joins dimensions, extracts periods, and outputs clean CSVs.',
  'analysis',
  'Database',
  'uploaded',
  'Transform star schema data into flat analytical datasets. Execute a 5-step pipeline: Auto-detect schema, Join dimensions, Extract periods, Calculate metrics, Output flat CSVs.',
  ARRAY['star schema', 'data warehouse', 'transform data', 'flatten', 'join dimensions', 'prepare data'],
  '[{"name": "data_description", "type": "text", "required": true, "description": "Description of the data warehouse tables and their relationships"}]'::jsonb,
  '[{"name": "transformation_plan", "type": "text", "description": "SQL/query plan for transforming the star schema into flat analytical data"}]'::jsonb,
  '[{"name": "Data Description", "required": true, "fields": ["tables", "relationships"], "description": "Star schema table descriptions"}]'::jsonb,
  '[
    {"id": "schema-detection", "category": "analysis", "rule": "Auto-detect fact vs dimension tables from naming conventions and foreign keys."},
    {"id": "dimension-join", "category": "transformation", "rule": "Replace all foreign key IDs with human-readable dimension values (e.g., route_id → route_name)."},
    {"id": "period-extraction", "category": "time", "rule": "Identify and extract time periods for current vs previous comparisons."},
    {"id": "metric-calculation", "category": "calculation", "rule": "Calculate derived metrics: NPS = (Promoters% - Detractors%) × 100, OTP = OnTimeTrips/TotalTrips × 100, Revenue delta = (Current-Previous)/Previous × 100."}
  ]'::jsonb,
  '[
    {"section": "Schema Analysis", "rules": ["Identify fact tables (fact_*) and dimension tables (dim_*).", "Map foreign key relationships.", "Detect the time/period column."]},
    {"section": "Transformation Plan", "rules": ["List all JOIN operations needed.", "Specify aggregation levels.", "Define output columns."]}
  ]'::jsonb,
  NULL,
  '## Schema Analysis
{{schema_analysis}}

## Transformation Plan
{{transformation_steps}}

## Output Specification
| Output File | Columns | Rows | Period |
|---|---|---|---|
{{#each outputs}}
| {{file}} | {{columns}} | {{rowCount}} | {{period}} |
{{/each}}',
  '# Data Warehouse Adapter

## Purpose
Transform star schema data warehouse exports into flat, analysis-ready datasets. Works with any metric type (NPS, OTP, Revenue, Quality) across any industry.

## 5-Step Pipeline
1. **Auto-detect schema**: Identify fact tables (fact_*), dimension tables (dim_*), and key relationships
2. **Join dimensions**: Replace all foreign key IDs with human-readable names
3. **Extract periods**: Identify time columns, create current vs previous period splits
4. **Calculate metrics**: Compute derived metrics (NPS, OTP%, Revenue deltas, margins)
5. **Output flat data**: Generate clean, flat analytical datasets

## Supported Schema Patterns
- **Star Schema** (recommended): Normalized fact + dimension tables
- **Flat Files**: Pre-joined data in a single table
- **Raw Responses**: Individual records requiring aggregation

## Key Metric Calculations
- **NPS**: (Promoters_count / Total_responses - Detractors_count / Total_responses) × 100
- **OTP**: OnTime_trips / Total_trips × 100
- **Revenue Delta**: (Current_period - Previous_period) / Previous_period × 100
- **Margin**: (Revenue - Cost) / Revenue × 100

## Hard Rules
- ALWAYS join dimensions before outputting — never return raw IDs
- ALWAYS split by time period for trend analysis
- Calculate ALL derived metrics, not just raw counts
- Handle NULL values gracefully (exclude from calculations, note in output)',
  '[
    {"table": "metadata_data_dictionary", "select": ["table_name", "column_name", "data_type", "business_definition", "is_primary_key"], "limit": 200},
    {"table": "metadata_business_dictionary", "select": ["term", "business_definition", "category"], "limit": 50}
  ]'::jsonb,
  '{"model": "claude-sonnet-4-5-20250929", "maxTokens": 8192, "timeoutMs": 90000}'::jsonb,
  '{"order": 1, "role": "data_transformer", "feeds": ["nps-analysis", "revenue-analysis", "operational-excellence"]}'::jsonb
);

-- 3. NPS Monitoring Agent — UPDATE existing row to add uploaded skill knowledge
UPDATE public.agent_skills SET
  source_type = 'uploaded',
  skill_md_body = '# NPS Monitoring Agent

## Purpose
NPS monitoring and executive reporting. Analyze customer satisfaction trends, detect anomalies, identify root causes, and generate 9-section executive reports.

## Anomaly Detection Rules (CRITICAL)
- **Large Drop**: NPS delta < -5 → Medium-High severity
- **Concentrated Drops**: 2+ segments with delta < -5 → High severity
- **High Detractor Volume**: >10 verbatim complaints → High severity
- **Threshold Breach**: NPS below target threshold → Medium severity

## Segment Contribution Formula
`|segment_delta| / sum(all_negative_deltas) × 100`

Always calculate this for every segment with negative delta.

## Verbatim Theme Clustering
Auto-cluster customer feedback into these categories:
- **Delays**: keywords = late, delay, slow, wait, time
- **App Issues**: keywords = crash, freeze, error, bug, app
- **Support**: keywords = support, help, response, useless, rude
- **Pricing**: keywords = voucher, refund, compensation, expensive, price

## NPS Calculation (NEVER average NPS scores)
`NPS = (Promoters_count / Total_responses × 100) - (Detractors_count / Total_responses × 100)`

If individual scores available:
- Promoters: score 9-10
- Passives: score 7-8
- Detractors: score 0-6

## 9-Section Report Structure
1. Executive Summary (120-150 words MAX, 3 sentences)
2. North Star Snapshot (NPS score + delta + signal)
3. Metric Movement Summary (all segment deltas)
4. Root Cause Analysis (top 3, with evidence and confidence)
5. Voice of Customer (verbatim quotes + theme clustering)
6. Business Impact Assessment (revenue + operational impact)
7. Recommended Actions (sorted by time-to-impact, fastest first)
8. Risk of Inaction (financial, operational, reputational cost)
9. Data Confidence & Quality (metric accuracy, sample size, limitations)

## Hard Rules
- NEVER calculate average of NPS scores across segments
- Maximum 3 root causes — exclude minor or speculative factors
- Executive Summary must be 120-150 words maximum
- If confidence < 0.5, label explicitly as "Low Confidence" or "Directional Only"
- Every action must have a single accountable owner',
  execution_config = '{"model": "claude-sonnet-4-5-20250929", "maxTokens": 8192, "timeoutMs": 120000}'::jsonb,
  pipeline_position = '{"order": 2, "role": "analyzer", "feeds": ["executive-reporting"]}'::jsonb
WHERE name = 'nps-analysis';

-- 4. Revenue Analysis — UPDATE existing row to add BCG methodology
UPDATE public.agent_skills SET
  source_type = 'uploaded',
  skill_md_body = '# Revenue Monitoring Agent (BCG Methodology)

## Purpose
Analyze revenue trends using BCG consultant methodology to detect anomalies, identify root causes via driver tree analysis, and generate 9-section executive reports with decision-shaped insights.

## BCG Driver Tree Analysis (CORE METHODOLOGY)
Break every revenue change into these component drivers:
1. **Volume Effect**: Change in number of units/orders
   - Formula: `(current_orders - previous_orders) × previous_avg_price`
2. **Mix Effect**: Shift in demand across segments
   - Formula: `Σ(segment_share_change × segment_revenue_per_unit)`
3. **Price Effect**: Change in price per unit
   - Formula: `(current_avg_price - previous_avg_price) × current_orders`
4. **Margin Effect**: Change in profitability per unit
   - Formula: `(current_margin% - previous_margin%) × current_revenue`

Always decompose to at least Volume + Mix + Price.

## Counterintuitive Pattern Detection
Flag these patterns explicitly:
- Orders ↑ but Revenue ↓ → Mix shift to lower-value segments
- Revenue ↑ but Margin ↓ → Growth in low-margin segments
- Price ↑ but Volume ↑ → Possible segment shift, not price elasticity
- Discounts ↓ but Revenue ↓ → Demand destruction from price sensitivity

## Demand Mix Analysis
For each segment, calculate:
- `Share_current = segment_revenue / total_revenue`
- `Share_previous = segment_prev_revenue / total_prev_revenue`
- `Mix_impact = (share_current - share_previous) × total_revenue`

## 9-Section Report Structure
1. Executive Summary (3 sentences: metric movement + primary driver + recommended action)
2. North Star Snapshot (Revenue + delta + signal)
3. Metric Movement Summary (Volume, Mix, Price, Margin components)
4. Root Cause Analysis (top 3, using driver tree decomposition)
5. Voice of Customer Signals (customer behavior patterns)
6. Business Impact Assessment (revenue + margin impact quantified)
7. Recommended Actions (sorted by time-to-impact)
8. Risk of Inaction (quantified cost of doing nothing)
9. Data Confidence & Quality

## Hard Rules
- ALWAYS decompose revenue changes using the driver tree (Volume + Mix + Price minimum)
- ALWAYS flag counterintuitive patterns — these are the most valuable insights
- Sort recommended actions by time-to-impact (fastest first)
- Maximum 3 root causes per report
- Every number must have a comparison (delta, %, vs. previous period)',
  execution_config = '{"model": "claude-sonnet-4-5-20250929", "maxTokens": 8192, "timeoutMs": 120000}'::jsonb,
  pipeline_position = '{"order": 2, "role": "analyzer", "feeds": ["executive-reporting"]}'::jsonb
WHERE name = 'revenue-analysis';

-- 5. Dashboard Generator (Pipeline position: 3 — final output)
INSERT INTO public.agent_skills (
  name, display_name, description, category, icon, source_type,
  purpose, trigger_phrases,
  input_spec, output_spec,
  input_requirements, hard_rules, section_logic, confidence_scoring,
  output_template, skill_md_body, query_context_spec, execution_config,
  pipeline_position
) VALUES (
  'dashboard-generator',
  'Executive Dashboard Generator',
  'Generate cognitive-load-optimized executive briefing dashboards from analysis output. Creates narrative-driven reports with ranked insights, attribution analysis, and actionable recommendations.',
  'reporting',
  'Layout',
  'uploaded',
  'Transform analysis output into cognitive-load-optimized executive dashboards. Design principle: narrative > charts, ranked > exhaustive, 90-second read time.',
  ARRAY['dashboard', 'executive briefing', 'executive summary', 'visualize results', 'create dashboard'],
  '[{"name": "analysis_output", "type": "text", "required": true, "description": "Output from a monitoring agent (NPS, Revenue, OTP analysis report)"}]'::jsonb,
  '[{"name": "dashboard_html", "type": "html", "description": "Narrative-driven executive dashboard in HTML"}]'::jsonb,
  '[{"name": "Analysis Output", "required": true, "fields": ["report_text"], "description": "Full text output from an upstream monitoring agent"}]'::jsonb,
  '[
    {"id": "cognitive-load", "category": "design", "rule": "One question per section. 90-second executive read time maximum."},
    {"id": "narrative-first", "category": "design", "rule": "Narrative > charts. Lead with insight text, support with minimal data."},
    {"id": "ranked", "category": "structure", "rule": "Ranked > exhaustive. Show top 3 items, not all items."},
    {"id": "actionable", "category": "content", "rule": "Every section must answer: So what? What should the executive do?"}
  ]'::jsonb,
  '[
    {"section": "Executive Insight", "rules": ["Answer: What is the core issue?", "Single headline + confidence indicator.", "Maximum 2 sentences."]},
    {"section": "Attribution", "rules": ["Answer: Where is the problem coming from?", "Show top 3 contributing dimensions.", "Include contribution percentages."]},
    {"section": "Impact Analysis", "rules": ["Answer: What happens if we do nothing?", "Quantify financial and operational risk.", "Use 30/60/90 day projections."]},
    {"section": "Actions", "rules": ["Answer: What should we do now?", "Maximum 3 actions with owners and timelines.", "Sort by time-to-impact."]}
  ]'::jsonb,
  NULL,
  '# Executive Dashboard

## Executive Insight
**{{headline}}** (Confidence: {{confidence}})
{{insight_text}}

---

## Attribution Analysis
| Dimension | Value | Contribution |
|---|---|---|
{{#each attribution}}
| {{dimension}} | {{value}} | {{contribution}}% |
{{/each}}

---

## Impact Analysis
{{impact_narrative}}

### 30/60/90 Day Projection
{{projection}}

---

## Recommended Actions
{{#each actions}}
{{@index}}. **{{action}}** — Owner: {{owner}}, Timeline: {{timeline}}, Expected Impact: {{impact}}
{{/each}}',
  '# Executive Dashboard Generator

## Purpose
Generate cognitive-load-optimized executive briefing dashboards from analysis JSON or text output.

## Design Principles (CRITICAL)
1. **One question per section** — each section answers exactly one executive question
2. **Narrative > charts** — lead with insight text, support with minimal data visualization
3. **Ranked > exhaustive** — show top 3 items, never dump all data
4. **90-second read time** — the entire dashboard must be scannable in 90 seconds

## Section Structure & Questions
| Section | Question Answered | Max Length |
|---------|-------------------|------------|
| Executive Insight | What is the core issue? | 2 sentences |
| Attribution | Where is the problem from? | Top 3 dimensions |
| Impact Analysis | What if we do nothing? | 30/60/90 day projection |
| North Star | Why does leadership care? | 1 metric + 3 pillars |
| Actions | What should we do now? | 3 actions max |

## Formatting Rules
- Use narrative paragraphs, not bullet lists
- Bold the most important number in each section
- Include confidence indicators (High/Medium/Low) on key claims
- Color-code: Green = improving, Red = declining, Amber = watch
- Every action must have: owner, timeline, expected impact

## Hard Rules
- NEVER include more than 3 actions
- NEVER use pie charts (they are cognitively expensive)
- ALWAYS include "Risk of Inaction" quantification
- ALWAYS sort actions by time-to-impact (fastest first)
- Maximum dashboard length: 1 page / 90-second read',
  NULL,
  '{"model": "claude-sonnet-4-5-20250929", "maxTokens": 8192, "timeoutMs": 90000}'::jsonb,
  '{"order": 3, "role": "output_generator", "feeds": []}'::jsonb
);

-- 6. Seed the skill pipeline definition
INSERT INTO public.skill_pipelines (name, display_name, description, steps) VALUES (
  'full-analysis-pipeline',
  'Full Analysis Pipeline',
  'End-to-end analysis: Problem Articulation → Data Preparation → Domain Analysis → Executive Dashboard',
  '[]'::jsonb
);

-- Note: Pipeline steps reference skill IDs which are generated at insert time.
-- The application layer will resolve skill names to IDs when executing pipelines.
-- This is intentionally left as empty steps to be populated by the UI.
