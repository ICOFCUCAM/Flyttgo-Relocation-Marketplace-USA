import { describe, it, expect } from 'vitest';
import {
  verifyStripeSignature,
  signTestPayload,
  STRIPE_SIGNATURE_TOLERANCE_SECONDS,
  constantTimeEquals,
} from './stripe-signature';

const SECRET = 'whsec_test_keep_me_long_enough_to_look_like_real';
const BODY   = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });

describe('verifyStripeSignature', () => {
  it('accepts a freshly signed body', async () => {
    const ts     = Math.floor(Date.now() / 1000);
    const header = await signTestPayload(BODY, SECRET, ts);
    const r      = await verifyStripeSignature(BODY, header, SECRET, ts);
    expect(r.valid).toBe(true);
  });

  it('rejects when the secret is empty', async () => {
    const ts     = Math.floor(Date.now() / 1000);
    const header = await signTestPayload(BODY, SECRET, ts);
    const r      = await verifyStripeSignature(BODY, header, '', ts);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/secret/i);
  });

  it('rejects when no Stripe-Signature header is present', async () => {
    const r = await verifyStripeSignature(BODY, null, SECRET);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/missing.*header/i);
  });

  it('rejects a malformed header (no t/v1)', async () => {
    const r = await verifyStripeSignature(BODY, 'something=else', SECRET);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/malformed/);
  });

  it('rejects a header signed with a different secret (no v1 match)', async () => {
    const ts     = Math.floor(Date.now() / 1000);
    const header = await signTestPayload(BODY, 'whsec_other_secret_value', ts);
    const r      = await verifyStripeSignature(BODY, header, SECRET, ts);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/no v1.*matched/i);
  });

  it('rejects a tampered body even if the header is real', async () => {
    const ts     = Math.floor(Date.now() / 1000);
    const header = await signTestPayload(BODY, SECRET, ts);
    const tampered = BODY.replace('evt_1', 'evt_attacker');
    const r        = await verifyStripeSignature(tampered, header, SECRET, ts);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/no v1.*matched/i);
  });

  it('rejects a timestamp older than the tolerance window', async () => {
    const stale  = Math.floor(Date.now() / 1000) - (STRIPE_SIGNATURE_TOLERANCE_SECONDS + 60);
    const header = await signTestPayload(BODY, SECRET, stale);
    /* "now" is the real clock — the verifier should see the signed
     * timestamp as outside the window. */
    const r = await verifyStripeSignature(BODY, header, SECRET);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/outside.*window/i);
  });

  it('rejects a future timestamp outside the tolerance window', async () => {
    const future = Math.floor(Date.now() / 1000) + (STRIPE_SIGNATURE_TOLERANCE_SECONDS + 60);
    const header = await signTestPayload(BODY, SECRET, future);
    const r      = await verifyStripeSignature(BODY, header, SECRET);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/outside.*window/i);
  });

  it('rejects a non-numeric timestamp', async () => {
    const header = `t=not-a-number,v1=deadbeef`;
    const r      = await verifyStripeSignature(BODY, header, SECRET);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/outside.*window/i);
  });

  it('accepts a header that includes multiple v1 entries (rotation)', async () => {
    const ts        = Math.floor(Date.now() / 1000);
    const realHeader = await signTestPayload(BODY, SECRET, ts);
    /* Splice in a second bogus v1 ahead of the real one — Stripe's
     * docs say multiple v1s are allowed during secret rotation. */
    const header = realHeader.replace(/v1=/, 'v1=00deadbeef00deadbeef00deadbeef00deadbeef00deadbeef00deadbeef00deadbeef,v1=');
    const r      = await verifyStripeSignature(BODY, header, SECRET, ts);
    expect(r.valid).toBe(true);
  });
});

describe('constantTimeEquals', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEquals('abc123', 'abc123')).toBe(true);
  });
  it('returns false for different lengths', () => {
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
  });
  it('returns false for different content of the same length', () => {
    expect(constantTimeEquals('abcdef', 'abcXef')).toBe(false);
  });
});
