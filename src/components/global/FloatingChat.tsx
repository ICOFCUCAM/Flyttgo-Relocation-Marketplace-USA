import { useState, useMemo } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useApp } from '../../lib/store';

/**
 * Floating chat / WhatsApp button. Bottom-right; on click expands a
 * panel with three contact channels (WhatsApp, phone, email).
 *
 * The WhatsApp deep-link is templated per current page so the
 * conversation opens with context — the customer doesn't have to
 * re-explain which country / move type they came from.
 */

interface ContactChannel {
  label: string;
  href:  string;
  hint:  string;
  brand: string;
}

const COUNTRY_GREETING: Record<string, string> = {
  'market-us':      "Hi! I'd like to book a move in the United States.",
  'market-canada':  "Hi! I'd like to book a move in Canada.",
  'market-germany': "Hallo! Ich möchte einen Umzug in Deutschland buchen.",
  'market-france':  "Bonjour ! Je souhaite réserver un déménagement en France.",
  'market-uk':      "Hi! I'd like to book a move in the UK.",
  'market-norway':  "Hei! Jeg vil bestille en flytting i Norge.",
  'booking':        "Hi! I'm midway through booking a move and have a question.",
  'enterprise-relocation': "Hi! I'm enquiring about FlyttGo for our company's relocation programme.",
  'universities':   "Hi! I'm enquiring about FlyttGo for our university housing relocation.",
  'providers':      "Hi! I'd like to apply as a provider on FlyttGo.",
  'driver-onboarding': "Hi! I'd like to apply as a driver / provider on FlyttGo.",
};

function whatsappUrl(message: string): string {
  // Wired to a UK number for now — switch to per-country routing once
  // we have local numbers contracted.
  const base = 'https://wa.me/447432112438';
  return `${base}?text=${encodeURIComponent(message)}`;
}

export default function FloatingChat() {
  const { currentPage } = useApp();
  const [open, setOpen] = useState(false);

  const greeting = useMemo(
    () => COUNTRY_GREETING[currentPage] ?? "Hi! I'd like to book a move with FlyttGo.",
    [currentPage],
  );

  const channels: ContactChannel[] = useMemo(() => [
    {
      label: 'WhatsApp',
      href:  whatsappUrl(greeting),
      hint:  'Average reply: 2 min',
      brand: 'bg-[#25D366] hover:bg-[#1ebe5a]',
    },
    {
      label: 'Call us',
      href:  'tel:+447432112438',
      hint:  '24/7 · 6 countries',
      brand: 'bg-slate-900 hover:bg-slate-800',
    },
    {
      label: 'Email',
      href:  `mailto:support@flyttgo.com?subject=${encodeURIComponent('FlyttGo enquiry')}&body=${encodeURIComponent(greeting)}`,
      hint:  'Reply within 1 hour',
      brand: 'bg-amber-500 hover:bg-amber-600',
    },
  ], [greeting]);

  return (
    <div
      // Lift above MobileBottomNav on small screens (lg:hidden, ~64px
      // tall) so the chat bubble doesn't sit ON the nav. Reverts to
      // the standard 16px offset on lg+ where the bottom nav doesn't
      // render.
      className="fixed right-4 bottom-[5.5rem] lg:bottom-4 z-30 flex flex-col items-end gap-2"
    >
      {open && (
        <div
          className="bg-white border border-slate-200 rounded-2xl shadow-xl w-72 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
          role="dialog"
          aria-label="Contact channels"
        >
          <div className="bg-gradient-to-br from-amber-400 to-amber-500 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center">
              <MessageCircle size={18} className="text-slate-900" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">Talk to a human</p>
              <p className="text-[11px] text-slate-800/80">Pick a channel — average reply 2 min</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {channels.map(c => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-white font-semibold text-sm transition ${c.brand}`}
              >
                <span>{c.label}</span>
                <span className="text-[10px] font-normal opacity-90">{c.hint}</span>
              </a>
            ))}
          </div>
          {/* Pre-filled message preview so the customer knows what
              we're sending on their behalf. */}
          <div className="px-4 pb-4 pt-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Pre-filled message
            </p>
            <p className="text-xs text-slate-600 italic line-clamp-2">“{greeting}”</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close contact panel' : 'Open contact panel'}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
          open
            ? 'bg-slate-900 text-white'
            : 'bg-[#25D366] text-white hover:scale-110 hover:shadow-2xl'
        }`}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
