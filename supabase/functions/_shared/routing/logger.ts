// =============================================================================
// ROUTING LOGGER — Console + batched DB logging for routing decisions
// =============================================================================

import type { RoutingLogEntry } from "./types.ts";

const LOG_BUFFER: RoutingLogEntry[] = [];
const MAX_BUFFER_SIZE = 50;

/**
 * Log a routing decision. Always console.log for immediate observability.
 * Batches DB inserts to routing_logs table (best-effort).
 */
export function logRoutingDecision(entry: RoutingLogEntry): void {
  LOG_BUFFER.push(entry);

  console.log(
    `[routing] ${entry.caller_function}/${entry.call_site_id}: ` +
    `classified=${entry.classified_tier} final=${entry.final_tier} ` +
    `model=${entry.model} escalated=${entry.escalated} ` +
    `${entry.escalation_reason ? `reason=${entry.escalation_reason} ` : ""}` +
    `shadow=${entry.shadow_mode} latency=${entry.latency_ms}ms ` +
    `classifier=${entry.classifier_latency_ms}ms tokens~${entry.input_tokens_estimate}`
  );

  if (LOG_BUFFER.length >= MAX_BUFFER_SIZE) {
    flushLogs().catch(err => console.error("[routing/logger] Flush error:", err));
  }
}

/** Flush buffered logs to Supabase routing_logs table. Best-effort, non-blocking. */
async function flushLogs(): Promise<void> {
  if (LOG_BUFFER.length === 0) return;

  const entries = LOG_BUFFER.splice(0, LOG_BUFFER.length);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.warn("[routing/logger] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, skipping DB flush");
      return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/routing_logs`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(entries),
    });

    if (!response.ok) {
      console.warn(`[routing/logger] DB flush failed: ${response.status}`);
    }
  } catch (err) {
    console.error("[routing/logger] Failed to flush logs:", err);
  }
}
