import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  changeUserRole,
  removeMemberFromWorkspace,
  addMemberToWorkspace,
  type WorkspaceRole,
} from "../_shared/roleManagement.ts";
import {
  getPlatformRole,
  getWorkspaceRole,
  hasWorkspaceAccess,
  isPlatformAdmin,
} from "../_shared/permissions.ts";
import { trackAPICall } from "../_shared/usageTracking.ts";
import { validateAndDecodeJWT } from "../_shared/jwtDecode.ts";

/**
 * workspace-management Edge Function
 *
 * Handles all workspace-related operations:
 * - Create workspace
 * - List workspaces
 * - Switch workspace
 * - Set default workspace
 * - Delete workspace
 */

// ── CORS Headers ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

// ── Error Handling Utilities ────────────────────────────────────────────────

/**
 * Create a structured error response with source indication and remediation
 */
function createErrorResponse(
  error: string,
  message: string,
  options?: {
    details?: any;
    source?: 'edge_runtime' | 'function_code' | 'unknown';
    remediation?: string;
    field_errors?: Array<{ field: string; message: string }>;
  }
): ErrorResponse {
  return {
    error,
    message,
    source: options?.source || 'function_code',
    details: options?.details,
    remediation: options?.remediation,
    field_errors: options?.field_errors,
  };
}

/**
 * Detect error source based on error type and context
 */
function detectErrorSource(error: any): 'edge_runtime' | 'function_code' | 'unknown' {
  // Edge Runtime errors typically occur before function code executes
  // They are usually related to JWT validation, CORS, or runtime configuration
  
  if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
    // JWT errors could be from either source, but if they happen before
    // our authentication middleware runs, they're from Edge Runtime
    return 'edge_runtime';
  }
  
  if (error?.message?.includes('CORS') || error?.message?.includes('preflight')) {
    return 'edge_runtime';
  }
  
  if (error?.message?.includes('Supabase configuration') || 
      error?.message?.includes('environment variable')) {
    return 'function_code';
  }
  
  // Database and business logic errors are from function code
  if (error?.code || error?.message?.includes('database')) {
    return 'function_code';
  }
  
  return 'unknown';
}

/**
 * Get remediation suggestion based on error type
 */
function getRemediationSuggestion(error: string, source: string): string | undefined {
  const remediations: Record<string, string> = {
    'unauthorized': 'Ensure you are logged in and have a valid authentication token. Try refreshing your session.',
    'invalid_token': 'Your authentication token is invalid. Please log in again.',
    'token_expired': 'Your authentication token has expired. Please log in again.',
    'missing_claim': 'Your authentication token is missing required information. Please log in again.',
    'forbidden': 'You do not have permission to perform this action. Contact your workspace administrator.',
    'not_found': 'The requested resource was not found. Verify the ID and try again.',
    'validation_error': 'Check the field_errors for specific validation issues and correct your input.',
    'database_error': 'A database error occurred. Please try again or contact support if the issue persists.',
    'server_error': 'An unexpected server error occurred. Please try again or contact support.',
  };
  
  if (source === 'edge_runtime') {
    return 'This error occurred at the Edge Runtime level. Check Edge Function configuration, environment variables, and JWT settings in Supabase Dashboard.';
  }
  
  return remediations[error];
}

// ── Types ───────────────────────────────────────────────────────────────────

interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  source?: 'edge_runtime' | 'function_code' | 'unknown';
  remediation?: string;
  field_errors?: Array<{
    field: string;
    message: string;
  }>;
}

interface WorkspaceContext {
  user_id: string;
  workspace_id?: string;
  platform_role?: string;
}

type IndustryType =
  | "travel"
  | "fnb"
  | "insurance"
  | "retail"
  | "logistics"
  | "custom";

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

// ── Authentication Middleware ───────────────────────────────────────────────

async function authenticateRequest(
  req: Request
): Promise<{ user_id: string; error?: ErrorResponse }> {
  console.log("=== Authentication started ===");
  
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    console.error("Authentication failed: Missing authorization header");
    return {
      user_id: "",
      error: createErrorResponse(
        "unauthorized",
        "Missing authorization header",
        {
          source: 'function_code',
          remediation: getRemediationSuggestion("unauthorized", "function_code"),
        }
      ),
    };
  }

  console.log("Authorization header present");

  // Extract JWT token from Authorization header
  const token = authHeader.replace("Bearer ", "");
  
  if (!token) {
    console.error("Authentication failed: Invalid authorization header format");
    return {
      user_id: "",
      error: createErrorResponse(
        "unauthorized",
        "Invalid authorization header format",
        {
          source: 'function_code',
          remediation: "Authorization header must be in format: Bearer <token>",
        }
      ),
    };
  }

  console.log("JWT token extracted, validating...");

  // Validate and decode JWT with comprehensive error messages
  const validationResult = validateAndDecodeJWT(token);
  
  if (!validationResult.valid || !validationResult.payload) {
    const error = validationResult.error || { 
      error: "unauthorized", 
      message: "Failed to validate token" 
    };
    console.error("JWT validation failed:", error.message);
    
    return {
      user_id: "",
      error: createErrorResponse(
        error.error,
        error.message,
        {
          source: 'function_code',
          remediation: getRemediationSuggestion(error.error, "function_code"),
        }
      ),
    };
  }

  const decoded = validationResult.payload;
  console.log("JWT validated and decoded successfully, user_id:", decoded.sub);

  return { user_id: decoded.sub };
}

// ── Workspace Context Helpers ───────────────────────────────────────────────

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

/**
 * Validate workspace access using centralized permission utilities
 * Platform admins have universal access to all workspaces
 */
async function validateWorkspaceAccess(
  supabase: any,
  user_id: string,
  workspace_id: string
): Promise<boolean> {
  console.log("=== Validating workspace access ===");
  console.log("User ID:", user_id);
  console.log("Workspace ID:", workspace_id);
  
  const hasAccess = await hasWorkspaceAccess(supabase, user_id, workspace_id);
  
  console.log("Access granted:", hasAccess);
  
  return hasAccess;
}

// ── Route Handler ───────────────────────────────────────────────────────────

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request received");
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  console.log("=== Request received ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  // Authenticate request
  const { user_id, error: authError } = await authenticateRequest(req);
  
  console.log("=== Authentication result ===");
  console.log("Success:", !authError);
  console.log("User ID:", user_id || "N/A");
  if (authError) {
    console.error("Authentication error:", authError);
  }
  
  if (authError) {
    console.error("Authentication failed, returning 401");
    return new Response(JSON.stringify(authError), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  console.log("Authentication successful for user:", user_id);

  const url = new URL(req.url);
  const path = url.pathname.split("/").filter(Boolean);
  const action = path[path.length - 1]; // Last segment is the action

  console.log("=== Request routing ===");
  console.log("Action:", action);
  console.log("Path segments:", path);

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = await getSupabaseClient(authHeader);

    console.log("Supabase client created successfully");

    // Route to appropriate handler
    switch (action) {
      case "create":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        console.log("Routing to: handleCreateWorkspace");
        return await handleCreateWorkspace(req, supabase, user_id);

      case "list":
        if (req.method !== "GET") {
          return methodNotAllowed();
        }
        console.log("Routing to: handleListWorkspaces");
        return await handleListWorkspaces(supabase, user_id);

      case "switch":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        console.log("Routing to: handleSwitchWorkspace");
        return await handleSwitchWorkspace(req, supabase, user_id);

      case "set-default":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        console.log("Routing to: handleSetDefaultWorkspace");
        return await handleSetDefaultWorkspace(req, supabase, user_id);

      case "change-role":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        console.log("Routing to: handleChangeRole");
        return await handleChangeRole(req, supabase, user_id);

      case "remove-member":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        console.log("Routing to: handleRemoveMember");
        return await handleRemoveMember(req, supabase, user_id);

      case "add-member":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        console.log("Routing to: handleAddMember");
        return await handleAddMember(req, supabase, user_id);

      default:
        // Check if it's a delete request (DELETE /{workspace_id})
        if (req.method === "DELETE" && path.length >= 2) {
          const workspace_id = path[path.length - 1];
          console.log("Routing to: handleDeleteWorkspace, workspace_id:", workspace_id);
          return await handleDeleteWorkspace(supabase, user_id, workspace_id);
        }

        console.error("No matching route found for action:", action);
        return new Response(
          JSON.stringify(
            createErrorResponse(
              "not_found",
              "Endpoint not found",
              {
                source: 'function_code',
                remediation: "Check the API documentation for valid endpoints.",
              }
            )
          ),
          {
            status: 404,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("workspace-management error:", error);
    
    const errorSource = detectErrorSource(error);
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'server_error';
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify(
        createErrorResponse(
          errorCode === 'server_error' ? 'server_error' : errorCode,
          "Internal server error",
          {
            details: errorMessage,
            source: errorSource,
            remediation: getRemediationSuggestion('server_error', errorSource),
          }
        )
      ),
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

// ── Placeholder Handlers (to be implemented in subsequent tasks) ────────────

async function handleCreateWorkspace(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { name, industry_type, description, template_id } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      fieldErrors.push({
        field: "name",
        message: "Workspace name is required",
      });
    }

    if (!industry_type) {
      fieldErrors.push({
        field: "industry_type",
        message: "Industry type is required",
      });
    } else {
      const validIndustryTypes: IndustryType[] = [
        "travel",
        "fnb",
        "insurance",
        "retail",
        "logistics",
        "custom",
      ];
      if (!validIndustryTypes.includes(industry_type as IndustryType)) {
        fieldErrors.push({
          field: "industry_type",
          message: `Industry type must be one of: ${validIndustryTypes.join(", ")}`,
        });
      }
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

    // Generate slug from workspace name
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + '-' + crypto.randomUUID().substring(0, 8);

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        name: name.trim(),
        slug: slug,
        industry_type,
        description: description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (workspaceError) {
      console.error("Error creating workspace:", workspaceError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to create workspace",
          details: workspaceError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Assign creator as owner
    const { error: userError } = await supabase.from("workspace_users").insert({
      workspace_id: workspace.id,
      user_id: user_id,
      role: "owner",
      is_default: false,
      last_accessed_at: new Date().toISOString(),
    });

    if (userError) {
      console.error("Error assigning workspace owner:", userError);
      // Rollback workspace creation
      await supabase.from("workspaces").delete().eq("id", workspace.id);

      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to assign workspace owner",
          details: userError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Apply industry template if specified
    if (template_id) {
      try {
        await applyIndustryTemplate(supabase, workspace.id, template_id);
      } catch (templateError) {
        console.error("Error applying template:", templateError);
        // Don't fail the workspace creation, just log the error
        // The workspace is still created successfully
      }
    }

    // Track API call
    await trackAPICall(supabase, workspace.id);

    return new Response(
      JSON.stringify({
        workspace_id: workspace.id,
        name: workspace.name,
        industry_type: workspace.industry_type,
      }),
      {
        status: 201,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleCreateWorkspace:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to create workspace",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function applyIndustryTemplate(
  supabase: any,
  workspace_id: string,
  template_id: string
): Promise<void> {
  // Fetch the industry template
  const { data: template, error: templateError } = await supabase
    .from("industry_templates")
    .select("*")
    .eq("id", template_id)
    .eq("is_active", true)
    .single();

  if (templateError || !template) {
    throw new Error(`Template not found: ${template_id}`);
  }

  // Create entity schema definitions in schema_registry
  if (template.entity_schemas && Array.isArray(template.entity_schemas)) {
    for (const entitySchema of template.entity_schemas) {
      const { entity_type, fields } = entitySchema;

      if (!entity_type || !fields) {
        console.error(`Invalid entity schema in template: ${JSON.stringify(entitySchema)}`);
        continue;
      }

      // Check if schema already exists for this entity type and industry
      const { data: existingSchema } = await supabase
        .from("schema_registry")
        .select("id")
        .eq("entity_type", entity_type)
        .eq("industry_type", template.industry_type)
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      // Only create if it doesn't exist
      if (!existingSchema) {
        const { error: schemaError } = await supabase
          .from("schema_registry")
          .insert({
            entity_type: entity_type,
            industry_type: template.industry_type,
            field_definitions: fields,
            validation_rules: [],
            version: 1,
            is_active: true,
          });

        if (schemaError) {
          console.error(`Error creating schema for ${entity_type}:`, schemaError);
          // Continue with other schemas even if one fails
        }
      }
    }
  }

  // Enable compatible skills for the workspace
  // Check if agent_skills table exists and has the skills
  if (template.compatible_skills && Array.isArray(template.compatible_skills) && template.compatible_skills.length > 0) {
    // Query agent_skills to verify they exist
    const { data: skills, error: skillsError } = await supabase
      .from("agent_skills")
      .select("id, name")
      .in("id", template.compatible_skills);

    if (skillsError) {
      console.error("Error fetching compatible skills:", skillsError);
      // Don't throw, just log - skills enablement is optional
      return;
    }

    if (skills && skills.length > 0) {
      // Check if workspace_skills table exists
      const { error: tableCheckError } = await supabase
        .from("workspace_skills")
        .select("id")
        .limit(1);

      // If table doesn't exist, we'll skip skill enablement
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.log("workspace_skills table not yet created, skipping skill enablement");
        return;
      }

      // Enable each skill for the workspace
      for (const skill of skills) {
        const { error: enableError } = await supabase
          .from("workspace_skills")
          .insert({
            workspace_id: workspace_id,
            skill_id: skill.id,
            is_enabled: true,
          })
          .onConflict("workspace_id,skill_id")
          .ignoreDuplicates();

        if (enableError) {
          console.error(`Error enabling skill ${skill.name}:`, enableError);
          // Continue with other skills
        }
      }
    }
  }
}

async function handleListWorkspaces(
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    // Check if user is platform admin
    const platformRole = await getPlatformRole(supabase, user_id);
    const isPlatformAdminUser = platformRole === "platform_admin";

    let workspaces;

    if (isPlatformAdminUser) {
      // Platform admin can see all workspaces (universal access)
      const { data, error } = await supabase
        .from("workspaces")
        .select(
          `
          id,
          name,
          industry_type,
          description,
          is_active,
          created_at,
          updated_at
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // For platform admin, we need to get their role in each workspace (if any)
      const workspaceIds = data.map((w: any) => w.id);
      const { data: userWorkspaces, error: userError } = await supabase
        .from("workspace_users")
        .select("workspace_id, role, is_default, last_accessed_at")
        .eq("user_id", user_id)
        .in("workspace_id", workspaceIds);

      if (userError) {
        console.error("Error fetching user workspace roles:", userError);
      }

      // Create a map of workspace_id to user data
      const userWorkspaceMap = new Map(
        (userWorkspaces || []).map((uw: any) => [uw.workspace_id, uw])
      );

      workspaces = data.map((workspace: any) => {
        const userWorkspace = userWorkspaceMap.get(workspace.id);
        return {
          id: workspace.id,
          name: workspace.name,
          industry_type: workspace.industry_type,
          description: workspace.description,
          role: userWorkspace?.role || "platform_admin",
          is_default: userWorkspace?.is_default || false,
          last_accessed_at: userWorkspace?.last_accessed_at || null,
          created_at: workspace.created_at,
        };
      });
    } else {
      // Regular users see only their workspaces
      const { data, error } = await supabase
        .from("workspace_users")
        .select(
          `
          workspace_id,
          role,
          is_default,
          last_accessed_at,
          workspaces (
            id,
            name,
            industry_type,
            description,
            is_active,
            created_at,
            updated_at
          )
        `
        )
        .eq("user_id", user_id);

      if (error) {
        throw error;
      }

      // Filter out inactive workspaces and format response
      workspaces = data
        .filter((item: any) => item.workspaces?.is_active)
        .map((item: any) => ({
          id: item.workspaces.id,
          name: item.workspaces.name,
          industry_type: item.workspaces.industry_type,
          description: item.workspaces.description,
          role: item.role,
          is_default: item.is_default,
          last_accessed_at: item.last_accessed_at,
          created_at: item.workspaces.created_at,
        }));
    }

    return new Response(
      JSON.stringify({
        workspaces,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleListWorkspaces:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to list workspaces",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleSwitchWorkspace(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { workspace_id } = body;

    // Validate required fields
    if (!workspace_id || typeof workspace_id !== "string") {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "workspace_id is required",
          field_errors: [
            {
              field: "workspace_id",
              message: "workspace_id must be a valid string",
            },
          ],
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Validate user has access to target workspace
    const hasAccess = await validateWorkspaceAccess(
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

    // Update last_accessed_at timestamp
    const { error: updateError } = await supabase
      .from("workspace_users")
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("workspace_id", workspace_id);

    if (updateError) {
      console.error("Error updating last_accessed_at:", updateError);
      // Don't fail the request if timestamp update fails
    }

    // Note: Session context update happens on the client side
    // The client will store the workspace_id and include it in subsequent requests
    // RLS policies will enforce data isolation based on workspace_id

    return new Response(
      JSON.stringify({
        success: true,
        workspace_id,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleSwitchWorkspace:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to switch workspace",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleSetDefaultWorkspace(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { workspace_id } = body;

    // Validate required fields
    if (!workspace_id || typeof workspace_id !== "string") {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "workspace_id is required",
          field_errors: [
            {
              field: "workspace_id",
              message: "workspace_id must be a valid string",
            },
          ],
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Validate user has access to target workspace
    const hasAccess = await validateWorkspaceAccess(
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

    // First, unset all default flags for this user
    const { error: unsetError } = await supabase
      .from("workspace_users")
      .update({ is_default: false })
      .eq("user_id", user_id);

    if (unsetError) {
      console.error("Error unsetting default workspaces:", unsetError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to update default workspace",
          details: unsetError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Then, set the new default workspace
    const { error: setError } = await supabase
      .from("workspace_users")
      .update({ is_default: true })
      .eq("user_id", user_id)
      .eq("workspace_id", workspace_id);

    if (setError) {
      console.error("Error setting default workspace:", setError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to set default workspace",
          details: setError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        workspace_id,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleSetDefaultWorkspace:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to set default workspace",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleDeleteWorkspace(
  supabase: any,
  user_id: string,
  workspace_id: string
): Promise<Response> {
  try {
    // Validate workspace_id
    if (!workspace_id || typeof workspace_id !== "string") {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Invalid workspace_id",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Check if workspace exists
    const { data: workspace, error: fetchError } = await supabase
      .from("workspaces")
      .select("id, name, is_active")
      .eq("id", workspace_id)
      .single();

    if (fetchError || !workspace) {
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

    // Check if workspace is already deleted
    if (!workspace.is_active) {
      return new Response(
        JSON.stringify({
          error: "already_deleted",
          message: "Workspace is already deleted",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is workspace owner
    const workspaceRole = await getWorkspaceRole(supabase, user_id, workspace_id);

    if (workspaceRole !== "owner") {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "Only workspace owners can delete workspaces",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Soft delete: Set is_active = false
    const { error: deleteError } = await supabase
      .from("workspaces")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace_id);

    if (deleteError) {
      console.error("Error deleting workspace:", deleteError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to delete workspace",
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Note: Associated data in workspace_data_entities and other tables
    // will be automatically filtered out by RLS policies since the workspace
    // is marked as inactive. We don't need to explicitly mark each record.

    return new Response(
      JSON.stringify({
        success: true,
        message: "Workspace deleted successfully",
        workspace_id,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleDeleteWorkspace:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to delete workspace",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

// ── Role Management Handlers ────────────────────────────────────────────────

async function handleChangeRole(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { workspace_id, target_user_id, new_role } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!workspace_id || typeof workspace_id !== "string") {
      fieldErrors.push({
        field: "workspace_id",
        message: "workspace_id is required",
      });
    }

    if (!target_user_id || typeof target_user_id !== "string") {
      fieldErrors.push({
        field: "target_user_id",
        message: "target_user_id is required",
      });
    }

    if (!new_role || typeof new_role !== "string") {
      fieldErrors.push({
        field: "new_role",
        message: "new_role is required",
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

    // Change the role
    const result = await changeUserRole(supabase, {
      workspace_id,
      target_user_id,
      new_role: new_role as WorkspaceRole,
      changed_by_user_id: user_id,
    });

    if (!result.success) {
      const statusCode =
        result.error === "insufficient_permissions" ||
        result.error === "self_elevation_forbidden"
          ? 403
          : result.error === "target_user_not_found" ||
            result.error === "requester_not_found"
          ? 404
          : 400;

      return new Response(
        JSON.stringify({
          error: result.error,
          message: result.message,
          details: result.details,
        }),
        {
          status: statusCode,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleChangeRole:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to change user role",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleRemoveMember(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { workspace_id, target_user_id } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!workspace_id || typeof workspace_id !== "string") {
      fieldErrors.push({
        field: "workspace_id",
        message: "workspace_id is required",
      });
    }

    if (!target_user_id || typeof target_user_id !== "string") {
      fieldErrors.push({
        field: "target_user_id",
        message: "target_user_id is required",
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

    // Remove the member
    const result = await removeMemberFromWorkspace(supabase, {
      workspace_id,
      target_user_id,
      removed_by_user_id: user_id,
    });

    if (!result.success) {
      const statusCode =
        result.error === "insufficient_permissions" ? 403
        : result.error === "target_user_not_found" ||
          result.error === "requester_not_found"
        ? 404
        : 400;

      return new Response(
        JSON.stringify({
          error: result.error,
          message: result.message,
          details: result.details,
        }),
        {
          status: statusCode,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleRemoveMember:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to remove member",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleAddMember(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { workspace_id, new_user_id, role } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!workspace_id || typeof workspace_id !== "string") {
      fieldErrors.push({
        field: "workspace_id",
        message: "workspace_id is required",
      });
    }

    if (!new_user_id || typeof new_user_id !== "string") {
      fieldErrors.push({
        field: "new_user_id",
        message: "new_user_id is required",
      });
    }

    if (!role || typeof role !== "string") {
      fieldErrors.push({
        field: "role",
        message: "role is required",
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

    // Add the member
    const result = await addMemberToWorkspace(
      supabase,
      workspace_id,
      new_user_id,
      role as WorkspaceRole,
      user_id
    );

    if (!result.success) {
      const statusCode =
        result.error === "insufficient_permissions" ? 403
        : result.error === "requester_not_found"
        ? 404
        : 400;

      return new Response(
        JSON.stringify({
          error: result.error,
          message: result.message,
          details: result.details,
        }),
        {
          status: statusCode,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
      }),
      {
        status: 201,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleAddMember:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to add member",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

// ── Main Entry Point ────────────────────────────────────────────────────────

Deno.serve(handleRequest);
