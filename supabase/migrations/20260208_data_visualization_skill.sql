-- =============================================================================
-- DATA VISUALIZATION SKILL — Generates Vega-Lite chart specs from DB data
-- Definition-driven: no new edge function code needed
-- Pipeline position: 4 (visualizer) — terminal skill, chainable from analyzers
-- =============================================================================

INSERT INTO public.agent_skills (
  name, display_name, description, category, icon, source_type,
  purpose, trigger_phrases,
  input_spec, output_spec,
  input_requirements, hard_rules, section_logic, confidence_scoring,
  output_template, skill_md_body, query_context_spec, execution_config,
  pipeline_position
) VALUES (
  'data-visualization',
  'Data Visualization',
  'Generate interactive Vega-Lite chart specifications from database metrics. Supports line charts, bar charts, donut charts, histograms, scatter plots, and horizontal bar charts across revenue, NPS, OTP, funnel, and fleet data.',
  'reporting',
  'BarChart3',
  'uploaded',

  -- purpose
  'Generate valid Vega-Lite v5 chart specifications from database query results. Analyze the data, choose the best chart type, aggregate appropriately, and output a fenced vega-lite code block that renders as an interactive chart.',

  -- trigger_phrases
  ARRAY['chart', 'visualize', 'plot', 'graph', 'show me a chart', 'bar chart', 'line chart', 'visualization', 'trend chart', 'donut chart'],

  -- input_spec
  '[
    {"name": "metric", "type": "string", "required": true, "description": "The metric to visualize: revenue, nps, otp, funnel, vehicle_revenue"},
    {"name": "chartType", "type": "string", "required": false, "description": "Preferred chart type: line, bar, donut, histogram, scatter, hbar. If omitted, auto-select based on data."},
    {"name": "timeRange", "type": "string", "required": false, "description": "Time range filter: last-3-months, 2025-Q2, June 2025, etc."},
    {"name": "groupBy", "type": "string", "required": false, "description": "Dimension to group by: route, customer_type, vehicle_class, fleet, city, channel"}
  ]'::jsonb,

  -- output_spec
  '[{"name": "chart_output", "type": "text", "description": "Markdown with embedded vega-lite fenced code block containing a valid Vega-Lite v5 JSON spec"}]'::jsonb,

  -- input_requirements
  '[{"name": "Metric", "required": true, "fields": ["metric"], "description": "Which business metric to chart"}]'::jsonb,

  -- hard_rules
  '[
    {"id": "valid-spec", "category": "output", "rule": "Output MUST be a valid Vega-Lite v5 JSON spec inside a ```vega-lite fenced block."},
    {"id": "inline-data", "category": "data", "rule": "ALWAYS use inline data (data.values array). NEVER use data.url."},
    {"id": "max-points", "category": "data", "rule": "Limit to 50 data points maximum. Aggregate if source data exceeds this."},
    {"id": "no-dimensions", "category": "style", "rule": "NEVER set width or height. NEVER set custom colors. The renderer handles sizing and theming."},
    {"id": "nps-formula", "category": "calculation", "rule": "NPS = (promoters_count / total_responses - detractors_count / total_responses) × 100. NEVER average NPS scores."},
    {"id": "axis-titles", "category": "style", "rule": "ALWAYS include axis titles that describe the metric and unit."}
  ]'::jsonb,

  -- section_logic
  '[
    {"section": "Data Analysis", "rules": ["Examine the query results provided in the user prompt.", "Identify the best aggregation strategy for the requested metric.", "If data exceeds 50 points, aggregate by time period or dimension."]},
    {"section": "Chart Type Selection", "rules": ["If chartType is specified, use it.", "If not specified, auto-select: time series → line, categories → bar, proportions → donut, distribution → histogram, correlation → scatter, ranking → hbar."]},
    {"section": "Spec Generation", "rules": ["Build a valid Vega-Lite v5 spec with $schema, mark, encoding, and data.values.", "Never include width, height, or color scales.", "Always include descriptive axis titles."]}
  ]'::jsonb,

  -- confidence_scoring
  NULL,

  -- output_template
  '{{introduction}}

```vega-lite
{{chart_spec}}
```

**Key Insight:** {{analysis_caption}}',

  -- skill_md_body (the SKILL.md — becomes Claude''s system prompt)
  '# Data Visualization Skill

## Purpose
Generate valid, interactive Vega-Lite v5 chart specifications from database query results. You receive pre-queried data and must produce a chart that best communicates the insight.

## Chart Type Selection Guide
| Data Pattern | Mark Type | When to Use |
|---|---|---|
| Values over time (dates) | `line` (with `point: true`) | Trends, time series |
| Categories comparison | `bar` | Comparing discrete groups |
| Proportions of a whole | `arc` (donut) | Market share, composition |
| Value distribution | `bar` (with `bin: true`) | Histograms, frequency |
| Two numeric variables | `point` | Correlation, clustering |
| Ranked list | `bar` (horizontal) | Top-N, leaderboards |

If the user specifies a chartType, use it. Otherwise, auto-select based on the data pattern.

## Vega-Lite Spec Rules (CRITICAL)
1. **Schema**: Always include `"$schema": "https://vega.github.io/schema/vega-lite/v5.json"`
2. **Inline data**: Always use `"data": {"values": [...]}`. NEVER use `data.url`
3. **Max 50 data points**: If source data has more rows, aggregate first (sum, average, count by period/dimension)
4. **NO width/height**: Never set `width` or `height` — the renderer handles sizing via `width: "container"`
5. **NO custom colors**: Never set `color.scale` or any color values — the theme system handles colors
6. **Axis titles required**: Always set `axis.title` on both x and y encodings
7. **Temporal encoding**: For date fields, use `"type": "temporal"` and `"timeUnit"` (e.g., `"yearmonth"`)
8. **Tooltip**: Always include `"tooltip": true` or explicit tooltip encoding

## Data Aggregation Strategies

### Revenue
- **Time trend**: Group by month → sum `gross_value_amount`
- **By route**: Group by `origin_city`-`destination_city` → sum `gross_value_amount`
- **By customer**: Group by `customer_type` or `loyalty_tier` → sum `gross_value_amount`

### NPS
- **Time trend**: Group by `month` → calculate NPS = (promoters_count/total_responses - detractors_count/total_responses) × 100
- **By segment**: Group by `customer_type` or `route_id` → calculate NPS per segment
- **Distribution**: Use raw scores from `fact_nps_response_raw` → histogram of `nps_score`

### OTP (On-Time Performance)
- **Time trend**: Group by `trip_date` (monthly) → count `is_on_time` / total trips × 100
- **By route**: Group by `route_id` → OTP percentage per route
- **Delay distribution**: Histogram of `delay_minutes`

### Funnel
- **Conversion funnel**: Calculate percentage at each stage: homepage → trip_input → trip_option → seat_option → booking
- **By channel**: Group by `channel_id` → conversion rate per channel

### Vehicle/Fleet Revenue
- **Revenue trend**: Group by `revenue_date` → sum `total_revenue`
- **Revenue vs cost**: Dual encoding of `total_revenue` and `operating_cost`
- **By fleet**: Group by `fleet_id` → compare revenue across fleets

## NPS Formula (NEVER AVERAGE NPS SCORES)
```
NPS = (promoters_count / total_responses × 100) - (detractors_count / total_responses × 100)
```
When aggregating across segments, sum the counts first, then calculate NPS from totals.

## Output Format
Your response MUST follow this exact structure:

1. **Introduction** (1-2 sentences): Briefly describe what the chart shows
2. **Vega-Lite block**: A fenced code block with language `vega-lite` containing the JSON spec
3. **Key Insight** (1-2 sentences): The most important takeaway from the data

Example output structure:
```
Here is the monthly NPS trend for the last 6 months.

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"values": [...]},
  "mark": {"type": "line", "point": true},
  "encoding": {
    "x": {"field": "month", "type": "temporal", "axis": {"title": "Month"}},
    "y": {"field": "nps", "type": "quantitative", "axis": {"title": "NPS Score"}}
  }
}
\`\`\`

**Key Insight:** NPS improved from 32 to 41 over the period, driven primarily by reduced detractor rates on the Jakarta-Surabaya route.
```

## Common Mistakes to Avoid
- Do NOT set `"width"` or `"height"` in the spec
- Do NOT set color values like `"color": "#FF0000"` — the theme handles colors
- Do NOT use `data.url` — always inline the data
- Do NOT average NPS scores — always use the weighted formula
- Do NOT include more than 50 data points — aggregate first
- Do NOT forget the `$schema` property
- Do NOT forget axis titles',

  -- query_context_spec (broad coverage — 9 tables)
  '[
    {"table": "fact_revenue", "select": ["gross_value_amount", "booking_datetime", "route_id", "origin_city", "destination_city", "customer_id", "ticket_status"], "orderBy": {"field": "booking_datetime", "ascending": false}, "limit": 500},
    {"table": "fact_nps_response", "select": ["month", "customer_type", "route_id", "promoters_count", "passives_count", "detractors_count", "total_responses"], "orderBy": {"field": "month", "ascending": false}, "limit": 200},
    {"table": "fact_trip", "select": ["trip_id", "trip_date", "trip_status", "is_on_time", "delay_minutes", "route_id", "driver_id", "vehicle_id"], "orderBy": {"field": "trip_date", "ascending": false}, "limit": 500},
    {"table": "fact_funnel", "select": ["session_id", "channel_id", "homepage_flag", "trip_input_page_flag", "trip_option_page_flag", "seat_option_page_flag", "booking_page_flag", "order_id"], "limit": 200},
    {"table": "fact_vehicle_revenue", "select": ["vehicle_id", "fleet_id", "revenue_date", "total_revenue", "operating_cost"], "orderBy": {"field": "revenue_date", "ascending": false}, "limit": 200},
    {"table": "dim_route", "select": ["route_id", "route_name", "origin_city", "destination_city", "price_card", "distance_km"], "filters": [{"field": "active_flag", "operator": "eq", "value": true}]},
    {"table": "dim_customer", "select": ["customer_id", "customer_type", "loyalty_tier", "home_city"], "filters": [{"field": "active_flag", "operator": "eq", "value": true}], "limit": 200},
    {"table": "dim_vehicle", "select": ["vehicle_id", "vehicle_code", "vehicle_type", "vehicle_class", "seat_capacity", "fleet_id", "active_flag"], "filters": [{"field": "active_flag", "operator": "eq", "value": true}]},
    {"table": "dim_fleet", "select": ["fleet_id", "fleet_name", "fleet_category", "vehicle_type", "service_level"], "filters": [{"field": "active_flag", "operator": "eq", "value": true}]}
  ]'::jsonb,

  -- execution_config
  '{"model": "claude-sonnet-4-5-20250929", "maxTokens": 4096, "timeoutMs": 60000, "temperature": 0}'::jsonb,

  -- pipeline_position
  '{"order": 4, "role": "visualizer", "feeds": []}'::jsonb
);
