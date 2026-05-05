// =============================================================================
// EXECUTE-SKILL EDGE FUNCTION — Rewritten for progressive disclosure & pipelines
// No hardcoded skill routing — uses declarative query_context_spec
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { resolveQueryContext } from "./queryContext.ts";
import { buildSystemPrompt, buildUserPrompt } from "./promptBuilder.ts";
import { createStreamTransformer, collectStreamText } from "./streamHandler.ts";
import { validateSkillOutput, validateJsonOutput } from "./outputValidation.ts";
import {
  errorFromResponse,
  errorFromException,
  errorResponse,
  formatSSEError,
  executeWithRetry,
  ErrorCodes,
} from "./errorHandling.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TIMEOUT_MS = 120_000;

// --- Request Types ---

interface ExecuteSkillRequest {
  skillId: string;
  agentId?: string;
  inputData: Record<string, unknown>;
  queryContext?: {
    timeRange?: string;
    metricIds?: string[];
  };
}

interface ExecuteChainRequest {
  skillIds: string[];
  pipelineId?: string;
  agentId?: string;
  inputData: Record<string, unknown>;
  queryContext?: {
    timeRange?: string;
    metricIds?: string[];
  };
}

// --- Main Handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Route: chain execution or single skill
    if (body.skillIds && Array.isArray(body.skillIds)) {
      return await handleChainExecution(body as ExecuteChainRequest);
    }
    return await handleSingleExecution(body as ExecuteSkillRequest);
  } catch (error) {
    console.error("execute-skill error:", error);
    const err = errorFromException(error);
    return errorResponse(err, corsHeaders);
  }
});

// --- Single Skill Execution ---

async function handleSingleExecution(request: ExecuteSkillRequest): Promise<Response> {
  const { skillId, agentId, inputData, queryContext } = request;

  if (!skillId) {
    return errorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "skillId is required", retryable: false, statusCode: 400 },
      corsHeaders
    );
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch skill definition
  const { data: skill, error: skillError } = await supabase
    .from("agent_skills")
    .select("*")
    .eq("id", skillId)
    .single();

  if (skillError || !skill) {
    return errorResponse(
      { code: ErrorCodes.SKILL_NOT_FOUND, message: `Skill not found: ${skillError?.message || skillId}`, retryable: false, statusCode: 404 },
      corsHeaders
    );
  }

  // Create execution record
  const { data: execution } = await supabase
    .from("skill_executions")
    .insert({
      skill_id: skillId,
      agent_id: agentId,
      input_data: inputData,
      status: "running",
    })
    .select()
    .single();

  // Resolve query context using declarative spec (no hardcoded routing)
  const dbData = await resolveQueryContext(
    supabase,
    skill.query_context_spec,
    queryContext || {}
  );

  // Read execution config from skill (or use defaults)
  const execConfig = skill.execution_config || {};
  const model = execConfig.model || DEFAULT_MODEL;
  const maxTokens = execConfig.maxTokens || DEFAULT_MAX_TOKENS;
  const timeoutMs = execConfig.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxRetries = execConfig.maxRetries ?? 2;
  const retryDelayMs = execConfig.retryDelayMs ?? 1000;

  // Build prompts
  const systemPrompt = buildSystemPrompt(skill);
  const userPrompt = buildUserPrompt(skill, inputData, dbData);

  // Call Claude API with retry and timeout
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return errorResponse(
      { code: ErrorCodes.AUTH_ERROR, message: "ANTHROPIC_API_KEY is not configured", retryable: false, statusCode: 500 },
      corsHeaders
    );
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const aiResponse = await executeWithRetry(
      () => callClaudeAPI(ANTHROPIC_API_KEY, model, maxTokens, systemPrompt, userPrompt, abortController.signal),
      maxRetries,
      retryDelayMs
    );

    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      const err = errorFromResponse(aiResponse.status, errorText);

      // Update execution record with error
      if (execution?.id) {
        await supabase
          .from("skill_executions")
          .update({ status: "failed", error_message: err.message, error_code: err.code, is_retryable: err.retryable })
          .eq("id", execution.id);
      }

      return errorResponse(err, corsHeaders);
    }

    // Stream response with improved handler + output validation
    const streamTransformer = createStreamTransformer(abortController);

    // Create a collecting wrapper that validates output after stream completes
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    let collectedOutput = '';

    const collectAndForward = async () => {
      const source = aiResponse.body!.pipeThrough(streamTransformer);
      const reader = source.getReader();
      const writer = writable.getWriter();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Forward to client
          await writer.write(value);

          // Collect text for validation
          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) collectedOutput += content;
            } catch { /* skip */ }
          }
        }
      } finally {
        writer.close();

        // Post-stream: validate and update execution record
        if (execution?.id && collectedOutput) {
          try {
            const outputSpec = skill.output_spec;
            const validation = outputSpec
              ? validateJsonOutput(collectedOutput, outputSpec)
              : validateSkillOutput(collectedOutput, outputSpec);

            await supabase
              .from('skill_executions')
              .update({
                status: 'completed',
                output_content: collectedOutput.slice(0, 50000),
                completed_at: new Date().toISOString(),
                validation_result: {
                  isValid: validation.isValid,
                  warnings: validation.warnings,
                  sectionsFound: validation.sectionsFound,
                  sectionsMissing: validation.sectionsMissing,
                },
              })
              .eq('id', execution.id);
          } catch (validationError) {
            console.error('Post-stream validation error:', validationError);
            // Non-blocking — still mark as completed
            await supabase
              .from('skill_executions')
              .update({
                status: 'completed',
                output_content: collectedOutput.slice(0, 50000),
                completed_at: new Date().toISOString(),
              })
              .eq('id', execution.id);
          }
        }
      }
    };

    // Start collecting in background (non-blocking)
    collectAndForward();

    const headers = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Execution-Id": execution?.id || "",
      "X-Skill-Name": skill.name,
    };

    return new Response(readable, { headers });
  } catch (error) {
    clearTimeout(timeout);
    const err = errorFromException(error);

    if (execution?.id) {
      await supabase
        .from("skill_executions")
        .update({
          status: "failed",
          error_message: err.message,
          error_code: err.code,
          is_retryable: err.retryable,
        })
        .eq("id", execution.id);
    }

    return errorResponse(err, corsHeaders);
  }
}

// --- Chain Execution ---

async function handleChainExecution(request: ExecuteChainRequest): Promise<Response> {
  const { skillIds, pipelineId, agentId, inputData, queryContext } = request;

  if (!skillIds || skillIds.length === 0) {
    return errorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "skillIds array is required", retryable: false, statusCode: 400 },
      corsHeaders
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return errorResponse(
      { code: ErrorCodes.AUTH_ERROR, message: "ANTHROPIC_API_KEY is not configured", retryable: false, statusCode: 500 },
      corsHeaders
    );
  }

  // Fetch all skills in the chain
  const { data: skills, error: skillsError } = await supabase
    .from("agent_skills")
    .select("*")
    .in("id", skillIds);

  if (skillsError || !skills || skills.length === 0) {
    return errorResponse(
      { code: ErrorCodes.SKILL_NOT_FOUND, message: "One or more skills not found", retryable: false, statusCode: 404 },
      corsHeaders
    );
  }

  // Order skills by the requested skillIds order
  const skillMap = new Map(skills.map((s) => [s.id, s]));
  const orderedSkills = skillIds.map((id) => skillMap.get(id)).filter(Boolean);

  if (orderedSkills.length !== skillIds.length) {
    return errorResponse(
      { code: ErrorCodes.SKILL_NOT_FOUND, message: "Some skills in chain not found", retryable: false, statusCode: 404 },
      corsHeaders
    );
  }

  // Execute skills sequentially, passing output as chain context
  let chainContext = "";
  const abortController = new AbortController();

  for (let i = 0; i < orderedSkills.length; i++) {
    const skill = orderedSkills[i]!;
    const isLastSkill = i === orderedSkills.length - 1;

    // Create execution record for this step
    const { data: execution } = await supabase
      .from("skill_executions")
      .insert({
        skill_id: skill.id,
        agent_id: agentId,
        input_data: inputData,
        status: "running",
        pipeline_id: pipelineId,
        pipeline_step: i,
      })
      .select()
      .single();

    // Resolve query context
    const dbData = await resolveQueryContext(supabase, skill.query_context_spec, queryContext || {});

    const execConfig = skill.execution_config || {};
    const model = execConfig.model || DEFAULT_MODEL;
    const maxTokens = execConfig.maxTokens || DEFAULT_MAX_TOKENS;
    const timeoutMs = execConfig.timeoutMs || DEFAULT_TIMEOUT_MS;

    const systemPrompt = buildSystemPrompt(skill);
    const userPrompt = buildUserPrompt(skill, inputData, dbData, chainContext || undefined);

    const stepTimeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const aiResponse = await callClaudeAPI(
        ANTHROPIC_API_KEY, model, maxTokens, systemPrompt, userPrompt, abortController.signal
      );
      clearTimeout(stepTimeout);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        const err = errorFromResponse(aiResponse.status, errorText);

        if (execution?.id) {
          await supabase
            .from("skill_executions")
            .update({ status: "failed", error_message: err.message, error_code: err.code })
            .eq("id", execution.id);
        }

        return errorResponse(err, corsHeaders);
      }

      if (isLastSkill) {
        // Stream the final skill's output to the client
        const streamTransformer = createStreamTransformer(abortController);
        return new Response(aiResponse.body!.pipeThrough(streamTransformer), {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "X-Execution-Id": execution?.id || "",
            "X-Skill-Name": skill.name,
            "X-Pipeline-Step": String(i),
          },
        });
      } else {
        // Collect intermediate output as chain context for next skill
        chainContext = await collectStreamText(aiResponse, abortController.signal);

        // Validate intermediate output
        const outputSpec = skill.output_spec;
        const validation = outputSpec
          ? validateJsonOutput(chainContext, outputSpec)
          : validateSkillOutput(chainContext, outputSpec);

        if (!validation.isValid) {
          console.warn(
            `Chain step ${i} (${skill.name}) validation warnings:`,
            validation.warnings
          );
        }

        if (execution?.id) {
          await supabase
            .from("skill_executions")
            .update({
              status: "completed",
              output_content: chainContext.slice(0, 50000),
              completed_at: new Date().toISOString(),
              validation_result: {
                isValid: validation.isValid,
                warnings: validation.warnings,
                sectionsFound: validation.sectionsFound,
                sectionsMissing: validation.sectionsMissing,
              },
            })
            .eq("id", execution.id);
        }
      }
    } catch (error) {
      clearTimeout(stepTimeout);
      const err = errorFromException(error);

      if (execution?.id) {
        await supabase
          .from("skill_executions")
          .update({ status: "failed", error_message: err.message, error_code: err.code })
          .eq("id", execution.id);
      }

      return errorResponse(err, corsHeaders);
    }
  }

  // Should never reach here, but just in case
  return new Response(JSON.stringify({ error: "Chain completed with no output" }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- Claude API Call ---

async function callClaudeAPI(
  apiKey: string,
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal
): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    }),
    signal,
  });
}
