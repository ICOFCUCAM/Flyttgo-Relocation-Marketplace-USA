import React, { Suspense, lazy, useEffect } from 'react';
import { useApp } from '../lib/store';
import Header from './Header';
import AuthModal from './AuthModal';

const HomePage           = lazy(() => import('./HomePage'));
const BookingFlow        = lazy(() => import('./BookingFlow'));
const DriverPortal       = lazy(() => import('./DriverPortal'));
const DriverOnboarding   = lazy(() => import('./DriverOnboarding'));
const MovingChecklist    = lazy(() => import('./MovingChecklist'));
const SubscriptionPlans  = lazy(() => import('./SubscriptionPlans'));
const VanGuide           = lazy(() => import('./VanGuide'));
const CustomerDashboard  = lazy(() => import('./CustomerDashboard'));
const MyBookings         = lazy(() => import('./MyBookings'));
const AdminDashboard     = lazy(() => import('./AdminDashboard'));
const TermsPage          = lazy(() => import('../pages/TermsPage'));
const PrivacyPage        = lazy(() => import('../pages/PrivacyPage'));
const LiabilityPage      = lazy(() => import('../pages/LiabilityPage'));
const DriverTermsPage    = lazy(() => import('../pages/DriverTermsPage'));
const ServicesPage       = lazy(() => import('../pages/ServicesPage'));
const CorporatePage             = lazy(() => import('../pages/CorporatePage'));
const CorporateDashboard        = lazy(() => import('../pages/CorporateDashboard'));
const CorporateBulkBookingPage  = lazy(() => import('../pages/CorporateBulkBookingPage'));
const RecurringDeliveriesPage   = lazy(() => import('../pages/RecurringDeliveriesPage'));
const CompanyDashboardInfoPage  = lazy(() => import('../pages/CompanyDashboardInfoPage'));
const InvoiceBillingPage        = lazy(() => import('../pages/InvoiceBillingPage'));
const CorporateApiAccessPage    = lazy(() => import('../pages/CorporateApiAccessPage'));
const ProfilePage        = lazy(() => import('../pages/ProfilePage'));
const AboutUsPage        = lazy(() => import('../pages/AboutUsPage'));
const ContactPage        = lazy(() => import('../pages/ContactPage'));
const FaqPage            = lazy(() => import('../pages/FaqPage'));
const HelpCenterPage     = lazy(() => import('../pages/HelpCenterPage'));
const SafetyPage         = lazy(() => import('../pages/SafetyPage'));
const CareersPage        = lazy(() => import('../pages/CareersPage'));
const PressPage          = lazy(() => import('../pages/PressPage'));
const SustainabilityPage = lazy(() => import('../pages/SustainabilityPage'));
const TrackingPage       = lazy(() => import('../pages/TrackingPage'));
const PaymentPage        = lazy(() => import('../pages/PaymentPage'));
const AuthCallbackPage   = lazy(() => import('../pages/auth/callback'));
const DriverApplicationStatusPage = lazy(() => import('../pages/DriverApplicationStatusPage'));
const NotFoundPage       = lazy(() => import('../pages/NotFoundPage'));
/* Marketplace repositioning surfaces (Phase 12). */
const MarketplacePage    = lazy(() => import('../pages/MarketplacePage'));
const HowItWorksPage     = lazy(() => import('../pages/HowItWorksPage'));
const ProvidersPage      = lazy(() => import('../pages/ProvidersPage'));
const CitiesPage         = lazy(() => import('../pages/CitiesPage'));
const EnterpriseRelocationPage = lazy(() => import('../pages/EnterpriseRelocationPage'));
const CompliancePage     = lazy(() => import('../pages/CompliancePage'));
const PartnersPage       = lazy(() => import('../pages/PartnersPage'));
/* Global Logistics & Relocation Marketplace surfaces. */
const UniversitiesPage   = lazy(() => import('../pages/UniversitiesPage'));
const MarketUSPage       = lazy(() => import('../pages/markets/USPage'));
const MarketCanadaPage   = lazy(() => import('../pages/markets/CanadaPage'));
const MarketGermanyPage  = lazy(() => import('../pages/markets/GermanyPage'));
const MarketFrancePage   = lazy(() => import('../pages/markets/FrancePage'));
const MarketUKPage       = lazy(() => import('../pages/markets/UKPage'));
const MarketNorwayPage   = lazy(() => import('../pages/markets/NorwayPage'));
const ReferPage          = lazy(() => import('../pages/ReferPage'));
const ProviderProfilePage = lazy(() => import('../pages/ProviderProfilePage'));
const ProvidersDirectoryPage = lazy(() => import('../pages/ProvidersDirectoryPage'));
const Footer             = lazy(() => import('./Footer'));
const LiveBookingTicker  = lazy(() => import('./global/LiveBookingTicker'));
const FloatingChat       = lazy(() => import('./global/FloatingChat'));
const ExitIntentModal    = lazy(() => import('./global/ExitIntentModal'));
const MobileBottomNav    = lazy(() => import('./global/MobileBottomNav'));
const PWAInstallPrompt   = lazy(() => import('./global/PWAInstallPrompt'));
const StickyQuoteBar     = lazy(() => import('./global/StickyQuoteBar'));
const ScrollProgress     = lazy(() => import('./global/ScrollProgress'));
const CompareBar         = lazy(() => import('./global/CompareBar'));
const CommandPalette     = lazy(() => import('./global/CommandPalette'));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AppLayout() {
  const { currentPage, setPage } = useApp();
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  /* Scroll to the top of the viewport whenever the current page
   * changes. Without this, clicking a link from deep down the page
   * (e.g. anything in the footer) renders the new page but leaves
   * the scroll position where it was, so the customer lands on the
   * bottom of the new page instead of its hero. */
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentPage]);

  /* ── Inbound shared-quote handler (Wave 19) ────────────────
   * If a customer arrives with `?q=<token>` in the URL — typically
   * forwarded by a partner / spouse / housemate — decode the
   * embedded brief, save it to their local quote store with a
   * "shared with you" label, navigate to the matching country
   * shopfront, and clean the URL so a refresh doesn't re-trigger.
   * Runs once at boot. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('q');
    if (!token) return;

    let cancelled = false;
    void Promise.all([
      import('../lib/saved-quotes-store'),
      import('../lib/analytics'),
    ]).then(([store, analytics]) => {
      if (cancelled) return;
      const payload = store.decodeSharedQuote(token);
      if (!payload) return;
      store.saveQuote({ ...payload, label: payload.label ?? 'Shared with you' });
      analytics.track('shared_quote_received', { country: payload.country });

      /* Clean the URL so the customer doesn't re-import on refresh. */
      params.delete('q');
      const cleanedSearch = params.toString();
      const cleanedPath   = window.location.pathname + (cleanedSearch ? `?${cleanedSearch}` : '');
      window.history.replaceState({}, '', cleanedPath);

      /* Land on the matching country shopfront — the imported quote
       * sits in MyBookings → Saved quotes ready to resume. */
      setPage(`market-${payload.country}` as typeof currentPage);
    });
    return () => { cancelled = true; };
  }, [setPage]);

  /* Global ⌘K / Ctrl-K → command palette. Closes on Esc inside the
   * palette itself. Suppresses the browser's "save as" dialog. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isModK =
        (e.key === 'k' || e.key === 'K') &&
        (e.metaKey || e.ctrlKey) &&
        !e.altKey && !e.shiftKey;
      if (isModK) {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const legalPages = ['terms', 'privacy', 'liability', 'driver-terms'];
  /* The auth callback page is a transient, full-screen landing surface
   * for Supabase email-confirmation / OAuth redirects — chrome would
   * just be visual noise during the ~100 ms session handoff. */
  const showHeader = currentPage !== 'auth-callback';
  const showFooter = !['booking', 'driver-portal', 'admin', 'auth-callback'].includes(currentPage);
  /* Live booking ticker is a marketplace social-proof element — only
   * show it on customer-discovery surfaces (home, country pages,
   * marketplace, how-it-works). Suppressed on dashboards, auth, and
   * payment surfaces where it would distract. */
  const showTicker = ['home','marketplace','how-it-works','providers','cities','enterprise-relocation','partners','about','universities','market-us','market-canada','market-germany','market-france','market-uk','market-norway','refer','provider-profile','providers-directory'].includes(currentPage);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':             return <HomePage />;
      case 'booking':          return <BookingFlow />;
      case 'driver-portal':    return <DriverPortal />;
      case 'driver-onboarding':return <DriverOnboarding />;
      case 'checklist':        return <MovingChecklist />;
      case 'subscriptions':    return <SubscriptionPlans />;
      case 'van-guide':           return <VanGuide />;
      case 'customer-dashboard':  return <CustomerDashboard />;
      case 'my-bookings':         return <MyBookings />;
      case 'admin':               return <AdminDashboard />;
      case 'terms':               return <TermsPage />;
      case 'privacy':          return <PrivacyPage />;
      case 'liability':        return <LiabilityPage />;
      case 'driver-terms':     return <DriverTermsPage />;
      case 'services':          return <ServicesPage />;
      case 'corporate':              return <CorporatePage />;
      case 'corporate-dashboard':    return <CorporateDashboard />;
      case 'bulk-booking':           return <CorporateBulkBookingPage />;
      case 'recurring-deliveries':   return <RecurringDeliveriesPage />;
      case 'company-dashboard-info': return <CompanyDashboardInfoPage />;
      case 'invoice-billing':        return <InvoiceBillingPage />;
      case 'corporate-api-access':   return <CorporateApiAccessPage />;
      case 'profile':                return <ProfilePage />;
      case 'about':                  return <AboutUsPage />;
      case 'contact':                return <ContactPage />;
      case 'faq':                    return <FaqPage />;
      case 'help':                   return <HelpCenterPage />;
      case 'safety':                 return <SafetyPage />;
      case 'careers':                return <CareersPage />;
      case 'press':                  return <PressPage />;
      case 'sustainability':         return <SustainabilityPage />;
      case 'tracking':               return <TrackingPage />;
      case 'payment':                return <PaymentPage />;
      case 'auth-callback':          return <AuthCallbackPage />;
      case 'driver-application-status': return <DriverApplicationStatusPage />;
      case 'marketplace':            return <MarketplacePage />;
      case 'how-it-works':           return <HowItWorksPage />;
      case 'providers':              return <ProvidersPage />;
      case 'cities':                 return <CitiesPage />;
      case 'enterprise-relocation':  return <EnterpriseRelocationPage />;
      case 'compliance':             return <CompliancePage />;
      case 'partners':               return <PartnersPage />;
      case 'universities':           return <UniversitiesPage />;
      case 'market-us':              return <MarketUSPage />;
      case 'market-canada':          return <MarketCanadaPage />;
      case 'market-germany':         return <MarketGermanyPage />;
      case 'market-france':          return <MarketFrancePage />;
      case 'market-uk':              return <MarketUKPage />;
      case 'market-norway':          return <MarketNorwayPage />;
      case 'refer':                  return <ReferPage />;
      case 'provider-profile':       return <ProviderProfilePage />;
      case 'providers-directory':    return <ProvidersDirectoryPage />;
      case 'not-found':              return <NotFoundPage />;
      default:                       return <NotFoundPage />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Skip-to-content link — invisible until keyboard-focused.
          A11y must-have so keyboard users can bypass the long header
          and global chrome and jump straight into the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-slate-900 focus:font-bold focus:rounded-lg focus:shadow-xl"
      >
        Skip to main content
      </a>
      {/* Top-of-page scroll progress bar — orient the reader on long pages */}
      <Suspense fallback={null}>
        <ScrollProgress currentPage={currentPage} />
      </Suspense>
      {showHeader && <Header />}
      <AuthModal />
      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          {renderPage()}
        </Suspense>
      </main>
      {showFooter && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
      {showTicker && (
        <Suspense fallback={null}>
          <LiveBookingTicker />
        </Suspense>
      )}
      {/* Floating support widget — present on every page except auth-callback */}
      {currentPage !== 'auth-callback' && (
        <Suspense fallback={null}>
          <FloatingChat />
        </Suspense>
      )}
      {/* Exit-intent newsletter capture — only on customer-discovery pages.
          Touch devices skip this client-side. */}
      {showTicker && (
        <Suspense fallback={null}>
          <ExitIntentModal />
        </Suspense>
      )}
      {/* Mobile bottom navigation — visible <lg, hidden on certain
          full-screen surfaces (booking flow / payment / auth-callback). */}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      {/* PWA install prompt — fires on the beforeinstallprompt event
          when the manifest qualifies; falls back to a soft iOS hint. */}
      {currentPage !== 'auth-callback' && (
        <Suspense fallback={null}>
          <PWAInstallPrompt />
        </Suspense>
      )}
      {/* Sticky quote bar — drops in once the customer has scrolled
          past the hero, so the conversion path stays one click away
          deep on the page. */}
      {showTicker && (
        <Suspense fallback={null}>
          <StickyQuoteBar />
        </Suspense>
      )}
      {/* Provider-comparison floating bar. Only renders when the
          customer has at least one provider in the compare shortlist;
          the component itself self-suppresses on /book and /payment. */}
      <Suspense fallback={null}>
        <CompareBar />
      </Suspense>
      {/* ⌘K / Ctrl-K command palette. Mounted globally so power
          users can navigate from any page. Hidden on auth-callback
          (full-screen Supabase handoff). */}
      {currentPage !== 'auth-callback' && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
