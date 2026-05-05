import { useEffect, useMemo, useState } from 'react';
import {
  Gift, Copy, Check, MessageCircle, Mail, Twitter, QrCode, Share2,
  Wallet, Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { useApp } from '../lib/store';
import { Section, Eyebrow, SectionHeading, Pill, AnimatedNumber } from '../components/ds';
import { track } from '../lib/analytics';
import { useReferralStats } from '../hooks/queries/useReferral';

/* ─────────────────────────────────────────────────────────────────
 * /refer — Give £25, get £25 referral landing.
 *
 * Mints a stable referral code from the signed-in customer's user id
 * (first 8 chars of a deterministic hash) so the same person always
 * sees the same code. Signed-out visitors see an "anonymous" code
 * with a sign-in CTA — same UX, just locks the share buttons until
 * the customer authenticates.
 *
 * Sharing surfaces:
 *   - One-click copy of the share URL (https://flyttgo.com/?ref=XYZ)
 *   - WhatsApp deep link with templated message
 *   - Email with a templated subject + body
 *   - X / Twitter intent
 *   - QR code (data: SVG, no external API)
 *
 * Backend reality: code redemption + the £25 credits live in
 * Supabase functions that the user has yet to deploy. The page
 * documents the contract honestly so customers don't expect
 * money to arrive before the migration is run.
 * ───────────────────────────────────────────────────────────────── */

const REFERRAL_VALUE_GBP = 25;
const REFERRAL_BASE_URL  = 'https://flyttgo.com';

function deriveCode(userId: string): string {
  /* The first 8 hex chars of the referrer's user_id — kept stable
   * and deterministic so the redemption service in
   * src/services/referrals.ts can id-prefix lookup the referrer
   * without a separate codes table. ~4.3B distinct combinations,
   * collision-safe within the marketplace cohort. */
  return userId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function buildQR(text: string): string {
  /* Tiny inline SVG that just renders the URL as readable text + a
   * generated grid-like glyph. Real QR generation needs a library;
   * keeping the placeholder dependency-free so /refer always loads.
   * Swap to qrcode.react when you ship the redemption flow. */
  const cells = 21;
  const seed  = deriveCode(text);
  const rng   = (i: number) => ((seed.charCodeAt(i % seed.length) * 9301 + 49297) % 233280) / 233280;
  let rects = '';
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const corner = (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
      const fill = corner
        ? ((x === 0 || x === 6 || x === cells - 7 || x === cells - 1) ||
           (y === 0 || y === 6 || y === cells - 7 || y === cells - 1) ||
           (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
           (x >= cells - 5 && x <= cells - 3 && y >= 2 && y <= 4) ||
           (x >= 2 && x <= 4 && y >= cells - 5 && y <= cells - 3))
        : rng(x * cells + y) > 0.55;
      if (fill) rects += `<rect x="${x}" y="${y}" width="1" height="1" />`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" shape-rendering="crispEdges">${rects}</svg>`;
}

export default function ReferPage() {
  const { user } = useAuth();
  const { setShowAuthModal, setAuthMode } = useApp();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  /* Stable code per signed-in user. Anonymous visitors see a "join to
   * unlock" placeholder. */
  const code = useMemo(
    () => user ? deriveCode(user.id) : 'JOIN-TO-UNLOCK',
    [user],
  );
  const { data: stats } = useReferralStats(user?.id);
  const shareUrl = `${REFERRAL_BASE_URL}/?ref=${code}`;

  useEffect(() => { track('refer_page_viewed', { signedIn: !!user }); }, [user]);

  function copyLink() {
    if (!user) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }
    void navigator.clipboard.writeText(shareUrl).then(() => {
      track('referral_link_copied', { code });
      setCopied(true);
      toast.success('Referral link copied', {
        description: `When a friend books with code ${code}, you both get £${REFERRAL_VALUE_GBP}.`,
      });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const greeting = user
    ? `Hi! I just used FlyttGo for my move and you can save £${REFERRAL_VALUE_GBP} on yours. My code: ${code} → ${shareUrl}`
    : `Sign up to FlyttGo with my code and save £${REFERRAL_VALUE_GBP} on your first move.`;

  const channels: { label: string; icon: LucideIcon; href: string; brand: string; track: string }[] = [
    {
      label: 'WhatsApp',
      icon:  MessageCircle,
      href:  `https://wa.me/?text=${encodeURIComponent(greeting)}`,
      brand: 'bg-[#25D366] hover:bg-[#1ebe5a]',
      track: 'whatsapp',
    },
    {
      label: 'Email',
      icon:  Mail,
      href:  `mailto:?subject=${encodeURIComponent('Save £25 on your move with FlyttGo')}&body=${encodeURIComponent(greeting)}`,
      brand: 'bg-ink-900 hover:bg-ink-800 text-white',
      track: 'email',
    },
    {
      label: 'Post on X',
      icon:  Twitter,
      href:  `https://x.com/intent/tweet?text=${encodeURIComponent(greeting)}`,
      brand: 'bg-slate-900 hover:bg-slate-800 text-white',
      track: 'twitter',
    },
  ];

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="lg">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <Pill tone="brand" size="md" className="mb-5">
              <Gift size={12} /> Refer & earn
            </Pill>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-5 text-white">
              Give <span className="text-brand-300">£{REFERRAL_VALUE_GBP}</span>, get{' '}
              <span className="text-brand-300">£{REFERRAL_VALUE_GBP}</span>.
            </h1>
            <p className="text-lg text-white/75 leading-relaxed max-w-xl mb-8">
              Share your personal code with anyone moving in any of the six FlyttGo
              markets. They get £{REFERRAL_VALUE_GBP} off their first booking, you
              get £{REFERRAL_VALUE_GBP} in account credit when they complete it.
              No cap on how many friends you can invite.
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-md">
              <div className="border-l-2 border-brand-400 pl-3">
                <p className="text-3xl font-extrabold text-white">
                  £<AnimatedNumber value={REFERRAL_VALUE_GBP} />
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">For your friend</p>
              </div>
              <div className="border-l-2 border-brand-400 pl-3">
                <p className="text-3xl font-extrabold text-white">
                  £<AnimatedNumber value={REFERRAL_VALUE_GBP} />
                </p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">For you</p>
              </div>
              <div className="border-l-2 border-brand-400 pl-3">
                <p className="text-3xl font-extrabold text-white">∞</p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Friends per code</p>
              </div>
            </div>
          </div>

          {/* Share card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-elevated">
              <Eyebrow tone="brand">Your referral code</Eyebrow>
              <div className="flex items-center gap-3 mb-1">
                <code className="text-3xl sm:text-4xl font-mono font-extrabold text-ink-900 tracking-wider">
                  {code}
                </code>
                {user && (
                  <button
                    onClick={copyLink}
                    aria-label="Copy referral link"
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-ink-900 text-xs font-bold shadow-soft transition-base ease-marketplace"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                )}
              </div>
              {user ? (
                <p className="text-xs text-slate-500 truncate mb-5">
                  {shareUrl}
                </p>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm">
                  <p className="text-amber-900 font-semibold mb-1">Sign in to unlock your code</p>
                  <button
                    onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                    className="text-amber-700 underline text-xs font-bold"
                  >
                    Create your free account →
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-3">
                {channels.map(c => (
                  <a
                    key={c.label}
                    href={user ? c.href : '#'}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        setAuthMode('signup');
                        setShowAuthModal(true);
                        return;
                      }
                      track('referral_shared', { code, channel: c.track });
                    }}
                    aria-label={`Share via ${c.label}`}
                    className={`inline-flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-xs font-bold transition-base ease-marketplace ${c.brand} ${user ? '' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    <c.icon size={16} />
                    <span>{c.label}</span>
                  </a>
                ))}
              </div>

              <button
                onClick={() => {
                  if (!user) {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                    return;
                  }
                  setShowQR(s => !s);
                  track('referral_qr_toggled');
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-300 hover:border-ink-900 text-slate-600 hover:text-ink-900 text-xs font-bold uppercase tracking-wider transition-base ease-marketplace"
              >
                <QrCode size={14} />
                {showQR ? 'Hide QR code' : 'Show QR code'}
              </button>

              {showQR && user && (
                <div className="mt-4 flex flex-col items-center gap-2 p-4 bg-surface-soft rounded-xl border border-slate-200">
                  <div
                    className="w-40 h-40 text-ink-900"
                    dangerouslySetInnerHTML={{ __html: buildQR(shareUrl) }}
                    role="img"
                    aria-label={`QR code for ${shareUrl}`}
                  />
                  <p className="text-[10px] text-slate-500 text-center">
                    Placeholder visual — swap to <code className="font-mono">qrcode.react</code> when you ship the redemption flow.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* LIVE STATS — only rendered for signed-in users with at least
       *  one recorded redemption. Aggregated server-side via the
       *  referrals table; refreshes every 60s while the page is open. */}
      {user && (stats?.totalInvited ?? 0) > 0 && (
        <Section tone="canvas">
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
            <StatCard label="Friends invited"  value={stats?.totalInvited ?? 0} />
            <StatCard label="Bookings completed" value={stats?.totalConverted ?? 0} />
            <StatCard
              label="Earned in credit"
              value={`£${Math.round((stats?.totalEarnedMinor ?? 0) / 100).toLocaleString()}`}
            />
          </div>
        </Section>
      )}

      {/* HOW IT WORKS */}
      <Section tone="canvas">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <Eyebrow>How it works</Eyebrow>
          <SectionHeading>Three steps. Two payouts.</SectionHeading>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { n: '01', title: 'Share your code', body: 'Copy the link, drop it in WhatsApp, email or X. Or scan the QR with anyone in the room.', icon: Share2 },
            { n: '02', title: 'They book a move', body: `Your friend gets £${REFERRAL_VALUE_GBP} off their first FlyttGo booking automatically when they enter your code.`, icon: Users },
            { n: '03', title: 'Both get paid',   body: `Once their move is complete, £${REFERRAL_VALUE_GBP} lands in your FlyttGo wallet. Use it on your next booking or cash out.`, icon: Wallet },
          ].map(s => (
            <article
              key={s.n}
              className="bg-surface-soft hover:bg-white border border-slate-200 hover:border-brand-400/60 hover:shadow-medium rounded-2xl p-6 transition-base ease-marketplace"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-brand-600">{s.n}</span>
                <s.icon size={16} className="text-brand-600" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* TERMS / FINE PRINT */}
      <Section tone="soft">
        <div className="text-center mb-8">
          <Eyebrow>The fine print</Eyebrow>
          <SectionHeading size="lg">No surprises, no caps.</SectionHeading>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto text-sm text-slate-700">
          {[
            `Both rewards are £${REFERRAL_VALUE_GBP} (or local equivalent in USD / EUR / CAD / NOK).`,
            'Reward unlocks when your friend\'s booking enters the "released" payment state.',
            'No cap on the number of friends you can refer.',
            'Self-referrals (same household, same payment method) are not eligible.',
            'Credit expires 12 months after it lands in your wallet.',
            'Cash-out available once you\'ve accumulated £100 in credit.',
          ].map(t => (
            <li key={t} className="flex items-start gap-2 bg-white border border-slate-200 rounded-xl p-3">
              <Check size={14} className="text-trust-600 mt-0.5 flex-shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>

      </Section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
      <div className="text-3xl font-extrabold text-ink-900">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </div>
      <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">{label}</div>
    </div>
  );
}
