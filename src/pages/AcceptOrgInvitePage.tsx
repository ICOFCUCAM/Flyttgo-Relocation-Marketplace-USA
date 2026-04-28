import React, { useEffect, useState } from 'react';
import {
  Loader2, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { useAuth } from '../lib/auth';
import { acceptOrgInvite } from '../lib/organizations-store';
import { Section, Pill } from '../components/ds';

/* ─────────────────────────────────────────────────────────────────
 * <AcceptOrgInvitePage> — /invite
 *
 * Landing page for the email-invitation token flow. Reads ?token=…
 * from the URL, prompts sign-in if needed, then calls
 * accept_org_invite RPC. On success links to the corporate
 * dashboard for the org the invitee just joined.
 * ───────────────────────────────────────────────────────────────── */

type State =
  | { phase: 'reading-token' }
  | { phase: 'awaiting-signin' }
  | { phase: 'accepting' }
  | { phase: 'accepted'; orgId: string }
  | { phase: 'error'; reason: string };

export default function AcceptOrgInvitePage() {
  const { setPage, setShowAuthModal, setAuthMode } = useApp();
  const { user } = useAuth();
  const [state, setState] = useState<State>({ phase: 'reading-token' });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('token');
    if (!t) {
      setState({ phase: 'error', reason: 'No invite token in URL.' });
      return;
    }
    setToken(t);
    setState(user ? { phase: 'accepting' } : { phase: 'awaiting-signin' });
  }, [user]);

  useEffect(() => {
    if (state.phase !== 'accepting' || !token) return;
    let cancelled = false;
    acceptOrgInvite(token)
      .then(orgId => { if (!cancelled) setState({ phase: 'accepted', orgId }); })
      .catch(err => {
        if (cancelled) return;
        const reason = err instanceof Error ? err.message : 'Could not accept invite.';
        setState({ phase: 'error', reason });
      });
    return () => { cancelled = true; };
  }, [state.phase, token]);

  return (
    <main className="bg-white text-ink-900 min-h-screen">
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><ShieldCheck size={12} /> Organization invite</Pill>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Join your organization on FlyttGo.
        </h1>
        <p className="text-white/75 max-w-xl">
          Once you accept, you'll be able to file relocation requests, review
          approvals, and (depending on your role) approve or dispatch jobs
          for your team.
        </p>
      </Section>

      <Section tone="canvas" size="default" containerSize="narrow">
        {state.phase === 'reading-token' && (
          <Status icon="loading" title="Reading invite…" />
        )}
        {state.phase === 'awaiting-signin' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <ShieldCheck size={32} className="text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-extrabold text-ink-900 mb-2">Sign in to accept</h2>
            <p className="text-slate-600 mb-5">
              We need to attach the invite to your FlyttGo account. Sign in
              or sign up below — your invite stays active for 14 days.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                className="px-5 py-2.5 bg-ink-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
              >
                Sign in
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition"
              >
                Create account
              </button>
            </div>
          </div>
        )}
        {state.phase === 'accepting' && (
          <Status icon="loading" title="Accepting invite…" />
        )}
        {state.phase === 'accepted' && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-8 text-center">
            <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-3" />
            <h2 className="text-xl font-extrabold text-ink-900 mb-2">You're in.</h2>
            <p className="text-slate-700 mb-5">
              Membership activated. Head to your corporate dashboard to file
              your first relocation request.
            </p>
            <button
              onClick={() => setPage('corporate-dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
            >
              Open corporate dashboard <ArrowRight size={14} />
            </button>
          </div>
        )}
        {state.phase === 'error' && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
            <AlertTriangle size={32} className="text-rose-600 mx-auto mb-3" />
            <h2 className="text-xl font-extrabold text-ink-900 mb-2">Couldn't accept invite</h2>
            <p className="text-slate-700 mb-1">{state.reason}</p>
            <p className="text-xs text-slate-500 mb-5">
              If this persists, ask the inviter to reissue the invite.
            </p>
            <button
              onClick={() => setPage('home')}
              className="px-5 py-2.5 bg-ink-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
            >
              Back to home
            </button>
          </div>
        )}
      </Section>
    </main>
  );
}

function Status({ icon, title }: { icon: 'loading'; title: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <Loader2 size={28} className="text-slate-400 mx-auto mb-3 animate-spin" />
      <p className="text-slate-700 font-bold">{title}</p>
    </div>
  );
}
