import React from 'react';
import { useApp, Page } from '../lib/store';

interface LinkItem { label: string; page: Page; }

const MARKETS: LinkItem[] = [
  { label: 'United States Moves & Logistics', page: 'market-us' },
  { label: 'Canada Moves & Logistics',         page: 'market-canada' },
  { label: 'Germany Moves & Logistics',        page: 'market-germany' },
  { label: 'France Moves & Logistics',         page: 'market-france' },
  { label: 'United Kingdom Moves & Logistics', page: 'market-uk' },
  { label: 'Norway Moves & Logistics',         page: 'market-norway' },
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
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      {/* Operator disclosure band */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-baseline gap-3 mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
              <span>GLRM.FOOTER</span>
              <span className="h-px w-10 bg-slate-700" aria-hidden />
              <span>Global marketplace</span>
            </div>
            <h2 className="font-serif text-3xl text-white leading-tight">
              FlyttGo Global Logistics &amp; Relocation Marketplace
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 max-w-md">
              FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
              digital coordination platform connecting customers with independent
              licensed relocation providers across multiple jurisdictions
              worldwide. Service providers are responsible for compliance with
              their national licensing, taxation, insurance, and regulatory
              requirements.
            </p>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            <div className="border-l border-slate-800 pl-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">North American marketplace</p>
              <h3 className="font-serif text-lg text-white">Wankong LLC</h3>
              <p className="text-xs text-slate-500 mt-1">Delaware, United States</p>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Operates United States and Canadian marketplace surfaces.
              </p>
            </div>
            <div className="border-l border-slate-800 pl-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">European marketplace</p>
              <h3 className="font-serif text-lg text-white">FlyttGo Technologies Group</h3>
              <p className="text-xs text-slate-500 mt-1">Norway · EEA</p>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Operates Norway, United Kingdom, Germany, and France marketplace surfaces.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sitemap */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        <FooterColumn title="Markets" items={MARKETS} onNav={go} />
        <FooterColumn title="Platform" items={PLATFORM} onNav={go} />
        <FooterColumn title="Company" items={COMPANY} onNav={go} />
        <FooterColumn title="Legal" items={LEGAL} onNav={go} />
      </div>

      {/* Bottom band */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <p>© {new Date().getFullYear()} FlyttGo Global Logistics &amp; Relocation Marketplace</p>
          <p className="uppercase tracking-[0.18em]">Coordination layer · Not a carrier · Not a moving company</p>
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
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4">{title}</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={`${it.label}-${it.page}`}>
            <button
              onClick={() => onNav(it.page)}
              className="text-sm text-slate-400 hover:text-white transition text-left"
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
