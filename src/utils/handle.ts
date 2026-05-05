/**
 * Generate a specialist handle from a name string.
 * "OTP Sentinel" → "otp-sentinel"
 * "Revenue Monitor" → "revenue-monitor"
 */
export function generateHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
