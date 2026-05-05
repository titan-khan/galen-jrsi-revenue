/**
 * JWT validation error types
 */
export interface JWTValidationError {
  error: string;
  message: string;
}

/**
 * JWT validation result
 */
export interface JWTValidationResult {
  valid: boolean;
  payload?: { sub: string; exp: number };
  error?: JWTValidationError;
}

/**
 * Validate JWT format (3 parts, base64url encoding)
 */
export function validateJWTFormat(token: string): JWTValidationError | null {
  if (!token || typeof token !== 'string') {
    return {
      error: 'invalid_token',
      message: 'Token must be a non-empty string'
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      error: 'invalid_format',
      message: `Invalid JWT format: expected 3 parts separated by dots, got ${parts.length} parts`
    };
  }

  // Validate each part is base64url encoded (only contains valid characters)
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  
  if (!base64urlPattern.test(parts[0])) {
    return {
      error: 'invalid_header',
      message: 'JWT header is not valid base64url encoding'
    };
  }

  if (!base64urlPattern.test(parts[1])) {
    return {
      error: 'invalid_payload',
      message: 'JWT payload is not valid base64url encoding'
    };
  }

  if (!base64urlPattern.test(parts[2])) {
    return {
      error: 'invalid_signature',
      message: 'JWT signature is not valid base64url encoding'
    };
  }

  return null;
}

/**
 * Validate required JWT claims (sub, exp)
 */
export function validateRequiredClaims(payload: any): JWTValidationError | null {
  if (!payload || typeof payload !== 'object') {
    return {
      error: 'invalid_payload',
      message: 'JWT payload must be an object'
    };
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    return {
      error: 'missing_claim',
      message: 'JWT missing required claim: sub (subject)'
    };
  }

  if (!payload.exp || typeof payload.exp !== 'number') {
    return {
      error: 'missing_claim',
      message: 'JWT missing required claim: exp (expiration)'
    };
  }

  return null;
}

/**
 * Check if JWT is expired
 */
export function isJWTExpired(exp: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return exp < currentTime;
}

/**
 * Validate JWT expiration
 */
export function validateJWTExpiration(exp: number): JWTValidationError | null {
  if (isJWTExpired(exp)) {
    const currentTime = Math.floor(Date.now() / 1000);
    const expiredSeconds = currentTime - exp;
    return {
      error: 'token_expired',
      message: `JWT token expired ${expiredSeconds} seconds ago`
    };
  }
  return null;
}

/**
 * Decode base64url string to JSON
 */
function decodeBase64url(base64url: string): any {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  
  // Add padding
  const padding = base64.length % 4;
  if (padding > 0) {
    base64 += "=".repeat(4 - padding);
  }

  // Decode base64
  const jsonString = atob(base64);
  
  // Parse JSON
  return JSON.parse(jsonString);
}

/**
 * Comprehensive JWT validation and decoding
 * Validates format, required claims, and expiration
 */
export function validateAndDecodeJWT(token: string): JWTValidationResult {
  // Validate format
  const formatError = validateJWTFormat(token);
  if (formatError) {
    return {
      valid: false,
      error: formatError
    };
  }

  // Decode payload
  let payload: any;
  try {
    const parts = token.split(".");
    payload = decodeBase64url(parts[1]);
  } catch (error) {
    return {
      valid: false,
      error: {
        error: 'decode_failed',
        message: `Failed to decode JWT payload: ${error instanceof Error ? error.message : 'unknown error'}`
      }
    };
  }

  // Validate required claims
  const claimsError = validateRequiredClaims(payload);
  if (claimsError) {
    return {
      valid: false,
      error: claimsError
    };
  }

  // Validate expiration
  const expirationError = validateJWTExpiration(payload.exp);
  if (expirationError) {
    return {
      valid: false,
      error: expirationError
    };
  }

  return {
    valid: true,
    payload: {
      sub: payload.sub,
      exp: payload.exp
    }
  };
}

/**
 * Decode JWT payload without verification
 * JWT has already been verified by Supabase Edge Runtime
 * 
 * @deprecated Use validateAndDecodeJWT for comprehensive validation
 */
export function decodeJWT(token: string): { sub: string; exp: number } | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("Invalid JWT format: expected 3 parts");
      return null;
    }

    // Get payload (second part)
    const payload = decodeBase64url(parts[1]);

    return {
      sub: payload.sub,
      exp: payload.exp,
    };
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}
