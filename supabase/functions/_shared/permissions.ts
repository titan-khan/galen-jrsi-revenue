/**
 * Permission Validation Utility Module
 * 
 * Provides centralized permission checking for the multi-workspace system.
 * Implements two-tier RBAC: platform-level and workspace-level permissions.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Types ───────────────────────────────────────────────────────────────────

export type PlatformRole = "platform_admin" | "platform_user";
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type Permission =
  | "can_manage_workspace"
  | "can_invite_members"
  | "can_manage_data"
  | "can_manage_skills"
  | "can_request_skills"
  | "can_view_usage"
  | "can_approve_skill_requests"
  | "can_create_skills"
  | "can_access_all_workspaces";

export interface PermissionContext {
  user_id: string;
  workspace_id?: string;
  action: Permission;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  platform_role?: PlatformRole;
  workspace_role?: WorkspaceRole;
}

// ── Permission Constants ────────────────────────────────────────────────────

/**
 * Permission matrix mapping workspace roles to their allowed permissions
 */
export const WORKSPACE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: [
    "can_manage_workspace",
    "can_invite_members",
    "can_manage_data",
    "can_manage_skills",
    "can_request_skills",
    "can_view_usage",
  ],
  admin: [
    "can_manage_workspace",
    "can_invite_members",
    "can_manage_data",
    "can_manage_skills",
    "can_request_skills",
    "can_view_usage",
  ],
  member: [
    "can_manage_data",
    "can_request_skills",
    "can_view_usage",
  ],
  viewer: [
    "can_view_usage",
  ],
};

/**
 * Platform admin exclusive permissions
 */
export const PLATFORM_ADMIN_PERMISSIONS: Permission[] = [
  "can_approve_skill_requests",
  "can_create_skills",
  "can_access_all_workspaces",
];

// ── Core Permission Functions ───────────────────────────────────────────────

/**
 * Get the platform role for a user
 * 
 * @param supabase - Supabase client instance
 * @param user_id - User ID to check
 * @returns Platform role or null if not found (defaults to platform_user)
 */
export async function getPlatformRole(
  supabase: any,
  user_id: string
): Promise<PlatformRole> {
  try {
    const { data, error } = await supabase
      .from("user_platform_roles")
      .select("platform_role")
      .eq("user_id", user_id)
      .single();

    if (error || !data) {
      // Default to platform_user if no role is explicitly set
      return "platform_user";
    }

    return data.platform_role as PlatformRole;
  } catch (error) {
    console.error("Error fetching platform role:", error);
    return "platform_user";
  }
}

/**
 * Get the workspace role for a user in a specific workspace
 * 
 * @param supabase - Supabase client instance
 * @param user_id - User ID to check
 * @param workspace_id - Workspace ID to check
 * @returns Workspace role or null if user is not a member
 */
export async function getWorkspaceRole(
  supabase: any,
  user_id: string,
  workspace_id: string
): Promise<WorkspaceRole | null> {
  try {
    const { data, error } = await supabase
      .from("workspace_users")
      .select("role")
      .eq("user_id", user_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as WorkspaceRole;
  } catch (error) {
    console.error("Error fetching workspace role:", error);
    return null;
  }
}

/**
 * Validate if a user has permission to perform an action
 * 
 * This function implements the two-tier permission system:
 * 1. Platform-level: platform_admin has universal access
 * 2. Workspace-level: Checks workspace role permissions
 * 
 * @param supabase - Supabase client instance
 * @param ctx - Permission context with user_id, workspace_id, and action
 * @returns Permission result with allowed status and reason
 */
export async function validatePermission(
  supabase: any,
  ctx: PermissionContext
): Promise<PermissionResult> {
  try {
    // Step 1: Check platform role
    const platformRole = await getPlatformRole(supabase, ctx.user_id);

    // Platform admins have universal access
    if (platformRole === "platform_admin") {
      // Check if this is a platform admin exclusive permission
      if (PLATFORM_ADMIN_PERMISSIONS.includes(ctx.action)) {
        return {
          allowed: true,
          platform_role: platformRole,
          reason: "Platform admin has universal access",
        };
      }

      // Platform admins bypass workspace-level checks for workspace actions
      return {
        allowed: true,
        platform_role: platformRole,
        reason: "Platform admin bypasses workspace-level checks",
      };
    }

    // Step 2: Check if action requires platform admin
    if (PLATFORM_ADMIN_PERMISSIONS.includes(ctx.action)) {
      return {
        allowed: false,
        platform_role: platformRole,
        reason: "Action requires platform_admin role",
      };
    }

    // Step 3: Check workspace-level permissions
    if (!ctx.workspace_id) {
      return {
        allowed: false,
        platform_role: platformRole,
        reason: "Workspace ID required for this action",
      };
    }

    const workspaceRole = await getWorkspaceRole(
      supabase,
      ctx.user_id,
      ctx.workspace_id
    );

    if (!workspaceRole) {
      return {
        allowed: false,
        platform_role: platformRole,
        reason: "User is not a member of this workspace",
      };
    }

    // Step 4: Check if workspace role has the required permission
    const rolePermissions = WORKSPACE_PERMISSIONS[workspaceRole];
    const hasPermission = rolePermissions.includes(ctx.action);

    return {
      allowed: hasPermission,
      platform_role: platformRole,
      workspace_role: workspaceRole,
      reason: hasPermission
        ? `User has ${workspaceRole} role with required permission`
        : `User's ${workspaceRole} role lacks required permission`,
    };
  } catch (error) {
    console.error("Error validating permission:", error);
    return {
      allowed: false,
      reason: "Error validating permission",
    };
  }
}

/**
 * Check if a user has access to a workspace
 * 
 * @param supabase - Supabase client instance
 * @param user_id - User ID to check
 * @param workspace_id - Workspace ID to check
 * @returns True if user has access, false otherwise
 */
export async function hasWorkspaceAccess(
  supabase: any,
  user_id: string,
  workspace_id: string
): Promise<boolean> {
  // Check if user is platform admin
  const platformRole = await getPlatformRole(supabase, user_id);
  if (platformRole === "platform_admin") {
    return true;
  }

  // Check if user has workspace access
  const workspaceRole = await getWorkspaceRole(supabase, user_id, workspace_id);
  return workspaceRole !== null;
}

/**
 * Check if a user is a platform admin
 * 
 * @param supabase - Supabase client instance
 * @param user_id - User ID to check
 * @returns True if user is platform admin, false otherwise
 */
export async function isPlatformAdmin(
  supabase: any,
  user_id: string
): Promise<boolean> {
  const platformRole = await getPlatformRole(supabase, user_id);
  return platformRole === "platform_admin";
}

/**
 * Check if a user is a workspace owner
 * 
 * @param supabase - Supabase client instance
 * @param user_id - User ID to check
 * @param workspace_id - Workspace ID to check
 * @returns True if user is workspace owner, false otherwise
 */
export async function isWorkspaceOwner(
  supabase: any,
  user_id: string,
  workspace_id: string
): Promise<boolean> {
  const workspaceRole = await getWorkspaceRole(supabase, user_id, workspace_id);
  return workspaceRole === "owner";
}
