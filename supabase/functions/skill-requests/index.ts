import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getPlatformRole,
  getWorkspaceRole,
  validatePermission,
  isPlatformAdmin,
  hasWorkspaceAccess,
} from "../_shared/permissions.ts";
import { notifyPlatformAdmins, createNotification } from "../_shared/notifications.ts";
import { trackAPICall } from "../_shared/usageTracking.ts";

/**
 * skill-requests Edge Function
 *
 * Handles all skill request operations:
 * - Create skill request
 * - List skill requests (user view)
 * - List skill requests (admin view)
 * - Update skill request status (admin only)
 * - Add comment to skill request
 * - Get skill request details
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

type SkillRequestStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "in_progress"
  | "completed"
  | "rejected";

type SkillRequestPriority = "low" | "medium" | "high" | "critical";

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

// ── Helper Functions ────────────────────────────────────────────────────────

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
      case "create":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        return await handleCreateSkillRequest(req, supabase, user_id);

      case "list":
        if (req.method !== "GET") {
          return methodNotAllowed();
        }
        return await handleListSkillRequests(req, supabase, user_id);

      case "admin-list":
        if (req.method !== "GET") {
          return methodNotAllowed();
        }
        return await handleAdminListSkillRequests(req, supabase, user_id);

      case "update-status":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        return await handleUpdateStatus(req, supabase, user_id);

      case "comment":
        if (req.method !== "POST") {
          return methodNotAllowed();
        }
        return await handleAddComment(req, supabase, user_id);

      default:
        // Check if it's a details request (GET /{request_id})
        if (req.method === "GET" && path.length >= 2) {
          const request_id = path[path.length - 1];
          return await handleGetRequestDetails(supabase, user_id, request_id);
        }

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
    console.error("skill-requests error:", error);
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

// ── Placeholder Handlers (to be implemented) ────────────────────────────────

async function handleCreateSkillRequest(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const {
      workspace_id,
      skill_name,
      description,
      use_case,
      business_impact,
      required_entities,
      expected_output,
      priority,
    } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!workspace_id || typeof workspace_id !== "string") {
      fieldErrors.push({
        field: "workspace_id",
        message: "workspace_id is required",
      });
    }

    if (!skill_name || typeof skill_name !== "string" || skill_name.trim().length === 0) {
      fieldErrors.push({
        field: "skill_name",
        message: "skill_name is required",
      });
    }

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      fieldErrors.push({
        field: "description",
        message: "description is required",
      });
    }

    if (!use_case || typeof use_case !== "string" || use_case.trim().length === 0) {
      fieldErrors.push({
        field: "use_case",
        message: "use_case is required",
      });
    }

    if (!business_impact || typeof business_impact !== "string" || business_impact.trim().length === 0) {
      fieldErrors.push({
        field: "business_impact",
        message: "business_impact is required",
      });
    }

    // Validate priority enum
    if (!priority) {
      fieldErrors.push({
        field: "priority",
        message: "priority is required",
      });
    } else {
      const validPriorities: SkillRequestPriority[] = ["low", "medium", "high", "critical"];
      if (!validPriorities.includes(priority as SkillRequestPriority)) {
        fieldErrors.push({
          field: "priority",
          message: `priority must be one of: ${validPriorities.join(", ")}`,
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

    // Check if user has access to the workspace
    const hasAccess = await hasWorkspaceAccess(supabase, user_id, workspace_id);
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

    // Check if user has permission to request skills
    const permissionResult = await validatePermission(supabase, {
      user_id,
      workspace_id,
      action: "can_request_skills",
    });

    if (!permissionResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "You do not have permission to request skills in this workspace",
          details: permissionResult.reason,
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Create skill request
    const { data: skillRequest, error: createError } = await supabase
      .from("skill_requests")
      .insert({
        workspace_id,
        requester_id: user_id,
        skill_name: skill_name.trim(),
        description: description.trim(),
        use_case: use_case.trim(),
        business_impact: business_impact.trim(),
        required_entities: required_entities || [],
        expected_output: expected_output?.trim() || null,
        priority,
        status: "pending",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating skill request:", createError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to create skill request",
          details: createError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Create notification for platform admins
    const notificationResult = await notifyPlatformAdmins(
      supabase,
      "skill_request_status",
      "New Skill Request",
      `${skill_name} - ${priority} priority`,
      skillRequest.id
    );

    if (!notificationResult.success) {
      console.error("Failed to notify platform admins:", notificationResult.error);
      // Don't fail the request if notification fails
    }

    // Track API call
    await trackAPICall(supabase, workspace_id);

    return new Response(
      JSON.stringify({
        request_id: skillRequest.id,
        status: skillRequest.status,
        created_at: skillRequest.created_at,
      }),
      {
        status: 201,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleCreateSkillRequest:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to create skill request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleListSkillRequests(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const workspace_id = url.searchParams.get("workspace_id");

    // Validate workspace_id
    if (!workspace_id) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "workspace_id query parameter is required",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has access to the workspace
    const hasAccess = await hasWorkspaceAccess(supabase, user_id, workspace_id);
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

    // Query skill requests for the workspace
    const { data: requests, error: queryError } = await supabase
      .from("skill_requests")
      .select(
        `
        id,
        skill_name,
        description,
        use_case,
        business_impact,
        required_entities,
        expected_output,
        priority,
        status,
        created_at,
        updated_at
      `
      )
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Error querying skill requests:", queryError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to fetch skill requests",
          details: queryError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        requests: requests || [],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleListSkillRequests:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to list skill requests",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleAdminListSkillRequests(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    // Check if user is platform admin
    const isAdmin = await isPlatformAdmin(supabase, user_id);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "Only platform admins can access this endpoint",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const workspace_id = url.searchParams.get("workspace_id");
    const start_date = url.searchParams.get("start_date");
    const end_date = url.searchParams.get("end_date");

    // Build query
    let query = supabase
      .from("skill_requests")
      .select(
        `
        id,
        workspace_id,
        requester_id,
        skill_name,
        description,
        use_case,
        business_impact,
        required_entities,
        expected_output,
        priority,
        status,
        rejection_reason,
        linked_skill_id,
        created_at,
        updated_at,
        workspaces (
          id,
          name,
          industry_type
        )
      `
      );

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (workspace_id) {
      query = query.eq("workspace_id", workspace_id);
    }

    if (start_date) {
      query = query.gte("created_at", start_date);
    }

    if (end_date) {
      query = query.lte("created_at", end_date);
    }

    // Order by created_at descending (newest first)
    query = query.order("created_at", { ascending: false });

    const { data: requests, error: queryError } = await query;

    if (queryError) {
      console.error("Error querying skill requests:", queryError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to fetch skill requests",
          details: queryError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Format response with workspace name
    const formattedRequests = (requests || []).map((request: any) => ({
      id: request.id,
      workspace_id: request.workspace_id,
      workspace_name: request.workspaces?.name || "Unknown",
      workspace_industry: request.workspaces?.industry_type || "unknown",
      requester_id: request.requester_id,
      skill_name: request.skill_name,
      description: request.description,
      use_case: request.use_case,
      business_impact: request.business_impact,
      required_entities: request.required_entities,
      expected_output: request.expected_output,
      priority: request.priority,
      status: request.status,
      rejection_reason: request.rejection_reason,
      linked_skill_id: request.linked_skill_id,
      created_at: request.created_at,
      updated_at: request.updated_at,
    }));

    return new Response(
      JSON.stringify({
        requests: formattedRequests,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleAdminListSkillRequests:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to list skill requests",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleUpdateStatus(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    // Check if user is platform admin
    const isAdmin = await isPlatformAdmin(supabase, user_id);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "Only platform admins can update skill request status",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { request_id, new_status, notes, linked_skill_id, rejection_reason } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!request_id || typeof request_id !== "string") {
      fieldErrors.push({
        field: "request_id",
        message: "request_id is required",
      });
    }

    if (!new_status || typeof new_status !== "string") {
      fieldErrors.push({
        field: "new_status",
        message: "new_status is required",
      });
    } else {
      const validStatuses: SkillRequestStatus[] = [
        "pending",
        "reviewing",
        "approved",
        "in_progress",
        "completed",
        "rejected",
      ];
      if (!validStatuses.includes(new_status as SkillRequestStatus)) {
        fieldErrors.push({
          field: "new_status",
          message: `new_status must be one of: ${validStatuses.join(", ")}`,
        });
      }
    }

    // Validate rejection_reason for rejected status
    if (new_status === "rejected") {
      if (!rejection_reason || typeof rejection_reason !== "string" || rejection_reason.trim().length === 0) {
        fieldErrors.push({
          field: "rejection_reason",
          message: "rejection_reason is required when status is rejected",
        });
      }
    }

    // Validate linked_skill_id for completed status
    if (new_status === "completed") {
      if (!linked_skill_id || typeof linked_skill_id !== "string") {
        fieldErrors.push({
          field: "linked_skill_id",
          message: "linked_skill_id is required when status is completed",
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

    // Fetch the skill request
    const { data: skillRequest, error: fetchError } = await supabase
      .from("skill_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (fetchError || !skillRequest) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Skill request not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const old_status = skillRequest.status;

    // Update the skill request status
    const updateData: any = {
      status: new_status,
      updated_at: new Date().toISOString(),
    };

    if (new_status === "rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason.trim();
    }

    if (new_status === "completed" && linked_skill_id) {
      updateData.linked_skill_id = linked_skill_id;
    }

    const { error: updateError } = await supabase
      .from("skill_requests")
      .update(updateData)
      .eq("id", request_id);

    if (updateError) {
      console.error("Error updating skill request:", updateError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to update skill request status",
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Create status history record
    const { error: historyError } = await supabase
      .from("skill_request_status_history")
      .insert({
        skill_request_id: request_id,
        from_status: old_status,
        to_status: new_status,
        changed_by: user_id,
        notes: notes || null,
      });

    if (historyError) {
      console.error("Error creating status history:", historyError);
      // Don't fail the request if history creation fails
    }

    // Create notification for requester
    const notificationTitle = `Skill Request ${new_status.charAt(0).toUpperCase() + new_status.slice(1)}`;
    const notificationMessage = `Your skill request "${skillRequest.skill_name}" has been ${new_status}`;

    await createNotification(supabase, {
      user_id: skillRequest.requester_id,
      notification_type: "skill_request_status",
      title: notificationTitle,
      message: notificationMessage,
      related_id: request_id,
    });

    // If completed, auto-enable skill for workspace
    if (new_status === "completed" && linked_skill_id) {
      // Check if workspace_skills table exists and enable the skill
      const { error: enableError } = await supabase
        .from("workspace_skills")
        .insert({
          workspace_id: skillRequest.workspace_id,
          skill_id: linked_skill_id,
          is_enabled: true,
        })
        .onConflict("workspace_id,skill_id")
        .ignoreDuplicates();

      if (enableError) {
        console.error("Error enabling skill for workspace:", enableError);
        // Don't fail the request if skill enablement fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_id,
        old_status,
        new_status,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleUpdateStatus:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to update skill request status",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleAddComment(
  req: Request,
  supabase: any,
  user_id: string
): Promise<Response> {
  try {
    const body = await req.json();
    const { request_id, comment_text, is_internal } = body;

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!request_id || typeof request_id !== "string") {
      fieldErrors.push({
        field: "request_id",
        message: "request_id is required",
      });
    }

    if (!comment_text || typeof comment_text !== "string" || comment_text.trim().length === 0) {
      fieldErrors.push({
        field: "comment_text",
        message: "comment_text is required",
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

    // Fetch the skill request to validate access
    const { data: skillRequest, error: fetchError } = await supabase
      .from("skill_requests")
      .select("id, workspace_id, requester_id, skill_name")
      .eq("id", request_id)
      .single();

    if (fetchError || !skillRequest) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Skill request not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has access to the skill request
    // User must be either:
    // 1. Platform admin
    // 2. The requester
    // 3. A member of the workspace
    const isAdmin = await isPlatformAdmin(supabase, user_id);
    const isRequester = skillRequest.requester_id === user_id;
    const hasAccess = await hasWorkspaceAccess(supabase, user_id, skillRequest.workspace_id);

    if (!isAdmin && !isRequester && !hasAccess) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "You do not have access to this skill request",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Only platform admins can create internal comments
    const isInternalComment = is_internal === true && isAdmin;

    // Create the comment
    const { data: comment, error: createError } = await supabase
      .from("skill_request_comments")
      .insert({
        skill_request_id: request_id,
        user_id: user_id,
        comment_text: comment_text.trim(),
        is_internal: isInternalComment,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating comment:", createError);
      return new Response(
        JSON.stringify({
          error: "database_error",
          message: "Failed to create comment",
          details: createError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Create notifications
    if (isAdmin) {
      // Admin commented → notify requester
      await createNotification(supabase, {
        user_id: skillRequest.requester_id,
        notification_type: "skill_request_comment",
        title: "New Comment on Your Skill Request",
        message: `Admin commented on "${skillRequest.skill_name}"`,
        related_id: request_id,
      });
    } else {
      // User commented → notify all platform admins
      await notifyPlatformAdmins(
        supabase,
        "skill_request_comment",
        "New Comment on Skill Request",
        `Comment on "${skillRequest.skill_name}"`,
        request_id
      );
    }

    return new Response(
      JSON.stringify({
        comment_id: comment.id,
        created_at: comment.created_at,
      }),
      {
        status: 201,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleAddComment:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to add comment",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleGetRequestDetails(
  supabase: any,
  user_id: string,
  request_id: string
): Promise<Response> {
  try {
    // Validate request_id
    if (!request_id || typeof request_id !== "string") {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Invalid request_id",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the skill request
    const { data: skillRequest, error: fetchError } = await supabase
      .from("skill_requests")
      .select(
        `
        id,
        workspace_id,
        requester_id,
        skill_name,
        description,
        use_case,
        business_impact,
        required_entities,
        expected_output,
        priority,
        status,
        rejection_reason,
        linked_skill_id,
        created_at,
        updated_at
      `
      )
      .eq("id", request_id)
      .single();

    if (fetchError || !skillRequest) {
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Skill request not found",
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has access to the skill request
    const isAdmin = await isPlatformAdmin(supabase, user_id);
    const isRequester = skillRequest.requester_id === user_id;
    const hasAccess = await hasWorkspaceAccess(supabase, user_id, skillRequest.workspace_id);

    if (!isAdmin && !isRequester && !hasAccess) {
      return new Response(
        JSON.stringify({
          error: "forbidden",
          message: "You do not have access to this skill request",
        }),
        {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch status history
    const { data: statusHistory, error: historyError } = await supabase
      .from("skill_request_status_history")
      .select(
        `
        id,
        from_status,
        to_status,
        changed_by,
        notes,
        created_at
      `
      )
      .eq("skill_request_id", request_id)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("Error fetching status history:", historyError);
    }

    // Fetch comments (exclude internal comments for non-admins)
    let commentsQuery = supabase
      .from("skill_request_comments")
      .select(
        `
        id,
        user_id,
        comment_text,
        is_internal,
        created_at
      `
      )
      .eq("skill_request_id", request_id);

    // Filter out internal comments for non-admins
    if (!isAdmin) {
      commentsQuery = commentsQuery.eq("is_internal", false);
    }

    commentsQuery = commentsQuery.order("created_at", { ascending: true });

    const { data: comments, error: commentsError } = await commentsQuery;

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
    }

    // Fetch linked skill info if completed
    let linkedSkill = null;
    if (skillRequest.linked_skill_id) {
      const { data: skill, error: skillError } = await supabase
        .from("agent_skills")
        .select("id, name, description")
        .eq("id", skillRequest.linked_skill_id)
        .single();

      if (!skillError && skill) {
        linkedSkill = skill;
      }
    }

    return new Response(
      JSON.stringify({
        request: {
          id: skillRequest.id,
          workspace_id: skillRequest.workspace_id,
          requester_id: skillRequest.requester_id,
          skill_name: skillRequest.skill_name,
          description: skillRequest.description,
          use_case: skillRequest.use_case,
          business_impact: skillRequest.business_impact,
          required_entities: skillRequest.required_entities,
          expected_output: skillRequest.expected_output,
          priority: skillRequest.priority,
          status: skillRequest.status,
          rejection_reason: skillRequest.rejection_reason,
          linked_skill_id: skillRequest.linked_skill_id,
          linked_skill: linkedSkill,
          created_at: skillRequest.created_at,
          updated_at: skillRequest.updated_at,
        },
        status_history: statusHistory || [],
        comments: comments || [],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleGetRequestDetails:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Failed to get skill request details",
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
