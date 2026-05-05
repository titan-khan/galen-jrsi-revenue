-- =============================================================================
-- Evidence Formatting Methodology for Root Cause Analysis Skill
-- Enforces top-down analytical narrative structure for evidence items:
-- headline metric → breakdown → magnitude → causal inference → secondary findings
-- =============================================================================

UPDATE public.agent_skills SET
  skill_md_body = '# Root Cause Analysis

## Purpose
Identify primary drivers of metric changes with evidence-backed confidence levels. Every root cause must be supported by a structured evidence chain that tells a coherent analytical story.

## Evidence Formatting (MANDATORY — Top-Down Analytical Narrative)

Evidence items MUST be ordered using top-down structure. Each item builds on the previous one, creating sequential continuity:

### Step 1: Headline Metric + Trend
Start with the key metric and its movement vs previous periods.
Example: "Cancellation rate surged to **38%** (38/100 orders) in Jan 2026, up from 15% in Dec 2025 and 21% in Nov 2025"

### Step 2: Breakdown / Distribution
Decompose the headline into its components.
Example: "Of 100 Jan 2026 orders, payment status distribution: 30 paid, 38 refunded, 25 pending, 7 mixed"

### Step 3: Magnitude / Impact
Quantify the financial or operational impact.
Example: "**38 refunded orders** in Jan 2026 — highest in dataset — with **Rp 17.3M** gross revenue lost"

### Step 4: Causal Inference
Draw data-backed conclusions about root causes.
Example: "28 out of 38 cancelled orders have paid/refunded status, indicating post-payment failures"

### Step 5: Secondary Findings
Surface deeper patterns that strengthen the analysis.
Example: "10 out of 38 completed orders also refunded, suggesting service delivery failures triggering refunds"

## Formatting Rules
- Each evidence item MUST cite specific numbers (counts, percentages, IDR values) from the data
- Each item must logically flow from the previous — sequential continuity is mandatory
- Use parenthetical clarifications for context: "38% (38/100 orders)"
- Use em-dashes for emphasis on significance: "— highest in dataset —"
- Compare current vs previous periods where data is available
- Generate 3-6 evidence items per root cause, ordered from summary to detail to inference
- Use **bold** markers on key numbers for emphasis

## Hard Rules
- NEVER list evidence as disconnected bullet points — they must tell a coherent story
- ALWAYS start with the broadest metric, then narrow down
- ALWAYS end with inference or "so what" — not just raw numbers
- Evidence must be MECE within each root cause (no duplicate points across evidence items)
- Root causes MUST be distinct — no two root causes should describe the same issue at different abstraction levels
- Maximum contribution_pct should sum to approximately 100 across all root causes'
WHERE name = 'root-cause-analysis';
