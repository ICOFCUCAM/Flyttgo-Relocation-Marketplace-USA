/**
 * /auth/callback — the URL Supabase redirects email-confirmation,
 * magic-link, and OAuth (Google / Apple) flows back to.
 *
 * ── How the handoff works ──────────────────────────────────────
 *  1. The user clicks the confirmation link in their inbox.
 *  2. Supabase verifies the token and 302-redirects the browser to
 *     this page with the new access_token / refresh_token appended
 *     to the URL hash (#access_token=…&refresh_token=…).
 *  3. The Supabase browser client picks those tokens out of the
 *     hash automatically because we set `detectSessionInUrl: true`
 *     in `src/lib/supabase.ts`. It then writes the session into
 *     localStorage and fires `onAuthStateChange('SIGNED_IN', …)`.
 *  4. AuthProvider's listener (auth.tsx) catches that event and
 *     pushes the new user into context — which lights up `user`
 *     here via `useAuth()`.
 *  5. We then navigate the SPA to the customer dashboard.
 *
 * ── Why a dedicated callback page? ─────────────────────────────
 * Putting the URL-hash handoff on its own route means:
 *   • Supabase's email template only ever points at one stable
 *     URL we control (https://flyttgo.com/auth/callback).
 *   • The home page doesn't have to mount any auth-callback logic
 *     and stays free of token-flash side effects.
 *   • If the session never arrives (expired link, broken email
 *     template, copy-paste mishap) we can show a clear error UI
 *     with a path forward, instead of dumping the user on a blank
 *     home page that silently doesn't sign them in.
 *
 * Vercel SPA fallback (`vercel.json` → `rewrites: [{ source:
 * '/(.*)', destination: '/' }]`) makes /auth/callback resolve to
 * the SPA bundle on a hard refresh, so the URL-hash handoff still
 * works on a cold load — not just on client-side navigation.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth';
import { useApp }  from '../../lib/store';
import { recordReferralRedemption } from '../../services/referrals';
import { getMyFinanceRoles, routeForFinanceRoles } from '../../accounting/service';

/** Hard ceiling on how long we'll wait for the session before showing
 *  the error fallback. supabase-js usually populates the session in
 *  <100 ms, so 8 s is generous. */
const SESSION_TIMEOUT_MS = 8000;

/**
 * Parse Supabase's `?error=access_denied&error_code=otp_expired&...`
 * params and the hash variant (`#error=...`) that some flows use.
 * Supabase uses both query string and hash fragment depending on
 * whether the error happens server-side or client-side; we check
 * both so the user sees a clear message either way.
 */
function readAuthError(): { code: string; description: string } | null {
  if (typeof window === 'undefined') return null;

  const query = new URLSearchParams(window.location.search);
  const hash  = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const error       = query.get('error')             ?? hash.get('error');
  const errorCode   = query.get('error_code')        ?? hash.get('error_code');
  const description = query.get('error_description') ?? hash.get('error_description');

  if (!error && !errorCode) return null;

  return {
    code:        errorCode ?? error ?? 'unknown',
    description: description?.replace(/\+/g, ' ') ?? 'Something went wrong signing you in.',
  };
}

/** Map Supabase error codes to locale keys. The actual translation
 *  happens inside the component where `t` is available. */
const ERROR_KEY: Record<string, string> = {
  otp_expired:    'callback.otpExpired',
  access_denied:  'callback.accessDenied',
  server_error:   'callback.serverError',
};

export default function AuthCallbackPage() {
  const { user, profile, loading } = useAuth();
  const { setPage }                = useApp();
  const { t }                      = useTranslation();
  const [timedOut, setTimedOut]    = useState(false);

  /* Read Supabase's error params once on mount. Memoised so we don't
   * re-parse on every render. */
  const urlError = useMemo(readAuthError, []);

  /* Once Supabase lights up `user` (and we've finished fetching the
   * profile so we know the role), bounce the user into the right
   * landing surface for their account type. */
  useEffect(() => {
    if (loading || !user) return undefined;

    /* Redeem any pending referral code stashed at first link click.
     * The ?ref= query param is captured into sessionStorage on the
     * landing page (so it survives the OAuth round-trip), then
     * cashed in once the new user's session lands here. Failures
     * are silent — invalid code, self-referral, and duplicate are
     * all expected no-ops handled by the service. */
    const refCode = window.sessionStorage.getItem('flyttgo:ref-code');
    if (refCode) {
      void recordReferralRedemption(refCode, user.id)
        .catch(() => undefined)
        .finally(() => window.sessionStorage.removeItem('flyttgo:ref-code'));
    }

    /* Finance-role routing (Phase 16): accountants land at /accounting,
     * auditors land at /audit. Admins keep their existing /admin home
     * even when they ALSO carry a finance role. The lookup is async,
     * so we run it inline; defaults to the existing role-based
     * routing below if no finance role is found. */
    let cancelled = false;
    void getMyFinanceRoles(user.id).then(roles => {
      if (cancelled) return;
      const target = routeForFinanceRoles(roles);
      if (target === 'accounting') { setPage('accounting'); return; }
      if (target === 'audit')      { setPage('audit');      return; }
      /* target === 'admin' or null → fall through to legacy routing */
      if (profile?.role === 'driver') {
        setPage('driver-portal');
      } else if (profile?.role === 'admin') {
        setPage('admin');
      } else {
        setPage('customer-dashboard');
      }
    }).catch(() => {
      /* Finance-role lookup failed (RLS or network) — fall back to
       * the legacy routing so the user is never stranded. */
      if (cancelled) return;
      if (profile?.role === 'driver') {
        setPage('driver-portal');
      } else if (profile?.role === 'admin') {
        setPage('admin');
      } else {
        setPage('customer-dashboard');
      }
    });
    return () => { cancelled = true; };
  }, [loading, user, profile, setPage]);

  /* Safety net — if no session ever materialises, surface an error
   * instead of leaving the user spinning forever. Skipped when we
   * already know from the URL that this is an error callback. */
  useEffect(() => {
    if (user || urlError) return undefined;
    const id = window.setTimeout(() => setTimedOut(true), SESSION_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [user, urlError]);

  /* Show the error card immediately when Supabase redirected us here
   * with an `error=` param. No reason to make the user wait 8 s
   * staring at a spinner when we already know it failed. */
  const showError = urlError !== null || (timedOut && !user);

  if (showError) {
    const code    = urlError?.code ?? 'timeout';
    const message = t(ERROR_KEY[code] ?? 'callback.genericError');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {t('callback.errorTitle')}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {message}
          </p>
          <button
            type="button"
            onClick={() => setPage('home')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            {t('callback.backHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600">{t('callback.signingIn')}</p>
      </div>
    </div>
  );
}
