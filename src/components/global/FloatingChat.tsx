import React, { useState } from 'react';
import { MessageCircle, X, Phone } from 'lucide-react';

/**
 * Floating chat / WhatsApp button. Bottom-right; on click expands a
 * small panel with three contact channels (WhatsApp, phone, email) so
 * the customer can pick the one they prefer instead of forcing them
 * into a single channel.
 *
 * The numbers below are placeholders — wire to real support numbers
 * before launch. Per-country routing (UK customer → UK number) can
 * read currentPage from useApp() and pick the right destination.
 */

interface ContactChannel {
  label: string;
  href:  string;
  hint:  string;
  brand: string; // tailwind bg color
}

const CHANNELS: ContactChannel[] = [
  {
    label: 'WhatsApp',
    href:  'https://wa.me/447432112438',
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
    href:  'mailto:support@flyttgo.us',
    hint:  'Reply within 1 hour',
    brand: 'bg-amber-500 hover:bg-amber-600',
  },
];

export default function FloatingChat() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2">
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
            {CHANNELS.map(c => (
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
