import { useTranslation } from 'react-i18next';
import { useApp } from '../lib/store';
import { SERVICE_CATEGORIES } from '../lib/service-categories';
import { PROVIDERS } from '../lib/providers-catalogue';
import { track } from '../lib/analytics';
import { FOCUS_RING } from '../components/ds';


export default function ServicesPage() {
  const { setPage } = useApp();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-4 py-2 rounded-full mb-6">
            🚐 {t('services.heroBadge')}
          </div>
          <h1 className="text-5xl font-extrabold mb-4 leading-tight">
            {t('services.heroTitle1')}<br/><span className="text-[#F2B705]">{t('services.heroTitle2')}</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
            {t('services.heroSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[t('services.badge1'), t('services.badge2'), t('services.badge3'), t('services.badge4')].map(b => (
              <span key={b} className="bg-white/10 text-white/80 text-sm px-4 py-2 rounded-full">{b}</span>
            ))}
          </div>
          <button onClick={() => setPage('booking')}
            className="px-10 py-4 bg-[#F2B705] text-[#0B2E59] rounded-xl font-bold text-lg hover:bg-[#F2B705]/90 transition shadow-lg">
            {t('services.cta')}
          </button>
        </div>
      </section>

      {/* ─── SERVICE CATEGORIES ────────────────────────────────
       *   Single source of truth: SERVICE_CATEGORIES. Same catalogue
       *   the home grid + per-category landing pages read from, so
       *   the customer sees a consistent set of categories whether
       *   they land here, on /, or on /services/<slug>.
       *
       *   Each card routes to /services/<slug> (not /booking) so the
       *   customer reads the SEO body + provider list before
       *   committing to a quote — matches the funnel design. */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-extrabold text-[#0B2E59] text-center mb-3">{t('services.sectionTitle')}</h2>
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">{t('services.sectionSubtitle')}</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICE_CATEGORIES.map(cat => {
            /* Provider count per category — same matches[] keys the
             * landing page uses for filtering, so the number on the
             * tile equals what the customer will see when they land. */
            const keys  = cat.matches.map(s => s.toLowerCase());
            const count = PROVIDERS.filter(p =>
              p.services.some(s => keys.some(k => s.toLowerCase().includes(k))),
            ).length;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => {
                  track('services_category_clicked', { slug: cat.slug });
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', `/services/${cat.slug}`);
                  }
                  setPage('service-category');
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className={`text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-amber-300 transition group flex flex-col ${FOCUS_RING}`}
              >
                {cat.homeTile && (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={cat.homeTile.photo}
                      alt=""
                      width={600}
                      height={352}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {count > 0 && (
                      <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-slate-900 tracking-wide shadow-sm">
                        {count} provider{count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{cat.name}</h3>
                  <p className="text-xs font-semibold mb-3 text-amber-600">{cat.tagline}</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">{cat.intro}</p>
                  <div className="mt-auto inline-flex items-center justify-between text-sm font-semibold">
                    <span className="text-[#0B2E59]">View providers →</span>
                    <span className="text-xs text-gray-400">{cat.howItWorks.length} steps · {cat.faq.length} FAQs</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10">{t('services.howTitle')}</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: t('services.how1Title'), desc: t('services.how1Desc') },
              { step: '2', title: t('services.how2Title'), desc: t('services.how2Desc') },
              { step: '3', title: t('services.how3Title'), desc: t('services.how3Desc') },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-[#0B2E59] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{item.step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#0B2E59] to-[#1a4a8a] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">{t('services.ctaTitle')}</h2>
          <p className="text-white/70 mb-8">{t('services.ctaSubtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setPage('booking')} className="px-10 py-4 bg-[#F2B705] text-[#0B2E59] rounded-xl font-bold text-base hover:bg-[#F2B705]/90 transition shadow-lg">{t('services.ctaBookNow')}</button>
            <button onClick={() => setPage('van-guide')} className="px-10 py-4 bg-white/10 text-white rounded-xl font-semibold text-base hover:bg-white/20 transition">{t('services.ctaWhichVan')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
