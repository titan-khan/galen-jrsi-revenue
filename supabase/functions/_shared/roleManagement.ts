/**
 * Role Management Utilities
 * 
 * Provides functions for managing user roles within workspaces.
 * Implements role change validation and prevents self-elevation.
 */

import { type WorkspaceRole } from "./permissions.ts";

// ── Types ───────────────────────────────────────────────────────────────────

export interface RoleChangeRequest {
  workspace_id: string;
  target_user_id: string;
  new_role: WorkspaceRole;
  changed_by_user_id: string;
}

export interface RoleChangeResult {
  success: boolean;
  error?: string;
  message?: string;
  details?: any;
}

export interface RemoveMemberRequest {
  workspace_id: string;
  target_user_id: string;
  removed_by_user_id: string;
}

// ── Validation Functions ────────────────────────────────────────────────────

/**
 * Validate if a role value is valid
 * 
 * @param role - Role string to validate
 * @returns True if valid, false otherwise
 */
export function isValidWorkspaceRole(role: string): role is WorkspaceRole {
  const validRoles: WorkspaceRole[] = ["owner", "admin", "member", "viewer"];
  return validRoles.includes(role as WorkspaceRole);
}

/**
 * Check if a role transition is allowed
 * 
 * Some role transitions may have special rules in the future.
 * For now, all transitions are allowed except self-elevation.
 * 
 * @param from_role - Current role
 * @param to_role - Target role
 * @returns True if transition is allowed, false otherwise
 */
export function isValidRoleTransition(
  from_role: WorkspaceRole,
  to_role: WorkspaceRole
): boolean {
  // All role transitions are currently allowed
  // Future enhancement: Add specific transition rules if needed
  return true;
}

// ── Role Management Functions ───────────────────────────────────────────────

/**
 * Change a user's role in a workspace
 * 
 * This function:
 * - Validates the requester is a workspace owner
 * - Prevents self-elevation
 * - Validates the new role
 * - Updates the role in the database
 * 
 * @param supabase - Supabase client instance
 * @param request - Role change request
 * @returns Result indicating success or failure
 */
export async function changeUserRole(
  supabase: any,
  request: RoleChangeRequest
): Promise<RoleChangeResult> {
  const { workspace_id, target_user_id, new_role, changed_by_user_id } = request;

  try {
    // Step 1: Validate new role
    if (!isValidWorkspaceRole(new_role)) {
      return {
        success: false,
        error: "invalid_role",
        message: `Invalid role: ${new_role}. Must be one of: owner, admin, member, viewer`,
      };
    }

    // Step 2: Prevent self-elevation
    if (target_user_id === changed_by_user_id) {
      return {
        success: false,
        error: "self_elevation_forbidden",
        message: "You cannot change your own role",
      };
    }

    // Step 3: Verify requester is workspace owner
    const { data: requesterData, error: requesterError } = await supabase
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", changed_by_user_id)
      .single();

    if (requesterError || !requesterData) {
      return {
        success: false,
        error: "requester_not_found",
        message: "You are not a member of this workspace",
      };
    }

    if (requesterData.role !== "owner") {
      return {
        success: false,
        error: "insufficient_permissions",
        message: "Only workspace owners can change user roles",
      };
    }

    // Step 4: Verify target user exists in workspace
    const { data: targetData, error: targetError } = await supabase
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", target_user_id)
      .single();

    if (targetError || !targetData) {
      return {
        success: false,
        error: "target_user_not_found",
        message: "Target user is not a member of this workspace",
      };
    }

    // Step 5: Validate role transition
    const currentRole = targetData.role as WorkspaceRole;
    if (!isValidRoleTransition(currentRole, new_role)) {
      return {
        success: false,
        error: "invalid_transition",
        message: `Cannot change role from ${currentRole} to ${new_role}`,
      };
    }

    // Step 6: Update the role
    const { error: updateError } = await supabase
      .from("workspace_users")
      .update({ role: new_role })
      .eq("workspace_id", workspace_id)
      .eq("user_id", target_user_id);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      return {
        success: false,
        error: "database_error",
        message: "Failed to update user role",
        details: updateError.message,
      };
    }

    // Success
    return {
      success: true,
      message: `User role changed from ${currentRole} to ${new_role}`,
    };
  } catch (error) {
    console.error("Error in changeUserRole:", error);
    return {
      success: false,
      error: "server_error",
      message: "Failed to change user role",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove a user from a workspace
 * 
 * This function:
 * - Validates the requester is a workspace owner or admin
 * - Prevents self-removal of the last owner
 * - Removes the user from the workspace
 * 
 * @param supabase - Supabase client instance
 * @param request - Remove member request
 * @returns Result indicating success or failure
 */
export async function removeMemberFromWorkspace(
  supabase: any,
  request: RemoveMemberRequest
): Promise<RoleChangeResult> {
  const { workspace_id, target_user_id, removed_by_user_id } = request;

  try {
    // Step 1: Verify requester has permission (owner or admin)
    const { data: requesterData, error: requesterError } = await supabase
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", removed_by_user_id)
      .single();

    if (requesterError || !requesterData) {
      return {
        success: false,
        error: "requester_not_found",
        message: "You are not a member of this workspace",
      };
    }

    const requesterRole = requesterData.role as WorkspaceRole;
    if (requesterRole !== "owner" && requesterRole !== "admin") {
      return {
        success: false,
        error: "insufficient_permissions",
        message: "Only workspace owners and admins can remove members",
      };
    }

    // Step 2: Verify target user exists in workspace
    const { data: targetData, error: targetError } = await supabase
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", target_user_id)
      .single();

    if (targetError || !targetData) {
      return {
        success: false,
        error: "target_user_not_found",
        message: "Target user is not a member of this workspace",
      };
    }

    const targetRole = targetData.role as WorkspaceRole;

    // Step 3: Prevent removing the last owner
    if (targetRole === "owner") {
      // Count total owners
      const { data: ownerCount, error: countError } = await supabase
        .from("workspace_users")
        .select("user_id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id)
        .eq("role", "owner");

      if (countError) {
        console.error("Error counting owners:", countError);
        return {
          success: false,
          error: "database_error",
          message: "Failed to verify owner count",
        };
      }

      if (ownerCount && ownerCount.count === 1) {
        return {
          success: false,
          error: "last_owner",
          message: "Cannot remove the last owner from a workspace",
        };
      }
    }

    // Step 4: Admins cannot remove owners
    if (requesterRole === "admin" && targetRole === "owner") {
      return {
        success: false,
        error: "insufficient_permissions",
        message: "Admins cannot remove workspace owners",
      };
    }

    // Step 5: Remove the user
    const { error: deleteError } = await supabase
      .from("workspace_users")
      .delete()
      .eq("workspace_id", workspace_id)
      .eq("user_id", target_user_id);

    if (deleteError) {
      console.error("Error removing user from workspace:", deleteError);
      return {
        success: false,
        error: "database_error",
        message: "Failed to remove user from workspace",
        details: deleteError.message,
      };
    }

    // Success
    return {
      success: true,
      message: "User removed from workspace successfully",
    };
  } catch (error) {
    console.error("Error in removeMemberFromWorkspace:", error);
    return {
      success: false,
      error: "server_error",
      message: "Failed to remove user from workspace",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Add a user to a workspace with a specific role
 * 
 * This function:
 * - Validates the requester is a workspace owner or admin
 * - Validates the new role
 * - Adds the user to the workspace
 * 
 * @param supabase - Supabase client instance
 * @param workspace_id - Workspace ID
 * @param new_user_id - User ID to add
 * @param role - Role to assign
 * @param added_by_user_id - User ID of the requester
 * @returns Result indicating success or failure
 */
export async function addMemberToWorkspace(
  supabase: any,
  workspace_id: string,
  new_user_id: string,
  role: WorkspaceRole,
  added_by_user_id: string
): Promise<RoleChangeResult> {
  try {
    // Step 1: Validate role
    if (!isValidWorkspaceRole(role)) {
      return {
        success: false,
        error: "invalid_role",
        message: `Invalid role: ${role}. Must be one of: owner, admin, member, viewer`,
      };
    }

    // Step 2: Verify requester has permission (owner or admin)
    const { data: requesterData, error: requesterError } = await supabase
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", added_by_user_id)
      .single();

    if (requesterError || !requesterData) {
      return {
        success: false,
        error: "requester_not_found",
        message: "You are not a member of this workspace",
      };
    }

    const requesterRole = requesterData.role as WorkspaceRole;
    if (requesterRole !== "owner" && requesterRole !== "admin") {
      return {
        success: false,
        error: "insufficient_permissions",
        message: "Only workspace owners and admins can add members",
      };
    }

    // Step 3: Check if user is already a member
    const { data: existingMember, error: checkError } = await supabase
      .from("workspace_users")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", new_user_id)
      .single();

    if (existingMember) {
      return {
        success: false,
        error: "already_member",
        message: "User is already a member of this workspace",
      };
    }

    // Step 4: Add the user
    const { error: insertError } = await supabase
      .from("workspace_users")
      .insert({
        workspace_id,
        user_id: new_user_id,
        role,
        is_default: false,
        last_accessed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error adding user to workspace:", insertError);
      return {
        success: false,
        error: "database_error",
        message: "Failed to add user to workspace",
        details: insertError.message,
      };
    }

    // Success
    return {
      success: true,
      message: `User added to workspace with ${role} role`,
    };
  } catch (error) {
    console.error("Error in addMemberToWorkspace:", error);
    return {
      success: false,
      error: "server_error",
      message: "Failed to add user to workspace",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
