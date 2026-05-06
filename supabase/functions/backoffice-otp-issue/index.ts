// ============================================================================
// FlyttGo — backoffice-otp-issue Edge Function
// ============================================================================
//
// Step 2 of the two-factor back-office step-up flow.  After the user has
// re-validated their password client-side, the frontend POSTs here to
// generate a 6-digit numeric code, store its hash with a 6-minute TTL,
// and email it to the signed-in user via Resend.
//
// SECURITY
// --------
//   • Caller is identified from the Authorization bearer token; we only
//     ever email the address of the auth.users row that matches the JWT.
//   • Code is generated and hashed server-side via the
//     fn_issue_backoffice_otp(user_id, email) RPC (SECURITY DEFINER).
//     The cleartext code is held in memory only long enough to email it.
//   • Any older unused challenges for the same user are invalidated by
//     the RPC, so only the most recent code is ever valid.
//
// DEPLOY
// ------
//   supabase functions deploy backoffice-otp-issue --no-verify-jwt
//
// REQUIRED SECRETS
// ----------------
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set FLYTTGO_FROM='FlyttGo Security <security@flyttgo.com>'
// ============================================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY') ?? '';
const FLYTTGO_FROM              = Deno.env.get('FLYTTGO_FROM') ?? 'FlyttGo Security <security@flyttgo.com>';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function resolveCallerEmail(req: Request): Promise<{ user_id: string; email: string } | null> {
  if (!supabase) return null;
  const auth = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id || !data.user.email) return null;
  return { user_id: data.user.id, email: data.user.email };
}

function emailHtml(code: string, ttlMinutes: number): string {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#f1f5f9;padding:24px;">
  <div style="max-width:480px;margin:auto;background:white;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#0b1f3a,#1a4a8a);color:white;padding:24px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#fcd34d;">FlyttGo · Back office</p>
      <h1 style="margin:6px 0 0;font-size:22px;">Step-up verification code</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 10px;color:#475569;font-size:14px;">
        Use this code to unlock the back-office workspace for the next 30 minutes:
      </p>
      <p style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:36px;letter-spacing:8px;font-weight:800;color:#0b1f3a;margin:16px 0;text-align:center;background:#f1f5f9;padding:18px;border-radius:10px;">
        ${code}
      </p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Expires in ${ttlMinutes} minutes. If you didn't request this, ignore the email — your account is unchanged.
      </p>
    </div>
    <div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center;">
      FlyttGo Global Logistics &amp; Relocation Marketplace
    </div>
  </div>
</body></html>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  if (!RESEND_API_KEY || !supabase) {
    return json({ error: 'OTP system not configured. Set RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY.' }, 500);
  }

  const caller = await resolveCallerEmail(req);
  if (!caller) return json({ error: 'Sign in required' }, 401);

  /* RPC mints + hashes + stores; returns the cleartext code only
   * to the service role caller (us) so we can email it. */
  const { data: code, error } = await supabase.rpc('fn_issue_backoffice_otp', {
    p_user_id: caller.user_id,
    p_email:   caller.email,
  });
  if (error || !code) {
    return json({ error: 'Could not mint code', detail: error?.message }, 500);
  }

  const resend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    FLYTTGO_FROM,
      to:      [caller.email],
      subject: `FlyttGo back-office code: ${code}`,
      html:    emailHtml(code as string, 6),
      text:    `Your FlyttGo back-office verification code is ${code}. It expires in 6 minutes.`,
      tags:    [{ name: 'kind', value: 'backoffice_otp' }],
    }),
  });

  if (!resend.ok) {
    const detail = await resend.text();
    return json({ error: 'Email delivery failed', detail }, 502);
  }

  return json({ ok: true, ttl_minutes: 6, sent_to_masked: caller.email.replace(/(.{2}).*(@.*)/, '$1***$2') });
});
