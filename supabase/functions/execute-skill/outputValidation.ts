// =============================================================================
// OUTPUT VALIDATION — Validates skill output against declared output_spec
// Informational only — does not block output, just logs warnings
// =============================================================================

interface OutputSpec {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  sectionsFound: string[];
  sectionsMissing: string[];
}

/**
 * Validate skill output against its declared output_spec.
 * This is informational — a failed validation does NOT block the output.
 * It adds traceability so we can improve skill prompts over time.
 */
export function validateSkillOutput(
  output: string,
  outputSpec: OutputSpec[] | null | undefined
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    sectionsFound: [],
    sectionsMissing: [],
  };

  // No spec defined — nothing to validate
  if (!outputSpec || outputSpec.length === 0) {
    return result;
  }

  // Normalize output for matching
  const lowerOutput = output.toLowerCase();

  for (const spec of outputSpec) {
    const sectionName = spec.name;
    const isRequired = spec.required !== false; // default to required

    // Check if the section/field appears in the output
    // We check for: the name as a heading, JSON key, or markdown section
    const patterns = [
      sectionName.toLowerCase(),
      sectionName.replace(/_/g, ' ').toLowerCase(),
      sectionName.replace(/_/g, '-').toLowerCase(),
    ];

    const found = patterns.some((p) => lowerOutput.includes(p));

    if (found) {
      result.sectionsFound.push(sectionName);
    } else if (isRequired) {
      result.sectionsMissing.push(sectionName);
      result.warnings.push(`Required output section missing: "${sectionName}"`);
      result.isValid = false;
    }
  }

  // Check for empty or trivially short output
  if (output.trim().length < 50) {
    result.warnings.push("Output is suspiciously short (< 50 characters)");
    result.isValid = false;
  }

  return result;
}

/**
 * Try to parse output as JSON and validate structure.
 * Used for skills that declare JSON output type.
 */
export function validateJsonOutput(
  output: string,
  outputSpec: OutputSpec[] | null | undefined
): ValidationResult & { parsedJson?: Record<string, unknown> } {
  const baseResult = validateSkillOutput(output, outputSpec);

  // Try to parse as JSON
  try {
    let cleaned = output.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    // Check required fields exist in JSON
    if (outputSpec) {
      const jsonKeys = Object.keys(parsed);
      for (const spec of outputSpec) {
        if (spec.required !== false && !jsonKeys.includes(spec.name)) {
          if (!baseResult.sectionsMissing.includes(spec.name)) {
            baseResult.sectionsMissing.push(spec.name);
            baseResult.warnings.push(`Required JSON field missing: "${spec.name}"`);
            baseResult.isValid = false;
          }
        }
      }
    }

    return { ...baseResult, parsedJson: parsed };
  } catch {
    // Not valid JSON — might be markdown output, which is fine for some skills
    return baseResult;
  }
}
