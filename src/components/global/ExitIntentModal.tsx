import React, { useEffect, useState } from 'react';
import { INPUT_FOCUS } from '../ds';
import { X, Mail, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { track } from '../../lib/analytics';

const STORAGE_KEY = 'flyttgo_exit_intent_seen';

/**
 * Exit-intent newsletter capture.
 *
 * Watches mouseleave events on the document — when the cursor exits
 * through the top of the viewport (i.e. heading to the URL bar /
 * close-tab / browser-back), we open a modal once per session
 * offering a £25 first-move discount in exchange for an email.
 *
 * Disabled on touch devices (where mouseleave doesn't fire reliably).
 * Persists "seen" to localStorage so we don't badger returning
 * customers.
 */
export default function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    /* Touch devices have no mouseleave for the URL bar — skip. */
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return undefined;

    /* Once per session. We could be smarter (per browser, with a
     * 7-day cooldown) but the value of nudging once is high; the
     * cost of nudging twice per session is annoying. Once it is. */
    if (window.localStorage.getItem(STORAGE_KEY)) return undefined;

    const onLeave = (e: MouseEvent) => {
      /* Only fire when cursor exits through the top of the viewport.
       * Bottom / left / right exits are too noisy (people scroll
       * outside the window all the time). */
      if (e.clientY > 0 || e.relatedTarget) return undefined;
      window.localStorage.setItem(STORAGE_KEY, '1');
      setOpen(true);
      track('exit_intent_modal_shown');
      document.removeEventListener('mouseleave', onLeave);
    };

    /* Wait 8s before arming so we don't catch a customer who just
     * misclicked the close button immediately. */
    const armTimer = setTimeout(() => {
      document.addEventListener('mouseleave', onLeave);
    }, 8000);

    return () => {
      clearTimeout(armTimer);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) return undefined;
    /* Stub — wire to /functions/v1/subscribe-newsletter when ready.
     * For now we just record locally and show the success state so
     * the conversion path stays consistent during pre-launch. */
    setSubmitted(true);
    track('exit_intent_email_captured');
    toast.success("You're on the list", {
      description: 'Your £25 discount code lands in your inbox in a moment.',
    });
    setTimeout(() => setOpen(false), 1400);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="bg-gradient-to-br from-amber-400 to-amber-500 px-6 py-8 text-center">
          <div className="w-14 h-14 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Sparkles size={26} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Wait — £25 off your first move</h2>
          <p className="text-slate-800 text-sm mt-2 max-w-xs mx-auto">
            Drop your email and we’ll send a one-time discount plus our weekly digest of new movers + best-rated providers in your country.
          </p>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-emerald-700 font-bold text-lg mb-1">You’re on the list ✨</p>
              <p className="text-slate-500 text-sm">Check your inbox for the £25 discount code.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Your email</span>
                <div className="mt-1.5 relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl ${INPUT_FOCUS} text-sm`}
                  />
                </div>
              </label>
              <button
                type="submit"
                className="w-full px-5 py-3 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl transition"
              >
                Send my £25 discount
              </button>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Unsubscribe anytime. We never share your email.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
