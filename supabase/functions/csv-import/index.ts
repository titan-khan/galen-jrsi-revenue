import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { hasWorkspaceAccess } from "../_shared/permissions.ts";
import { trackStorage, trackAPICall } from "../_shared/usageTracking.ts";

/**
 * csv-import Edge Function
 *
 * Handles CSV file upload and import operations:
 * - Upload CSV file and extract headers
 * - Detect entity type from column names
 * - Suggest column mappings using fuzzy matching
 * - Validate and import data into workspace_data_entities
 */

// ── CORS Headers ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

// ── Types ───────────────────────────────────────────────────────────────────

interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  field_errors?: Array<{
    field: string;
    message: string;
  }>;
}

interface ColumnMapping {
  csv_column: string;
  schema_field: string;
  confidence: number;
}

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

interface FieldDefinition {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "object";
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

// ── Authentication Middleware ───────────────────────────────────────────────

async function authenticateRequest(
  req: Request
): Promise<{ user_id: string; error?: ErrorResponse }> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return {
      user_id: "",
      error: {
        error: "unauthorized",
        message: "Missing authorization header",
      },
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      user_id: "",
      error: {
        error: "server_error",
        message: "Server configuration error",
      },
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Auth error:", error);
    return {
      user_id: "",
      error: {
        error: "unauthorized",
        message: "Invalid or expired token",
      },
    };
  }

  return { user_id: user.id };
}

// ── Supabase Client Helper ──────────────────────────────────────────────────

async function getSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

// ── CSV Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse CSV content and extract headers and rows
 * Simple CSV parser - handles basic CSV format
 */
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

// ── Fuzzy Matching Utilities ────────────────────────────────────────────────

/**
 * Normalize column name for comparison
 * Removes special characters, converts to lowercase, removes spaces
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\s-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits required to change one string into the other
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// ── Entity Type Detection ───────────────────────────────────────────────────

/**
 * Detect entity type from CSV column headers
 * Returns the most likely entity type based on column name matching
 */
async function detectEntityType(
  supabase: any,
  columnHeaders: string[],
  workspace_id: string
): Promise<{ entity_type: string; confidence: number } | null> {
  // Get workspace industry type
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("industry_type")
    .eq("id", workspace_id)
    .single();

  if (workspaceError || !workspace) {
    console.error("Error fetching workspace:", workspaceError);
    return null;
  }

  const industryType = workspace.industry_type;

  // Get all entity types from schema registry for this industry
  const { data: schemas, error: schemaError } = await supabase
    .from("schema_registry")
    .select("entity_type, field_definitions")
    .eq("industry_type", industryType)
    .eq("is_active", true);

  if (schemaError || !schemas || schemas.length === 0) {
    console.error("Error fetching schemas:", schemaError);
    return null;
  }

  // Normalize column headers for matching
  const normalizedHeaders = columnHeaders.map((h) =>
    normalizeColumnName(h)
  );

  // Calculate match score for each entity type
  let bestMatch: { entity_type: string; confidence: number } | null = null;

  for (const schema of schemas) {
    const fieldDefinitions = schema.field_definitions as FieldDefinition[];
    const schemaFieldNames = fieldDefinitions.map((f) =>
      normalizeColumnName(f.name)
    );

    // Count how many CSV columns match schema fields
    let matchCount = 0;
    for (const normalizedHeader of normalizedHeaders) {
      for (const schemaField of schemaFieldNames) {
        const similarity = calculateSimilarity(normalizedHeader, schemaField);
        if (similarity > 0.7) {
          // Threshold for considering a match
          matchCount++;
          break;
        }
      }
    }

    // Calculate confidence as percentage of matched columns
    const confidence = matchCount / Math.max(normalizedHeaders.length, schemaFieldNames.length);

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        entity_type: schema.entity_type,
        confidence,
      };
    }
  }

  return bestMatch;
}

// ── Column Mapping Algorithm ────────────────────────────────────────────────

/**
 * Suggest column mappings between CSV headers and schema fields
 * Uses fuzzy string matching to find the best matches
 */
async function suggestColumnMappings(
  supabase: any,
  csvHeaders: string[],
  entityType: string,
  industryType: string
): Promise<ColumnMapping[]> {
  // Get schema definition for the entity type
  const { data: schema, error: schemaError } = await supabase
    .from("schema_registry")
    .select("field_definitions")
    .eq("entity_type", entityType)
    .eq("industry_type", industryType)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (schemaError || !schema) {
    console.error("Error fetching schema:", schemaError);
    return [];
  }

  const fieldDefinitions = schema.field_definitions as FieldDefinition[];
  const suggestions: ColumnMapping[] = [];

  // For each CSV column, find the best matching schema field
  for (const csvColumn of csvHeaders) {
    let bestMatch: { field: string; score: number } | null = null;

    const normalizedCsvColumn = normalizeColumnName(csvColumn);

    for (const schemaField of fieldDefinitions) {
      const normalizedSchemaField = normalizeColumnName(schemaField.name);
      const score = calculateSimilarity(normalizedCsvColumn, normalizedSchemaField);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { field: schemaField.name, score };
      }
    }

    // Only include mappings with confidence > 0.5
    if (bestMatch && bestMatch.score > 0.5) {
      suggestions.push({
        csv_column: csvColumn,
        schema_field: bestMatch.field,
        confidence: bestMatch.score,
      });
    }
  }

  return suggestions;
}

// ── Data Validation and Import ──────────────────────────────────────────────

/**
 * Validate a single field value against its schema definition
 */
function validateFieldValue(
  value: string,
  fieldDef: FieldDefinition
): { valid: boolean; convertedValue?: any; error?: string } {
  // Handle empty values
  if (!value || value.trim() === "") {
    if (fieldDef.required) {
      return { valid: false, error: "Required field is empty" };
    }
    return { valid: true, convertedValue: null };
  }

  // Type conversion and validation
  switch (fieldDef.type) {
    case "string":
      if (fieldDef.validation?.pattern) {
        const regex = new RegExp(fieldDef.validation.pattern);
        if (!regex.test(value)) {
          return { valid: false, error: "Value does not match required pattern" };
        }
      }
      if (fieldDef.validation?.enum) {
        if (!fieldDef.validation.enum.includes(value)) {
          return {
            valid: false,
            error: `Value must be one of: ${fieldDef.validation.enum.join(", ")}`,
          };
        }
      }
      return { valid: true, convertedValue: value };

    case "number":
      const num = parseFloat(value);
      if (isNaN(num)) {
        return { valid: false, error: "Value is not a valid number" };
      }
      if (fieldDef.validation?.min !== undefined && num < fieldDef.validation.min) {
        return {
          valid: false,
          error: `Value must be at least ${fieldDef.validation.min}`,
        };
      }
      if (fieldDef.validation?.max !== undefined && num > fieldDef.validation.max) {
        return {
          valid: false,
          error: `Value must be at most ${fieldDef.validation.max}`,
        };
      }
      return { valid: true, convertedValue: num };

    case "date":
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: "Value is not a valid date" };
      }
      return { valid: true, convertedValue: date.toISOString() };

    case "boolean":
      const lowerValue = value.toLowerCase();
      if (["true", "1", "yes", "y"].includes(lowerValue)) {
        return { valid: true, convertedValue: true };
      } else if (["false", "0", "no", "n"].includes(lowerValue)) {
        return { valid: true, convertedValue: false };
      }
      return { valid: false, error: "Value is not a valid boolean" };

    case "array":
      try {
        const arr = JSON.parse(value);
        if (!Array.isArray(arr)) {
          return { valid: false, error: "Value is not a valid array" };
        }
        return { valid: true, convertedValue: arr };
      } catch {
        // Try splitting by comma
        const arr = value.split(",").map((v) => v.trim());
        return { valid: true, convertedValue: arr };
      }

    case "object":
      try {
        const obj = JSON.parse(value);
        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
          return { valid: false, error: "Value is not a valid object" };
        }
        return { valid: true, convertedValue: obj };
      } catch {
        return { valid: false, error: "Value is not valid JSON" };
      }

    default:
      return { valid: true, convertedValue: value };
  }
}

/**
 * Convert CSV row to JSONB entity data
 */
function convertRowToEntity(
  row: string[],
  headers: string[],
  mappings: ColumnMapping[],
  fieldDefinitions: FieldDefinition[]
): { entity: Record<string, any>; errors: ValidationError[] } {
  const entity: Record<string, any> = {};
  const errors: ValidationError[] = [];

  // Create a map of CSV column to schema field
  const mappingMap = new Map(
    mappings.map((m) => [m.csv_column, m.schema_field])
  );

  // Create a map of field name to field definition
  const fieldDefMap = new Map(
    fieldDefinitions.map((f) => [f.name, f])
  );

  // Process each column in the row
  for (let i = 0; i < headers.length; i++) {
    const csvColumn = headers[i];
    const schemaField = mappingMap.get(csvColumn);

    if (!schemaField) {
      // Column not mapped, skip it
      continue;
    }

    const fieldDef = fieldDefMap.get(schemaField);
    if (!fieldDef) {
      // Field definition not found, skip it
      continue;
    }

    const value = row[i] || "";
    const validation = validateFieldValue(value, fieldDef);

    if (!validation.valid) {
      errors.push({
        row: 0, // Will be set by caller
        field: schemaField,
        error: validation.error || "Validation failed",
      });
    } else {
      entity[schemaField] = validation.convertedValue;
    }
  }

  // Check for missing required fields
  for (const fieldDef of fieldDefinitions) {
    if (fieldDef.required && !(fieldDef.name in entity)) {
      errors.push({
        row: 0, // Will be set by caller
        field: fieldDef.name,
        error: "Required field is missing",
      });
    }
  }

  return { entity, errors };
}

// ── Route Handler ───────────────────────────────────────────────────────────

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Authenticate request
  const { user_id, error: authError } = await authenticateRequest(req);
  if (authError) {
    return new Response(JSON.stringify(authError), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").filter(Boolean);
  const action = path[path.length - 1]; // Last segment is the action

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = await getSupabaseClient(authHeader);

    // Route to appropriate handler
    switch (action) {
      case "upload":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        return await handleUpload(req, supabase, user_id);

      case "suggest-mapping":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        return await handleSuggestMapping(req, supabase, user_id);

      case "confirm-and-import":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        return await handleConfirmAndImport(req, supabase, user_id);

      case "get-session":
        if (req.method !== "GET") {
          return methodNotAllowed();
        }
        return await handleGetSession(req, supabase, user_id);

      case "generate-template":
        if (req.method !== "GET") {
          return methodNotAllowed();
        }
        return await handleGenerateTemplate(req, supabase, user_id);

      default:
        return new Response(
          JSON.stringify({
            error: "not_found",
            message: "Endpoint not found",
          }),
          {
            status: 404,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("csv-import error:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

function methodNotAllowed(): Response {
  return new Response(
    JSON.stringify({
      error: "method_not_allowed",
      message: "HTTP method not allowed for this endpoint",
    }),
    {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
}

// ── Handler Placeholders (to be implemented in subsequent subtasks) ─────────

async function handleUpload(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspace_id = formData.get("workspace_id") as string;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!file) {
      fieldErrors.push({
        field: "file",
        message: "CSV file is required",
      });
    }

    if (!workspace_id || typeof workspace_id !== "string") {
      fieldErrors.push({
        field: "workspace_id",
        message: "workspace_id is required",
      });
    }

    if (fieldErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Invalid input data",
          field_errors: fieldErrors,
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Validate workspace access
    const hasAccess = await hasWorkspaceAccess(
      supabase,
      user_id,
      workspace_id
    );

    if (!hasAccess) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "You do not have access to this workspace",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Read file content
    const content = await file.text();

    // Parse CSV to extract headers
    let headers: string[];
    let rows: string[][];

    try {
      const parsed = parseCSV(content);
      headers = parsed.headers;
      rows = parsed.rows;
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "parse_error",
          message: "Failed to parse CSV file",
          details:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (headers.length === 0) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "CSV file has no headers",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Store the CSV content temporarily (we'll store it in the session)
    // For now, we'll store the raw content as a base64 string in the session
    const contentBase64 = btoa(content);

    // Create CSV import session
    const { data: session, error: sessionError } = await supabase
      .from("csv_import_sessions")
      .insert({
        workspace_id,
        user_id,
        file_name: file.name,
        file_size_bytes: file.size,
        import_status: "uploaded",
        rows_imported: 0,
        rows_failed: 0,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating import session:", sessionError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to create import session",
          details: sessionError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Store CSV content in a temporary location
    // For simplicity, we'll store it in the session's validation_errors field as a workaround
    // In production, you'd want to use Supabase Storage or similar
    const { error: updateError } = await supabase
      .from("csv_import_sessions")
      .update({
        validation_errors: { csv_content: contentBase64 },
      })
      .eq("id", session.id);

    if (updateError) {
      console.error("Error storing CSV content:", updateError);
      // Don't fail the request, just log the error
    }

    // Detect entity type from column headers
    const detectedEntity = await detectEntityType(
      supabase,
      headers,
      workspace_id
    );

    // Update session with detected entity type
    if (detectedEntity) {
      const { error: entityUpdateError } = await supabase
        .from("csv_import_sessions")
        .update({
          detected_entity_type: detectedEntity.entity_type,
          import_status: "mapping",
        })
        .eq("id", session.id);

      if (entityUpdateError) {
        console.error("Error updating detected entity type:", entityUpdateError);
      }
    }

    // Track API call
    await trackAPICall(supabase, workspace_id);

    return new Response(
      JSON.stringify({
        session_id: session.id,
        column_headers: headers,
        row_count: rows.length,
        file_name: file.name,
        file_size_bytes: file.size,
        detected_entity_type: detectedEntity?.entity_type || null,
        detection_confidence: detectedEntity?.confidence || 0,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleUpload:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to upload CSV file",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleSuggestMapping(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { session_id, detected_entity_type, column_headers } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!session_id || typeof session_id !== "string") {
      fieldErrors.push({
        field: "session_id",
        message: "session_id is required",
      });
    }

    if (!detected_entity_type || typeof detected_entity_type !== "string") {
      fieldErrors.push({
        field: "detected_entity_type",
        message: "detected_entity_type is required",
      });
    }

    if (!column_headers || !Array.isArray(column_headers)) {
      fieldErrors.push({
        field: "column_headers",
        message: "column_headers must be an array",
      });
    }

    if (fieldErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Invalid input data",
          field_errors: fieldErrors,
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the import session
    const { data: session, error: sessionError } = await supabase
      .from("csv_import_sessions")
      .select("workspace_id, user_id")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Import session not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user owns this session
    if (session.user_id !== user_id) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "You do not have access to this import session",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Get workspace industry type
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("industry_type")
      .eq("id", session.workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Workspace not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Generate column mapping suggestions
    const mappings = await suggestColumnMappings(
      supabase,
      column_headers,
      detected_entity_type,
      workspace.industry_type
    );

    // Update session with suggested mappings
    const { error: updateError } = await supabase
      .from("csv_import_sessions")
      .update({
        column_mappings: mappings,
        detected_entity_type,
      })
      .eq("id", session_id);

    if (updateError) {
      console.error("Error updating session mappings:", updateError);
      // Don't fail the request, just log the error
    }

    // Track API call
    await trackAPICall(supabase, session.workspace_id);

    return new Response(
      JSON.stringify({
        mappings,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleSuggestMapping:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to suggest column mappings",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleConfirmAndImport(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { session_id, confirmed_mappings } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!session_id || typeof session_id !== "string") {
      fieldErrors.push({
        field: "session_id",
        message: "session_id is required",
      });
    }

    if (!confirmed_mappings || !Array.isArray(confirmed_mappings)) {
      fieldErrors.push({
        field: "confirmed_mappings",
        message: "confirmed_mappings must be an array",
      });
    }

    if (fieldErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Invalid input data",
          field_errors: fieldErrors,
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the import session
    const { data: session, error: sessionError } = await supabase
      .from("csv_import_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Import session not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user owns this session
    if (session.user_id !== user_id) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "You do not have access to this import session",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Get workspace industry type
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("industry_type")
      .eq("id", session.workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Workspace not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Get schema definition
    const { data: schema, error: schemaError } = await supabase
      .from("schema_registry")
      .select("field_definitions")
      .eq("entity_type", session.detected_entity_type)
      .eq("industry_type", workspace.industry_type)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (schemaError || !schema) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Schema definition not found for entity type",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const fieldDefinitions = schema.field_definitions as FieldDefinition[];

    // Retrieve CSV content from session
    const csvContent = session.validation_errors?.csv_content;
    if (!csvContent) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "CSV content not found in session",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Decode CSV content
    const content = atob(csvContent);
    const { headers, rows } = parseCSV(content);

    // Update session status
    await supabase
      .from("csv_import_sessions")
      .update({
        import_status: "importing",
        column_mappings: confirmed_mappings,
      })
      .eq("id", session_id);

    // Process and import rows
    let rowsImported = 0;
    let rowsFailed = 0;
    const allErrors: ValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { entity, errors } = convertRowToEntity(
        row,
        headers,
        confirmed_mappings,
        fieldDefinitions
      );

      if (errors.length > 0) {
        // Mark errors with row number
        errors.forEach((err) => {
          err.row = i + 2; // +2 because row 1 is headers, and we're 0-indexed
        });
        allErrors.push(...errors);
        rowsFailed++;
        continue;
      }

      // Insert entity into workspace_data_entities
      const { error: insertError } = await supabase
        .from("workspace_data_entities")
        .insert({
          workspace_id: session.workspace_id,
          entity_type: session.detected_entity_type,
          entity_data: entity,
          row_count: 1,
        });

      if (insertError) {
        console.error("Error inserting entity:", insertError);
        allErrors.push({
          row: i + 2,
          field: "",
          error: `Database error: ${insertError.message}`,
        });
        rowsFailed++;
      } else {
        rowsImported++;
      }
    }

    // Update session with final status
    await supabase
      .from("csv_import_sessions")
      .update({
        import_status: rowsFailed === 0 ? "completed" : "failed",
        rows_imported: rowsImported,
        rows_failed: rowsFailed,
        validation_errors: allErrors.length > 0 ? { errors: allErrors } : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    // Track storage usage (estimate: ~1KB per row imported)
    if (rowsImported > 0) {
      const storageMB = (rowsImported * 1024) / (1024 * 1024); // Convert bytes to MB
      await trackStorage(supabase, session.workspace_id, storageMB);
    }

    // Track API call
    await trackAPICall(supabase, session.workspace_id);

    // Get skill recommendations (placeholder for now)
    // This would call the skill recommendation engine
    const recommended_skills: any[] = [];

    return new Response(
      JSON.stringify({
        rows_imported: rowsImported,
        rows_failed: rowsFailed,
        errors: allErrors.slice(0, 100), // Limit to first 100 errors
        recommended_skills,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleConfirmAndImport:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to import CSV data",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleGetSession(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id");

    if (!session_id) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "session_id query parameter is required",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the import session
    const { data: session, error: sessionError } = await supabase
      .from("csv_import_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Import session not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user owns this session
    if (session.user_id !== user_id) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "You do not have access to this import session",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Remove CSV content from response (it can be large)
    const responseSession = { ...session };
    if (responseSession.validation_errors?.csv_content) {
      delete responseSession.validation_errors.csv_content;
    }

    return new Response(
      JSON.stringify({
        session: responseSession,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleGetSession:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to retrieve import session",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Generate CSV template for an entity type
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7
 */
async function handleGenerateTemplate(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const entity_type = url.searchParams.get("entity_type");
    const industry_type = url.searchParams.get("industry_type");

    if (!entity_type) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "entity_type query parameter is required",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (!industry_type) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "industry_type query parameter is required",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the schema for this entity type
    const { data: schema, error: schemaError } = await supabase
      .from("schema_registry")
      .select("*")
      .eq("entity_type", entity_type)
      .eq("industry_type", industry_type)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (schemaError || !schema) {
      // If no schema found, try to get it from industry template
      const { data: template, error: templateError } = await supabase
        .from("industry_templates")
        .select("entity_schemas")
        .eq("industry_type", industry_type)
        .eq("is_active", true)
        .single();

      if (templateError || !template) {
        return new Response(
          JSON.stringify({
            error: "not_found",
            message: `Schema not found for entity type '${entity_type}' in industry '${industry_type}'`,
          }),
          {
            status: 404,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      // Find the entity schema in the template
      const entitySchema = template.entity_schemas?.find(
        (es: any) => es.entity_type === entity_type
      );

      if (!entitySchema || !entitySchema.fields) {
        return new Response(
          JSON.stringify({
            error: "not_found",
            message: `Entity type '${entity_type}' not found in industry template`,
          }),
          {
            status: 404,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      // Generate CSV from template schema
      const csvContent = generateCSVTemplate(entitySchema.fields, entity_type);

      return new Response(csvContent, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${entity_type}_template.csv"`,
        },
      });
    }

    // Generate CSV from schema registry
    const csvContent = generateCSVTemplate(schema.field_definitions, entity_type);

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${entity_type}_template.csv"`,
      },
    });
  } catch (error) {
    console.error("Error in handleGenerateTemplate:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to generate CSV template",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Generate CSV template content from field definitions
 * Includes: header row, sample data row, and comment row with types and validation
 */
function generateCSVTemplate(
  fieldDefinitions: FieldDefinition[],
  entityType: string
): string {
  if (!fieldDefinitions || fieldDefinitions.length === 0) {
    throw new Error("No field definitions provided");
  }

  const lines: string[] = [];

  // Row 1: Header row with all field names (required and optional)
  const headers = fieldDefinitions.map((field) => field.name);
  lines.push(headers.join(","));

  // Row 2: Sample data row demonstrating correct format
  const sampleData = fieldDefinitions.map((field) => {
    return generateSampleValue(field);
  });
  lines.push(sampleData.join(","));

  // Row 3: Comment row with data types and validation rules
  const typeComments = fieldDefinitions.map((field) => {
    const parts: string[] = [];
    
    // Add type
    parts.push(`type:${field.type}`);
    
    // Add required flag
    if (field.required) {
      parts.push("required");
    } else {
      parts.push("optional");
    }
    
    // Add validation rules if present
    if (field.validation) {
      if (field.validation.min !== undefined) {
        parts.push(`min:${field.validation.min}`);
      }
      if (field.validation.max !== undefined) {
        parts.push(`max:${field.validation.max}`);
      }
      if (field.validation.pattern) {
        parts.push(`pattern:${field.validation.pattern}`);
      }
      if (field.validation.enum && Array.isArray(field.validation.enum)) {
        parts.push(`enum:[${field.validation.enum.join("|")}]`);
      }
    }
    
    return `# ${parts.join(" ")}`;
  });
  lines.push(typeComments.join(","));

  // Join with newlines and ensure UTF-8 encoding
  return lines.join("\n");
}

/**
 * Generate sample value for a field based on its type
 */
function generateSampleValue(field: FieldDefinition): string {
  const fieldName = field.name.toLowerCase();
  
  switch (field.type) {
    case "string":
      // Generate contextual sample based on field name
      if (fieldName.includes("email")) {
        return "user@example.com";
      } else if (fieldName.includes("name")) {
        return "Sample Name";
      } else if (fieldName.includes("id")) {
        return "ID123";
      } else if (fieldName.includes("status")) {
        return field.validation?.enum?.[0] || "active";
      } else if (fieldName.includes("city") || fieldName.includes("location")) {
        return "New York";
      } else if (fieldName.includes("category") || fieldName.includes("type")) {
        return field.validation?.enum?.[0] || "Category A";
      } else {
        return "Sample Value";
      }
    
    case "number":
      if (fieldName.includes("price") || fieldName.includes("amount") || fieldName.includes("cost")) {
        return "99.99";
      } else if (fieldName.includes("quantity") || fieldName.includes("count")) {
        return "10";
      } else if (fieldName.includes("distance") || fieldName.includes("km")) {
        return "150";
      } else {
        return "100";
      }
    
    case "date":
      return "2024-01-15";
    
    case "boolean":
      return "true";
    
    case "array":
      return "[item1,item2]";
    
    case "object":
      return '{"key":"value"}';
    
    default:
      return "sample";
  }
}

// ── Main Entry Point ────────────────────────────────────────────────────────

Deno.serve(handleRequest);
