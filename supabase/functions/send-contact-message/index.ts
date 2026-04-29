// ============================================================================
// FlyttGo — send-contact-message Edge Function
// ============================================================================
//
// Forwards the public ContactPage form into ops's inbox via Resend.
//
// DEPLOY:
//   supabase functions deploy send-contact-message --no-verify-jwt
//
// SECRETS REQUIRED:
//   RESEND_API_KEY        — Resend key (re_...)
//   FLYTTGO_FROM          — verified sender, e.g. "FlyttGo <noreply@flyttgo.us>"
//   FLYTTGO_CONTACT_INBOX — recipient, e.g. "support@flyttgo.us"
//
// REQUEST:
//   POST /functions/v1/send-contact-message
//   { name, email, phone?, reason?, subject?, message }
//
// RESPONSE:
//   200 { ok: true }
//   400 { error: "..." }   — missing fields / invalid email
//   500 { error: "..." }   — secrets missing or Resend rejected
// ============================================================================

const RESEND_API_KEY        = Deno.env.get("RESEND_API_KEY") ?? "";
const FLYTTGO_FROM          = Deno.env.get("FLYTTGO_FROM")          ?? "FlyttGo <noreply@flyttgo.us>";
const FLYTTGO_CONTACT_INBOX = Deno.env.get("FLYTTGO_CONTACT_INBOX") ?? "support@flyttgo.us";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { name?: string; email?: string; phone?: string; reason?: string; subject?: string; message?: string } = {};
  try { body = await req.json(); } catch { /* handled below */ }

  const name    = (body.name    ?? "").trim().slice(0, 200);
  const email   = (body.email   ?? "").trim().toLowerCase().slice(0, 200);
  const phone   = (body.phone   ?? "").trim().slice(0, 50);
  const reason  = (body.reason  ?? "").trim().slice(0, 100);
  const subject = (body.subject ?? "").trim().slice(0, 200);
  const message = (body.message ?? "").trim().slice(0, 5000);

  if (!name || !message || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "name, valid email, and message are required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "function not configured: RESEND_API_KEY missing" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const subjectLine = subject || `[${reason || "Contact"}] ${name}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: auto;">
      <h2 style="margin: 0 0 12px;">New contact-form submission</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280;">From</td><td>${escape(name)} &lt;${escape(email)}&gt;</td></tr>
        ${phone   ? `<tr><td style="padding: 6px 0; color: #6b7280;">Phone</td><td>${escape(phone)}</td></tr>` : ""}
        ${reason  ? `<tr><td style="padding: 6px 0; color: #6b7280;">Reason</td><td>${escape(reason)}</td></tr>` : ""}
        ${subject ? `<tr><td style="padding: 6px 0; color: #6b7280;">Subject</td><td>${escape(subject)}</td></tr>` : ""}
      </table>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${escape(message)}</pre>
    </div>
  `.trim();

  const text = [
    `From: ${name} <${email}>`,
    phone   ? `Phone: ${phone}`     : "",
    reason  ? `Reason: ${reason}`   : "",
    subject ? `Subject: ${subject}` : "",
    "",
    message,
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:     FLYTTGO_FROM,
      to:       [FLYTTGO_CONTACT_INBOX],
      reply_to: email,
      subject:  subjectLine,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return new Response(JSON.stringify({ error: "email send failed", detail }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
