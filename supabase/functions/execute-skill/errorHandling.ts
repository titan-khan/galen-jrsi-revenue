// =============================================================================
// ERROR HANDLING — Typed errors, retry logic, SSE error frames
// =============================================================================

export interface SkillExecutionError {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
}

// Error codes
export const ErrorCodes = {
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  API_ERROR: 'API_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  AUTH_ERROR: 'AUTH_ERROR',
  DB_ERROR: 'DB_ERROR',
  STREAM_ERROR: 'STREAM_ERROR',
  BUFFER_OVERFLOW: 'BUFFER_OVERFLOW',
  UNKNOWN: 'UNKNOWN',
} as const;

/** Create a typed error from an HTTP response */
export function errorFromResponse(status: number, body: string): SkillExecutionError {
  switch (status) {
    case 400:
      return { code: ErrorCodes.INVALID_INPUT, message: body, retryable: false, statusCode: 400 };
    case 401:
    case 403:
      return { code: ErrorCodes.AUTH_ERROR, message: 'Authentication failed', retryable: false, statusCode: status };
    case 404:
      return { code: ErrorCodes.SKILL_NOT_FOUND, message: body, retryable: false, statusCode: 404 };
    case 429:
      return { code: ErrorCodes.RATE_LIMIT, message: 'Rate limit exceeded', retryable: true, statusCode: 429 };
    case 502:
    case 503:
      return { code: ErrorCodes.API_ERROR, message: `Upstream error: ${status}`, retryable: true, statusCode: status };
    case 504:
      return { code: ErrorCodes.TIMEOUT, message: 'Gateway timeout', retryable: true, statusCode: 504 };
    default:
      return {
        code: status >= 500 ? ErrorCodes.API_ERROR : ErrorCodes.UNKNOWN,
        message: body || `HTTP ${status}`,
        retryable: status >= 500,
        statusCode: status,
      };
  }
}

/** Create a typed error from an exception */
export function errorFromException(err: unknown): SkillExecutionError {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return { code: ErrorCodes.TIMEOUT, message: 'Request timed out', retryable: true };
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  return { code: ErrorCodes.UNKNOWN, message, retryable: false };
}

/** Format error as SSE frame for client consumption */
export function formatSSEError(error: SkillExecutionError): string {
  return `data: ${JSON.stringify({ error })}\n\n`;
}

/** Format error as JSON response */
export function errorResponse(error: SkillExecutionError, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: error.message, code: error.code, retryable: error.retryable }),
    {
      status: error.statusCode || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Execute an async function with exponential backoff retry.
 * Only retries on retryable errors (429, 502, 503).
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: SkillExecutionError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error && 'code' in err
        ? err as unknown as SkillExecutionError
        : errorFromException(err);

      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
