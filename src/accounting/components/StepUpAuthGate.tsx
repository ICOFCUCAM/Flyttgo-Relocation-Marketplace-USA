import { useEffect, useState, type ReactNode } from 'react';
import { Lock, Loader2, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { callEdgeFunction } from '../../services/_edge';
import { FlyttGoLogo } from '../../components/brand';
import { INPUT_FOCUS, FOCUS_RING } from '../../components/ds';

/**
 * Two-factor step-up authentication gate.
 *
 * Step A — password
 *   The user re-enters their password. We validate it via
 *   supabase.auth.signInWithPassword (which doesn't disturb the
 *   existing session token); on success we move to step B and ask
 *   the backoffice-otp-issue edge function to email a code.
 *
 * Step B — 6-digit OTP
 *   The user types the code that landed in their inbox. We verify
 *   server-side via the SECURITY DEFINER verify_backoffice_otp RPC
 *   which checks SHA-256 hash equality, attempt count (≤5), and
 *   expiry (6 minutes after issue).
 *
 * On success we stamp sessionStorage with a 30-minute TTL — same
 * as before — so jumping between back-office sub-routes doesn't
 * re-prompt. Independent timers per workspace.
 */

const TTL_MS = 30 * 60 * 1000;
const KEY    = (workspace: string) => `flyttgo:stepup:${workspace}`;

type Phase = 'password' | 'otp';

export default function StepUpAuthGate({
  workspace,
  workspaceLabel,
  children,
}: {
  workspace:      'accounting' | 'audit' | 'admin' | 'backoffice';
  workspaceLabel: string;
  children:       ReactNode;
}) {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [phase, setPhase]         = useState<Phase>('password');
  const [password, setPassword]   = useState('');
  const [code,     setCode]       = useState('');
  const [maskedTo, setMaskedTo]   = useState('');
  const [busy,     setBusy]       = useState(false);
  const [error,    setError]      = useState<string | null>(null);
  const [info,     setInfo]       = useState<string | null>(null);

  /* Honour an already-confirmed session if it's still inside the
   * 30-minute window. */
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

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) { setError('No active session — sign in again.'); return; }
    if (!password)    { setError('Enter your password to continue.');   return; }
    setBusy(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (error) { setError('Incorrect password.'); return; }
      /* Password ok — issue an OTP and move to step B. */
      try {
        const r = await callEdgeFunction<{ ok: boolean; sent_to_masked?: string }>(
          'backoffice-otp-issue', {},
        );
        setMaskedTo(r.sent_to_masked ?? user.email);
        setPhase('otp');
        setInfo('We just emailed you a 6-digit code. It expires in 6 minutes.');
      } catch (issueErr) {
        setError(issueErr instanceof Error ? issueErr.message : 'Could not issue code.');
      }
    } catch {
      setError('Could not verify — try again.');
    } finally { setBusy(false); }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.replace(/\D/g, '');
    if (cleaned.length !== 6) { setError('Enter the 6-digit code from the email.'); return; }
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.rpc('verify_backoffice_otp', { p_code: cleaned });
      if (error)         { setError(error.message);                     return; }
      if (data !== true) { setError('Code incorrect, expired, or too many attempts.'); return; }
      window.sessionStorage.setItem(KEY(workspace), String(Date.now()));
      setConfirmed(true);
      setPassword(''); setCode('');
    } finally { setBusy(false); }
  }

  async function resendCode() {
    setError(null); setInfo(null); setBusy(true);
    try {
      const r = await callEdgeFunction<{ sent_to_masked?: string }>('backoffice-otp-issue', {});
      setMaskedTo(r.sent_to_masked ?? maskedTo);
      setInfo('Sent a new 6-digit code.');
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend.');
    } finally { setBusy(false); }
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
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-[#0b1f3a] to-[#1a4a8a] px-6 pt-6 pb-5 text-white">
          <FlyttGoLogo variant="on-dark" subtitle={`${workspaceLabel} Workspace`} />
        </div>

        {phase === 'password' ? (
          <form onSubmit={submitPassword} className="p-6 space-y-4">
            <Header
              icon={<Lock className="w-5 h-5" />}
              title="Confirm your identity"
              body={`The ${workspaceLabel.toLowerCase()} workspace handles ledger-grade financial data. Re-enter your password — the next step emails you a one-time code.`}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoFocus
              autoComplete="current-password"
            />
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit" disabled={busy || !password}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60 ${FOCUS_RING}`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Continue
            </button>
            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
              Signed in as <strong className="text-slate-600">{user?.email ?? '—'}</strong>.
            </p>
          </form>
        ) : (
          <form onSubmit={submitCode} className="p-6 space-y-4">
            <Header
              icon={<Mail className="w-5 h-5" />}
              title="Enter your verification code"
              body={`We sent a 6-digit code to ${maskedTo || 'your email'}. It expires in 6 minutes.`}
            />
            <Field
              label="6-digit code"
              type="text"
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              monospace
              maxLength={6}
            />
            {info  && <p className="text-emerald-700 text-xs">{info}</p>}
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit" disabled={busy || code.length !== 6}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60 ${FOCUS_RING}`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Unlock {workspaceLabel.toLowerCase()}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => { setPhase('password'); setError(null); setInfo(null); }}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">
                <ArrowLeft className="w-3 h-3" /> Use password again
              </button>
              <button type="button" onClick={resendCode} disabled={busy}
                className="text-[#0B2E59] hover:underline font-bold disabled:opacity-60">
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function Header({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h1 className="font-extrabold text-lg leading-tight">{title}</h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Field({
  label, type, value, onChange, autoFocus, autoComplete, inputMode, monospace, maxLength,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  autoFocus?: boolean; autoComplete?: string; inputMode?: 'numeric' | 'text';
  monospace?: boolean; maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-500 font-mono mb-1">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus} autoComplete={autoComplete} inputMode={inputMode}
        maxLength={maxLength}
        className={`w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm ${monospace ? 'font-mono tracking-widest text-center text-lg' : ''} ${INPUT_FOCUS}`}
      />
    </label>
  );
}
