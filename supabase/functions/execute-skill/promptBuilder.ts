// =============================================================================
// PROMPT BUILDER — Construct system + user prompts from skill definition
// =============================================================================

interface SkillRecord {
  display_name: string;
  purpose: string;
  skill_md_body: string | null;
  hard_rules: { id: string; category: string; rule: string }[];
  section_logic: { section: string; rules: string[] }[];
  confidence_scoring: { metrics: string[]; description: string } | null;
  output_template: string;
}

/**
 * Build the system prompt from skill definition.
 * Prefers skill_md_body (SKILL.md content) when available,
 * falls back to legacy fields for backward compatibility.
 */
export function buildSystemPrompt(skill: SkillRecord): string {
  // Use SKILL.md body if available (new format)
  if (skill.skill_md_body) {
    return `${skill.skill_md_body}

## Output Format
You MUST follow the output template structure EXACTLY. Replace all {{placeholders}} with actual values.
Do NOT add, remove, rename, or reorder sections.`;
  }

  // Fall back to legacy field composition
  const hardRulesText = skill.hard_rules
    ?.map((r, i) => `${i + 1}. **${r.category.toUpperCase()}**: ${r.rule}`)
    .join('\n') || '';

  const sectionLogicText = skill.section_logic
    ?.map((s) => `### ${s.section}\n${s.rules.map((r) => `- ${r}`).join('\n')}`)
    .join('\n\n') || '';

  let prompt = `# ${skill.display_name}

## Purpose
${skill.purpose}

## Hard Generation Rules (CONSTRAINTS — YOU MUST FOLLOW THESE)
${hardRulesText}

## Section-Specific Logic
${sectionLogicText}`;

  if (skill.confidence_scoring) {
    prompt += `\n\n## Confidence Scoring
${skill.confidence_scoring.description}
Report these metrics at the end: ${skill.confidence_scoring.metrics.join(', ')}`;
  }

  prompt += `\n\n## Output Format
You MUST follow the output template structure EXACTLY. Replace all {{placeholders}} with actual values.
Do NOT add, remove, rename, or reorder sections.`;

  return prompt;
}

/**
 * Build the user prompt with input data, DB context, and output template.
 */
export function buildUserPrompt(
  skill: SkillRecord,
  inputData: Record<string, unknown>,
  dbData: Record<string, unknown>,
  chainContext?: string
): string {
  let prompt = `## Input Data Provided
${JSON.stringify(inputData, null, 2)}

## Database Query Results
${JSON.stringify(dbData, null, 2)}`;

  if (chainContext) {
    prompt += `\n\n## Previous Skill Output (Chain Context)
${chainContext}`;
  }

  prompt += `\n\n## Output Template (FOLLOW EXACTLY)
${skill.output_template}

Generate the report now. Replace all {{placeholders}} with actual values from the data above.
Use the database query results to populate metrics, calculations, and analysis.
Calculate all deltas, percentages, and aggregations from the actual data.`;

  return prompt;
}
