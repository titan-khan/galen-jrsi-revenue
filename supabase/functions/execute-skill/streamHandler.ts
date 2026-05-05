// =============================================================================
// STREAM HANDLER — Improved SSE streaming with safety limits
// =============================================================================

import { formatSSEError, ErrorCodes, type SkillExecutionError } from './errorHandling.ts';

const MAX_BUFFER_SIZE = 64 * 1024; // 64KB max buffer
const CHUNK_TIMEOUT_MS = 30_000;   // 30s no-chunk timeout

/**
 * Transform Claude's SSE stream into OpenAI-compatible SSE format
 * with buffer overflow prevention and timeout detection.
 */
export function createStreamTransformer(
  abortController: AbortController
): TransformStream<Uint8Array, Uint8Array> {
  let buffer = '';
  let lastChunkTime = Date.now();
  let timeoutChecker: number | undefined;

  return new TransformStream({
    start(controller) {
      // Periodic timeout check
      timeoutChecker = setInterval(() => {
        if (Date.now() - lastChunkTime > CHUNK_TIMEOUT_MS) {
          const error: SkillExecutionError = {
            code: ErrorCodes.TIMEOUT,
            message: `No data received for ${CHUNK_TIMEOUT_MS / 1000}s`,
            retryable: true,
          };
          controller.enqueue(new TextEncoder().encode(formatSSEError(error)));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.terminate();
          abortController.abort();
          clearInterval(timeoutChecker);
        }
      }, 5000) as unknown as number;
    },

    transform(chunk, controller) {
      lastChunkTime = Date.now();
      const text = new TextDecoder().decode(chunk);
      buffer += text;

      // Buffer overflow protection
      if (buffer.length > MAX_BUFFER_SIZE) {
        const error: SkillExecutionError = {
          code: ErrorCodes.BUFFER_OVERFLOW,
          message: 'Stream buffer exceeded maximum size',
          retryable: false,
        };
        controller.enqueue(new TextEncoder().encode(formatSSEError(error)));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.terminate();
        abortController.abort();
        return;
      }

      // Process complete lines
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') {
          if (jsonStr === '[DONE]') {
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          }
          continue;
        }

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'content_block_delta' && event.delta?.text) {
            const openAIChunk = {
              choices: [{ delta: { content: event.delta.text } }],
            };
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(openAIChunk)}\n\n`)
            );
          } else if (event.type === 'message_stop') {
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          } else if (event.type === 'error') {
            const error: SkillExecutionError = {
              code: ErrorCodes.API_ERROR,
              message: event.error?.message || 'Claude API stream error',
              retryable: true,
            };
            controller.enqueue(new TextEncoder().encode(formatSSEError(error)));
          }
        } catch {
          // Skip unparseable lines — don't put them back (fixes infinite loop bug)
        }
      }
    },

    flush(controller) {
      if (timeoutChecker !== undefined) {
        clearInterval(timeoutChecker);
      }
      // Process any remaining buffer content
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'content_block_delta' && event.delta?.text) {
                const openAIChunk = {
                  choices: [{ delta: { content: event.delta.text } }],
                };
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify(openAIChunk)}\n\n`)
                );
              }
            } catch {
              // Ignore incomplete final chunk
            }
          }
        }
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    },
  });
}

/**
 * Collect the full text from a Claude SSE stream (for intermediate chain results).
 * Returns the accumulated text content.
 */
export async function collectStreamText(
  response: Response,
  abortSignal: AbortSignal
): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      if (abortSignal.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      if (buffer.length > MAX_BUFFER_SIZE) {
        throw new Error('Buffer overflow during stream collection');
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
          }
        } catch {
          // Skip unparseable
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}
