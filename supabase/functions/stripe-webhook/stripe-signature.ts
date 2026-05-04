/* ─────────────────────────────────────────────────────────────────
 * Stripe webhook signature verification — pure helper.
 *
 * Lives in its own file (no Deno-specific imports) so the same
 * function can be tested under Vitest. The edge-function entrypoint
 * imports from here.
 *
 * Stripe sends:
 *   Stripe-Signature: t=<unix_ts>,v1=<hex_sig>,v1=<another>,...
 *
 * We compute HMAC-SHA256 of `${timestamp}.${rawBody}` using the
 * webhook secret, compare to every v1 signature in the header. The
 * timestamp is also checked against the current clock (5 min
 * tolerance) to block replay attacks.
 *
 * Uses the Web Crypto API (`crypto.subtle`) which is available in
 * the Deno Edge runtime AND in Node 18+ / jsdom — same API surface,
 * so the function is portable.
 * ───────────────────────────────────────────────────────────────── */

export interface VerifyResult {
  valid:   boolean;
  reason?: string;
}

/** Tolerance window for the timestamp claim, in seconds. Mirrors
 *  Stripe's official libraries. Exported so tests can reuse. */
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

export async function verifyStripeSignature(
  rawBody:         string,
  signatureHeader: string | null,
  secret:          string,
  /** Override the "now" clock for tests. Seconds since epoch. */
  nowSeconds:      number = Math.floor(Date.now() / 1000),
): Promise<VerifyResult> {
  if (!secret) return { valid: false, reason: 'STRIPE_WEBHOOK_SECRET not set' };
  if (!signatureHeader) return { valid: false, reason: 'missing Stripe-Signature header' };

  /* Parse the header into a timestamp and a list of v1 signatures.
   * Stripe may include multiple v1 entries during secret rotation. */
  let timestamp: string | null = null;
  const v1Signatures: string[] = [];
  for (const part of signatureHeader.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't')  timestamp = value ?? null;
    if (key === 'v1') v1Signatures.push(value ?? '');
  }
  if (!timestamp || v1Signatures.length === 0) {
    return { valid: false, reason: 'signature header malformed' };
  }

  const sigSec = Number(timestamp);
  if (!Number.isFinite(sigSec) || Math.abs(nowSeconds - sigSec) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'signature timestamp outside 5-minute window' };
  }

  /* Compute expected HMAC-SHA256 over `${timestamp}.${body}`. */
  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes    = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedHex = bytesToHex(new Uint8Array(sigBytes));

  /* Constant-time comparison against every v1 in the header. */
  for (const candidate of v1Signatures) {
    if (candidate.length === expectedHex.length && constantTimeEquals(candidate, expectedHex)) {
      return { valid: true };
    }
  }
  return { valid: false, reason: 'no v1 signature matched' };
}

export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/** Test helper — produces a header Stripe would have sent given the
 *  same secret + body. Exported so the Vitest suite can construct
 *  positive cases without duplicating the HMAC math. */
export async function signTestPayload(
  rawBody:    string,
  secret:     string,
  timestamp:  number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  return `t=${timestamp},v1=${bytesToHex(new Uint8Array(sigBytes))}`;
}
