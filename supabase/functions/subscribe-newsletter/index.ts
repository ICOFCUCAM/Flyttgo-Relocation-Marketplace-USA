// ============================================================================
// FlyttGo — subscribe-newsletter Edge Function
// ============================================================================
//
// Captures email addresses from the ExitIntentModal and any future
// newsletter widgets. Stores them in public.newsletter_subscribers.
//
// REQUEST:
//   POST /functions/v1/subscribe-newsletter
//   { "email": "user@example.com",
//     "source": "exit-intent",   // optional, free-form tag
//     "locale": "en-US" }        // optional
//
// RESPONSE (200):
//   { "ok": true }
//
// Idempotent — re-submitting the same email returns 200 without error.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; source?: string; locale?: string } = {};
  try { body = await req.json(); } catch { /* empty body → handled below */ }

  const email  = (body.email || "").trim().toLowerCase();
  const source = body.source?.slice(0, 64) ?? null;
  const locale = body.locale?.slice(0, 16) ?? null;

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "valid email required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await sb
    .from("newsletter_subscribers")
    .upsert({ email, source, locale }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
