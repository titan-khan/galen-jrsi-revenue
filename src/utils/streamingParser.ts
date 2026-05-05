// Streaming parser for structured AI response sections

export interface VegaLiteBlock {
  id: string;
  rawJson: string;
  isComplete: boolean;
  position: number; // character offset in the response text
}

export interface ContentSegment {
  type: 'text' | 'chart';
  content?: string;   // for text segments
  block?: VegaLiteBlock; // for chart segments
}

export interface StreamingSections {
  thinking: { text: string; isComplete: boolean };
  response: { text: string; isComplete: boolean };
  summary: { text: string; isComplete: boolean };
  charts: VegaLiteBlock[];
  currentSection: 'thinking' | 'response' | 'summary' | null;
}

export interface ParsedSummary {
  keyTakeaway: string;
  confidence: string;
  nextSteps?: string;
}

/** Regex source fragment matching accepted Vega-Lite fence tags */
const VEGA_FENCE_TAG = '(?:vega-lite|vlite)';

/**
 * Parses streaming content with section markers into structured sections.
 * Works in real-time as content streams in.
 */
export function parseStreamingContent(content: string): StreamingSections {
  const sections: StreamingSections = {
    thinking: { text: '', isComplete: false },
    response: { text: '', isComplete: false },
    summary: { text: '', isComplete: false },
    charts: [],
    currentSection: null,
  };

  // Check for thinking section
  const thinkingStart = content.indexOf('[THINKING]');
  const thinkingEnd = content.indexOf('[/THINKING]');

  if (thinkingStart !== -1) {
    if (thinkingEnd !== -1) {
      sections.thinking.text = content.slice(thinkingStart + 10, thinkingEnd).trim();
      sections.thinking.isComplete = true;
    } else {
      sections.thinking.text = content.slice(thinkingStart + 10).trim();
      sections.currentSection = 'thinking';
    }
  }

  // Check for response section
  const responseStart = content.indexOf('[RESPONSE]');
  const responseEnd = content.indexOf('[/RESPONSE]');

  if (responseStart !== -1) {
    if (responseEnd !== -1) {
      sections.response.text = content.slice(responseStart + 10, responseEnd).trim();
      sections.response.isComplete = true;
    } else {
      // Get content after [RESPONSE] but before [SUMMARY] if it exists
      const summaryStart = content.indexOf('[SUMMARY]');
      const endIndex = summaryStart !== -1 ? summaryStart : content.length;
      sections.response.text = content.slice(responseStart + 10, endIndex).trim();
      sections.currentSection = 'response';
    }
  } else if (responseEnd !== -1) {
    // [RESPONSE] tag missing but [/RESPONSE] exists — LLM dropped the opening tag.
    // Infer response starts after [/THINKING] (or beginning of content).
    const inferredStart = thinkingEnd !== -1 ? thinkingEnd + 11 : 0;
    sections.response.text = content.slice(inferredStart, responseEnd).trim();
    sections.response.isComplete = true;
  }

  // Check for summary section
  const summaryStart = content.indexOf('[SUMMARY]');
  const summaryEnd = content.indexOf('[/SUMMARY]');

  if (summaryStart !== -1) {
    if (summaryEnd !== -1) {
      sections.summary.text = content.slice(summaryStart + 9, summaryEnd).trim();
      sections.summary.isComplete = true;
    } else {
      sections.summary.text = content.slice(summaryStart + 9).trim();
      sections.currentSection = 'summary';
    }
  }

  // If no markers found, treat entire content as response
  if (thinkingStart === -1 && responseStart === -1 && summaryStart === -1) {
    sections.response.text = content;
    sections.response.isComplete = false;
    sections.currentSection = 'response';
  }

  // Extract Vega-Lite chart blocks from response text
  sections.charts = extractVegaLiteBlocks(sections.response.text);

  return sections;
}

/**
 * Parse thinking text into individual steps
 */
export function parseThinkingSteps(text: string): string[] {
  if (!text) return [];
  
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Parse summary text into structured summary object
 */
export function parseSummary(text: string): ParsedSummary | null {
  if (!text) return null;

  const takeawayMatch = text.match(/(?:Key Takeaway|Takeaway):\s*(.+?)(?:\n|$)/i);
  const confidenceMatch = text.match(/Confidence:\s*(.+?)(?:\n|$)/i);
  const nextStepsMatch = text.match(/Next Steps?:\s*(.+?)(?:\n|$)/i);

  if (!takeawayMatch && !confidenceMatch) {
    // Fallback: treat entire text as takeaway if no markers found
    return {
      keyTakeaway: text.split('\n')[0] || text,
      confidence: 'Medium',
    };
  }

  return {
    keyTakeaway: takeawayMatch?.[1]?.trim() || '',
    confidence: confidenceMatch?.[1]?.trim() || 'Medium',
    nextSteps: nextStepsMatch?.[1]?.trim(),
  };
}

/**
 * Check if content has section markers (structured format)
 */
export function hasStructuredFormat(content: string): boolean {
  return content.includes('[THINKING]') ||
         content.includes('[RESPONSE]') ||
         content.includes('[SUMMARY]');
}

/**
 * Check if content contains any Vega-Lite chart fenced code blocks.
 */
export function hasVegaLiteBlocks(content: string): boolean {
  return new RegExp('```' + VEGA_FENCE_TAG).test(content);
}

/**
 * Extract vega-lite fenced code blocks from text.
 * Handles both complete (```vega-lite ... ```) and incomplete (streaming) blocks.
 * Also handles corrupted fences where the newline after the tag was lost
 * (e.g. ```vega-liteega.github.io/schema/...) — see cleanRawJson().
 */
export function extractVegaLiteBlocks(text: string): VegaLiteBlock[] {
  const blocks: VegaLiteBlock[] = [];
  // Match ```vega-lite or ```vlite — newline after tag is optional to handle
  // corrupted fences where the LLM output lost the newline separator.
  const regex = new RegExp('```' + VEGA_FENCE_TAG + '\\s*\\n?([\\s\\S]*?)(?:```|$)', 'g');
  let match;
  let index = 0;

  while ((match = regex.exec(text)) !== null) {
    let rawJson = match[1].trim();
    const fullMatch = match[0];
    const isComplete = fullMatch.endsWith('```');

    // When the newline after the fence tag was lost, the captured content
    // may start with garbled text instead of '{'. Clean it up.
    rawJson = cleanRawJson(rawJson);

    // Skip empty blocks (can happen if the fence tag matched but content was empty)
    if (!rawJson) continue;

    blocks.push({
      id: `vega-${index}`,
      rawJson,
      isComplete,
      position: match.index,
    });
    index++;
  }

  return blocks;
}

/**
 * Clean rawJson that may have a garbled prefix from a corrupted fence tag.
 *
 * When the newline between ```vega-lite and the JSON body was dropped,
 * the captured text starts with fragments of the $schema URL instead of '{'.
 *
 * Example input:  ega.github.io/schema/vega-lite/v5.json","mark":"bar","data":{...}}
 * Expected output: {"mark":"bar","data":{...}}
 *
 * Strategy: find the first *top-level* Vega-Lite key and wrap from there,
 * rather than slicing at the first '{' which could be an inner brace.
 */
function cleanRawJson(raw: string): string {
  if (raw.startsWith('{')) return raw;

  // 1. Try to find a top-level Vega-Lite key — this is the most reliable anchor.
  //    We match known Vega-Lite root keys preceded by a comma or start-of-garble,
  //    then reconstruct `{` before the first key.
  const keyMatch = raw.match(/"(mark|data|encoding|layer|title|transform|\$schema|description|width|height|autosize)"\s*:/);
  if (keyMatch) {
    // Check if there's a *preceding* top-level key before this match
    // (e.g. `"mark":"bar","data":{...}` — we want to start at `"mark"`)
    const beforeMatch = raw.slice(0, keyMatch.index!);
    // Walk backwards from the match to find an earlier top-level key
    const allKeys = [...raw.matchAll(/"(mark|data|encoding|layer|title|transform|description|width|height|autosize)"\s*:/g)];
    if (allKeys.length > 0) {
      // Use the earliest top-level key as the start
      const firstKey = allKeys[0];
      // Check if there's a preceding comma or junk before the first key
      const prefix = raw.slice(0, firstKey.index!);
      // If prefix contains a $schema fragment, skip it entirely
      if (prefix.includes('schema') || prefix.includes('.json') || !prefix.includes('{')) {
        return '{' + raw.slice(firstKey.index!);
      }
    }
    return '{' + raw.slice(keyMatch.index!);
  }

  // 2. Fallback: find the first '{' — but only if no top-level key found above
  const braceIdx = raw.indexOf('{');
  if (braceIdx !== -1) {
    return raw.slice(braceIdx);
  }

  return raw;
}

/**
 * Attempt to repair truncated/malformed JSON from LLM output.
 * Common issues: missing closing brackets, truncated values, trailing commas.
 * Uses a brute-force approach: try parsing at every '}' boundary from the end,
 * adding missing closing brackets. This handles severely garbled JSON where
 * bracket counting is unreliable due to corrupted string values.
 * Returns the parsed object on success, or null if repair is impossible.
 */
export function tryRepairJson(raw: string): object | null {
  // 1. Try as-is first
  try {
    return JSON.parse(raw);
  } catch {
    // continue to repair
  }

  // 2. Pre-process: fix common LLM corruption patterns
  //    e.g. "avg_revenue500000, → "avg_revenue":500000,
  //    The LLM sometimes drops the ": separator between key and numeric value
  let json = raw.trim()
    .replace(/"([a-z_]+)(\d{2,}(?:\.\d+)?)\s*,/gi, '"$1":$2,')
    .replace(/"([a-z_]+)(\d{2,}(?:\.\d+)?)\s*}/gi, '"$1":$2}');

  // Try again after preprocessing
  try {
    return JSON.parse(json);
  } catch {
    // continue to bracket repair
  }

  // 3. Collect every '}' position — potential truncation points
  const closeBracePositions: number[] = [];
  for (let i = json.length - 1; i >= 0; i--) {
    if (json[i] === '}') closeBracePositions.push(i);
  }

  // 3. For each '}' from the end, try to make valid JSON
  for (const pos of closeBracePositions) {
    let candidate = json.slice(0, pos + 1);

    // Remove trailing comma that may precede the truncation
    candidate = candidate.replace(/,\s*$/, '');

    // Count open/close brackets in this candidate naively
    // (ignore string context — garbled strings make tracking unreliable)
    let braces = 0;
    let brackets = 0;
    for (const ch of candidate) {
      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '[') brackets++;
      else if (ch === ']') brackets--;
    }

    // Close any open brackets/braces
    const closing =
      ']'.repeat(Math.max(0, brackets)) +
      '}'.repeat(Math.max(0, braces));

    try {
      const result = JSON.parse(candidate + closing);
      // Validate it's a useful Vega-Lite spec (has data or mark)
      if (result && typeof result === 'object' && (result.data || result.mark || result.layer)) {
        return result;
      }
    } catch {
      // try next position
    }
  }

  return null;
}

/**
 * Ensure a repaired Vega-Lite spec has minimal encoding.
 * When the LLM truncates JSON, encoding is often lost.
 * Infers x/y from data field names and mark type.
 */
export function ensureEncoding(spec: any): any {
  if (!spec || spec.encoding || spec.layer) return spec;

  const data: any[] = spec.data?.values;
  if (!Array.isArray(data) || data.length === 0) return spec;

  // Get field names from the first data row
  const fields = Object.keys(data[0]);
  if (fields.length < 2) return spec;

  // Heuristic: first string/temporal-looking field → x, first number field → y
  let xField: string | undefined;
  let yField: string | undefined;
  const sample = data[0];

  for (const f of fields) {
    const val = sample[f];
    if (!xField && typeof val === 'string') xField = f;
    if (!yField && typeof val === 'number') yField = f;
  }

  if (!xField || !yField) {
    // Fallback: first two fields
    xField = fields[0];
    yField = fields[1];
  }

  // Detect if x is temporal (date-like strings)
  const xSample = String(sample[xField] || '');
  const isTemporal = /^\d{4}-\d{2}/.test(xSample);

  return {
    ...spec,
    encoding: {
      x: { field: xField, type: isTemporal ? 'temporal' : 'nominal', title: xField },
      y: { field: yField, type: 'quantitative', title: yField },
    },
  };
}

/**
 * Split response text into interleaved text and chart segments.
 * Strips the raw ```vega-lite...``` fences from text segments.
 */
export function splitResponseContent(
  text: string,
  charts: VegaLiteBlock[]
): ContentSegment[] {
  if (charts.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: ContentSegment[] = [];
  let lastEnd = 0;

  // Build a regex that finds each fenced block to get exact boundaries
  // Newline after tag is optional — matches corrupted fences too
  const fenceRegex = new RegExp('```' + VEGA_FENCE_TAG + '\\s*\\n?[\\s\\S]*?(?:```|$)', 'g');
  let fenceMatch;
  let chartIndex = 0;

  while ((fenceMatch = fenceRegex.exec(text)) !== null) {
    // Add text before this chart
    const textBefore = text.slice(lastEnd, fenceMatch.index).trim();
    if (textBefore) {
      segments.push({ type: 'text', content: textBefore });
    }

    // Add chart segment
    if (chartIndex < charts.length) {
      segments.push({ type: 'chart', block: charts[chartIndex] });
      chartIndex++;
    }

    lastEnd = fenceMatch.index + fenceMatch[0].length;
  }

  // Add remaining text after last chart
  const remaining = text.slice(lastEnd).trim();
  if (remaining) {
    segments.push({ type: 'text', content: remaining });
  }

  return segments;
}
