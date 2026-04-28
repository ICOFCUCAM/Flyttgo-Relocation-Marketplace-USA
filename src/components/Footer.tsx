import React from 'react';
import { Star, ShieldCheck, BadgeCheck, Truck, CreditCard } from 'lucide-react';
import { useApp, Page } from '../lib/store';

interface LinkItem { label: string; page: Page; }

const MARKETS: LinkItem[] = [
  { label: 'United States',  page: 'market-us' },
  { label: 'Canada',         page: 'market-canada' },
  { label: 'Germany',        page: 'market-germany' },
  { label: 'France',         page: 'market-france' },
  { label: 'United Kingdom', page: 'market-uk' },
  { label: 'Norway',         page: 'market-norway' },
];

const PLATFORM: LinkItem[] = [
  { label: 'Marketplace',           page: 'marketplace' },
  { label: 'Providers',             page: 'providers' },
  { label: 'How It Works',          page: 'how-it-works' },
  { label: 'Enterprise Relocation', page: 'enterprise-relocation' },
  { label: 'Universities',          page: 'universities' },
  { label: 'Partners',              page: 'partners' },
  { label: 'Compliance',            page: 'compliance' },
];

const COMPANY: LinkItem[] = [
  { label: 'About',                 page: 'about' },
  { label: 'Contact',               page: 'contact' },
  { label: 'Careers',               page: 'careers' },
  { label: 'Press',                 page: 'press' },
  { label: 'Sustainability',        page: 'sustainability' },
];

const LEGAL: LinkItem[] = [
  { label: 'Terms of Service',      page: 'terms' },
  { label: 'Privacy Policy',        page: 'privacy' },
  { label: 'Liability',             page: 'liability' },
  { label: 'Provider Terms',        page: 'driver-terms' },
];

export default function Footer() {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  return (
    <footer className="bg-[#0b1f3a] text-slate-300">
      {/* ── Trust strip ────────────────────────────────────────── */}
      <div className="bg-[#08182d] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center flex-shrink-0">
              <Star size={18} className="fill-amber-300 text-amber-300" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">4.8 average</p>
              <p className="text-xs text-white/60">27,000+ moves coordinated</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Insured up to $50,000</p>
              <p className="text-xs text-white/60">Goods-in-transit per booking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center flex-shrink-0">
              <BadgeCheck size={18} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">5,400+ verified providers</p>
              <p className="text-xs text-white/60">Licensed in 6 countries</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center flex-shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Escrow on every booking</p>
              <p className="text-xs text-white/60">Visa · Mastercard · Apple/Google Pay · Invoice</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Operator disclosure ───────────────────────────────── */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900">
                <Truck size={18} />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Flytt<span className="text-amber-300">Go</span>
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-md">
              FlyttGo Global Logistics &amp; Relocation Marketplace connects
              customers with independent licensed relocation providers in six
              countries. Service providers are responsible for compliance with
              their national licensing, taxation, insurance, and regulatory
              requirements.
            </p>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                North American marketplace
              </p>
              <p className="text-white font-bold">Wankong LLC</p>
              <p className="text-xs text-white/60">Delaware, United States</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                European marketplace
              </p>
              <p className="text-white font-bold">FlyttGo Technologies Group</p>
              <p className="text-xs text-white/60">Norway · EEA</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sitemap ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <FooterColumn title="Markets" items={MARKETS} onNav={go} />
        <FooterColumn title="Platform" items={PLATFORM} onNav={go} />
        <FooterColumn title="Company" items={COMPANY} onNav={go} />
        <FooterColumn title="Legal" items={LEGAL} onNav={go} />
      </div>

      {/* ── Bottom band ───────────────────────────────────────── */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-white/50">
          <p>© {new Date().getFullYear()} FlyttGo Global Logistics &amp; Relocation Marketplace</p>
          <p>Coordination layer · Not a moving company · Not a motor carrier</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title, items, onNav,
}: {
  title: string;
  items: LinkItem[];
  onNav: (p: Page) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">{title}</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={`${it.label}-${it.page}`}>
            <button
              onClick={() => onNav(it.page)}
              className="text-sm text-white/75 hover:text-amber-300 transition text-left"
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
