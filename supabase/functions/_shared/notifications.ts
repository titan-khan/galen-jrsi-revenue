/**
 * Notification Helper Utility
 * 
 * Provides functions to create notifications for various events in the system.
 */

export type NotificationType =
  | "skill_request_status"
  | "skill_request_comment"
  | "workspace_invitation"
  | "usage_warning";

export interface CreateNotificationParams {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
}

/**
 * Create a notification for a user
 * 
 * @param supabase - Supabase client instance
 * @param params - Notification parameters
 * @returns Success status
 */
export async function createNotification(
  supabase: any,
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: params.user_id,
      notification_type: params.notification_type,
      title: params.title,
      message: params.message,
      related_id: params.related_id || null,
      is_read: false,
    });

    if (error) {
      console.error("Error creating notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception creating notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create notifications for all platform admins
 * 
 * @param supabase - Supabase client instance
 * @param notification_type - Type of notification
 * @param title - Notification title
 * @param message - Notification message
 * @param related_id - Optional related entity ID
 * @returns Success status with count of notifications created
 */
export async function notifyPlatformAdmins(
  supabase: any,
  notification_type: NotificationType,
  title: string,
  message: string,
  related_id?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get all platform admins
    const { data: admins, error: adminError } = await supabase
      .from("user_platform_roles")
      .select("user_id")
      .eq("platform_role", "platform_admin");

    if (adminError) {
      console.error("Error fetching platform admins:", adminError);
      return { success: false, count: 0, error: adminError.message };
    }

    if (!admins || admins.length === 0) {
      console.warn("No platform admins found to notify");
      return { success: true, count: 0 };
    }

    // Create notifications for all admins
    const notifications = admins.map((admin: any) => ({
      user_id: admin.user_id,
      notification_type,
      title,
      message,
      related_id: related_id || null,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Error creating admin notifications:", insertError);
      return { success: false, count: 0, error: insertError.message };
    }

    return { success: true, count: admins.length };
  } catch (error) {
    console.error("Exception notifying platform admins:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
