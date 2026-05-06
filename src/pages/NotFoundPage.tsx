import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { useApp, Page } from '../lib/store';
import { Section, Eyebrow, EmptyState } from '../components/ds';

/**
 * 404 page. Mounted by AppLayout as the fallback when pathToPage()
 * returns 'not-found'. Sets `noindex` on the document so Google
 * doesn't index the 404 and count it against the site's quality
 * score.
 *
 * Refactored in Wave 10 to use the EmptyState primitive for the hero
 * + a popular-links grid below it.
 */

interface LinkCard { label: string; desc: string; page: Page; icon: string; }

export default function NotFoundPage() {
  const { setPage } = useApp();
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = existing?.content ?? null;
    if (existing) existing.content = 'noindex, nofollow';
    return () => {
      if (existing && previous !== null) existing.content = previous;
    };
  }, []);

  const popular: LinkCard[] = [
    { label: 'Book a Move',            desc: 'Get an instant quote and a verified driver',          page: 'booking',           icon: '🚚' },
    { label: 'Browse Markets',         desc: 'US · Canada · Germany · France · UK · Norway',         page: 'cities',            icon: '🌍' },
    { label: 'How It Works',           desc: 'Five steps. One stress-free move.',                    page: 'how-it-works',      icon: '🧭' },
    { label: 'Track Your Move',        desc: 'Live map + ETA for your active delivery',              page: 'tracking',          icon: '📍' },
    { label: 'Become a Provider',      desc: 'Earn on your own schedule on five subscription tiers', page: 'driver-onboarding', icon: '👤' },
    { label: 'FlyttGo for Enterprise', desc: 'Bulk coordination, recurring deliveries, API',         page: 'corporate',         icon: '🏢' },
    { label: 'Compliance',             desc: 'How FlyttGo handles licensing in every market',        page: 'compliance',        icon: '🛡️' },
    { label: 'Help Center',            desc: 'FAQ, safety, claims, contact',                         page: 'help',              icon: '❓' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Section tone="ink" size="lg" containerSize="narrow">
        <EmptyState
          icon={Compass}
          tone="inline"
          title={t('notFound.title', 'Off the marketplace map.') as string}
          body={
            <span className="text-white/75">
              {t('notFound.subtitle', "The page you're looking for moved (or never existed). Pick a destination from the favourites below — or jump back home.") as string}
            </span>
          }
          primaryAction={{
            label: t('notFound.backHome', 'Take me home') as string,
            onClick: () => setPage('home'),
          }}
          secondaryAction={{
            label: t('notFound.browseServices', 'Browse services') as string,
            onClick: () => setPage('services'),
          }}
          className="max-w-2xl"
        />
      </Section>

      <Section tone="canvas" containerSize="default">
        <div className="text-center mb-10">
          <Eyebrow>Popular destinations</Eyebrow>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900">
            Maybe one of these is what you wanted?
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popular.map(card => (
            <button
              key={card.page}
              onClick={() => setPage(card.page)}
              className="text-left bg-surface-soft hover:bg-white rounded-2xl p-5 border border-slate-200 hover:border-brand-400/60 hover:shadow-medium transition-base ease-marketplace group"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl group-hover:bg-brand-500 group-hover:text-ink-900 transition-base">
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-ink-900 group-hover:text-brand-600 transition-base">{card.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-snug">{card.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
