import { useEffect, useState, type ReactNode } from 'react';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { FlyttGoLogo } from '../../components/brand';
import { INPUT_FOCUS, FOCUS_RING } from '../../components/ds';

/**
 * Step-up authentication gate for sensitive workspaces.
 *
 * Even when the caller is already signed in (and authorised by RLS),
 * the accounting + audit workspaces require a fresh password
 * confirmation. This is the standard enterprise pattern for
 * regulated finance UIs: an unattended browser tab can't be used
 * to read the ledger or post entries without a recent challenge.
 *
 * Implementation:
 *   • On mount, check sessionStorage for a recent step-up timestamp
 *     (per-workspace key, ttl 30 min).
 *   • If absent or stale: render the password prompt.
 *   • Re-validate by calling supabase.auth.signInWithPassword with
 *     the user's own email — this verifies the password without
 *     creating a second session (the existing session token stays
 *     valid).
 *   • On success: stamp sessionStorage and reveal the children.
 *
 * The TTL is enforced server-side too via the workspace's RLS
 * policies — this gate only adds a UX-level fence.
 */

const TTL_MS = 30 * 60 * 1000;
const KEY    = (workspace: string) => `flyttgo:stepup:${workspace}`;

export default function StepUpAuthGate({
  workspace,
  workspaceLabel,
  children,
}: {
  /** Stable id used for the sessionStorage key. Independent timers
   *  per workspace so unlocking accounting doesn't unlock admin. */
  workspace:      'accounting' | 'audit' | 'admin';
  /** Human label for the prompt headline. */
  workspaceLabel: string;
  children:       ReactNode;
}) {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [password,  setPassword]  = useState('');
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  /* Look for a recent step-up confirmation in sessionStorage. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const raw = window.sessionStorage.getItem(KEY(workspace));
    if (raw) {
      const ts = Number(raw);
      if (Number.isFinite(ts) && Date.now() - ts < TTL_MS) {
        setConfirmed(true);
        return undefined;
      }
    }
    setConfirmed(false);
    return undefined;
  }, [workspace]);

  async function challenge(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) {
      setError('No active session — sign in again.');
      return;
    }
    if (!password) {
      setError('Enter your password to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email:    user.email,
        password,
      });
      if (error) {
        setError('Incorrect password.');
        return;
      }
      window.sessionStorage.setItem(KEY(workspace), String(Date.now()));
      setConfirmed(true);
      setPassword('');
    } catch {
      setError('Could not verify — try again.');
    } finally {
      setBusy(false);
    }
  }

  if (confirmed === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </main>
    );
  }

  if (confirmed) return <>{children}</>;

  return (
    <main className="min-h-screen bg-[#0b1f3a] text-white flex items-center justify-center p-4">
      <form
        onSubmit={challenge}
        className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-gradient-to-br from-[#0b1f3a] to-[#1a4a8a] px-6 pt-6 pb-5 text-white">
          <FlyttGoLogo variant="on-dark" subtitle={`${workspaceLabel} Workspace`} />
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight">Confirm your identity</h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                The {workspaceLabel.toLowerCase()} workspace handles ledger-grade financial data.
                Re-enter your password to unlock this session for the next 30 minutes.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono mb-1">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              className={`w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm ${INPUT_FOCUS}`}
            />
          </label>

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={busy || !password}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60 ${FOCUS_RING}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Unlock {workspaceLabel.toLowerCase()}
          </button>

          <p className="text-[11px] text-slate-400 leading-relaxed text-center">
            Signed in as <strong className="text-slate-600">{user?.email ?? '—'}</strong>.
            Your existing session stays valid; this only confirms physical presence.
          </p>
        </div>
      </form>
    </main>
  );
}
