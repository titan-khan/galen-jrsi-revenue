/**
 * Usage Tracking Utility Module
 * 
 * Provides helper functions to track usage metrics across edge functions.
 */

export type MetricType = "storage" | "api_call" | "ai_execution" | "tokens";

export interface TrackUsageParams {
  workspace_id: string;
  metric_type: MetricType;
  value: number;
}

/**
 * Track usage metrics by calling the usage-metrics edge function
 * 
 * @param supabase - Supabase client instance
 * @param params - Usage tracking parameters
 * @returns Success status
 */
export async function trackUsage(
  supabase: any,
  params: TrackUsageParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { workspace_id, metric_type, value } = params;

    // Get today's date (YYYY-MM-DD format)
    const today = new Date().toISOString().split("T")[0];

    // Fetch existing metrics for today
    const { data: existingMetrics, error: fetchError } = await supabase
      .from("usage_metrics")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("metric_date", today)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected for new records
      console.error("Error fetching existing metrics:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // Prepare update data based on metric type
    const updateData: any = {
      workspace_id,
      metric_date: today,
      updated_at: new Date().toISOString(),
    };

    if (existingMetrics) {
      // Update existing record
      switch (metric_type) {
        case "storage":
          updateData.storage_mb = (existingMetrics.storage_mb || 0) + value;
          break;
        case "api_call":
          updateData.api_calls_count = (existingMetrics.api_calls_count || 0) + value;
          break;
        case "ai_execution":
          updateData.ai_executions_count = (existingMetrics.ai_executions_count || 0) + value;
          break;
        case "tokens":
          updateData.tokens_used = (existingMetrics.tokens_used || 0) + value;
          break;
      }

      const { error: updateError } = await supabase
        .from("usage_metrics")
        .update(updateData)
        .eq("id", existingMetrics.id);

      if (updateError) {
        console.error("Error updating metrics:", updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // Insert new record
      updateData.storage_mb = metric_type === "storage" ? value : 0;
      updateData.api_calls_count = metric_type === "api_call" ? value : 0;
      updateData.ai_executions_count = metric_type === "ai_execution" ? value : 0;
      updateData.tokens_used = metric_type === "tokens" ? value : 0;

      const { error: insertError } = await supabase
        .from("usage_metrics")
        .insert(updateData);

      if (insertError) {
        console.error("Error inserting metrics:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking usage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Track API call usage
 * Convenience wrapper for tracking API calls
 */
export async function trackAPICall(
  supabase: any,
  workspace_id: string
): Promise<void> {
  await trackUsage(supabase, {
    workspace_id,
    metric_type: "api_call",
    value: 1,
  });
}

/**
 * Track storage usage
 * Convenience wrapper for tracking storage
 */
export async function trackStorage(
  supabase: any,
  workspace_id: string,
  megabytes: number
): Promise<void> {
  await trackUsage(supabase, {
    workspace_id,
    metric_type: "storage",
    value: megabytes,
  });
}

/**
 * Track AI execution usage
 * Convenience wrapper for tracking AI executions
 */
export async function trackAIExecution(
  supabase: any,
  workspace_id: string
): Promise<void> {
  await trackUsage(supabase, {
    workspace_id,
    metric_type: "ai_execution",
    value: 1,
  });
}

/**
 * Track token usage
 * Convenience wrapper for tracking tokens
 */
export async function trackTokens(
  supabase: any,
  workspace_id: string,
  tokens: number
): Promise<void> {
  await trackUsage(supabase, {
    workspace_id,
    metric_type: "tokens",
    value: tokens,
  });
}
