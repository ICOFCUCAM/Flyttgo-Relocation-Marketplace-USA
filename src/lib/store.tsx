
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { pageToPath, pathToPage, applyPageMeta } from './pageRoutes';

export type Page =
  | 'home' | 'booking' | 'subscriptions' | 'customer-dashboard'
  | 'driver-portal' | 'admin' | 'my-bookings' | 'van-guide'
  | 'checklist' | 'driver-onboarding' | 'terms' | 'privacy'
  | 'liability' | 'driver-terms' | 'services' | 'corporate'
  | 'bulk-booking' | 'recurring-deliveries' | 'company-dashboard-info'
  | 'invoice-billing' | 'corporate-api-access' | 'corporate-dashboard'
  | 'profile'
  /* Informational / marketing pages referenced from the footer. */
  | 'about' | 'contact' | 'faq' | 'help' | 'safety'
  | 'careers' | 'press' | 'sustainability'
  /* Real-time delivery tracking + payment/escrow checkout. */
  | 'tracking' | 'payment'
  /* Supabase auth post-confirmation / OAuth landing page. */
  | 'auth-callback'
  /* Driver onboarding status (pending / approved / rejected). */
  | 'driver-application-status'
  /* Marketplace repositioning surfaces (Phase 12). */
  | 'marketplace' | 'how-it-works' | 'providers' | 'cities'
  | 'enterprise-relocation' | 'compliance' | 'partners'
  /* Global Logistics & Relocation Marketplace surfaces. */
  | 'universities'
  | 'market-us' | 'market-canada' | 'market-germany'
  | 'market-france' | 'market-uk' | 'market-norway'
  /* Referral program surface. */
  | 'refer'
  /* Provider profile (slug carried via ?slug= query param). */
  | 'provider-profile'
  /* Provider directory (search + filter). */
  | 'providers-directory'
  /* Side-by-side provider comparison (Wave 30). */
  | 'compare'
  /* Service-category landing page (Wave 31).
   *
   * Slug carried via the URL path segment (`/services/long-distance`)
   * rather than a `?slug=` query param so the page reads as a real
   * SEO target. pathToPage prefix-matches /services/. */
  | 'service-category'
  /* Per-corridor SEO landing page — /corridor/<country>/<slug>.
   *
   * Country + slug carried via URL path segments rather than a
   * query string so each corridor reads as a real SEO target.
   * pathToPage prefix-matches /corridor/. */
  | 'corridor'
  /* Expansion-country shopfronts — first wave + second wave. Each
   * is a rollout-status shopfront (booking widget hidden until the
   * country's payment + address autocomplete are wired). See
   * src/lib/expansion-cities.ts for the registry. */
  | 'market-nl' | 'market-se' | 'market-es' | 'market-it' | 'market-pl'
  | 'market-dk' | 'market-be' | 'market-at' | 'market-ch' | 'market-cz' | 'market-cy'
  /* Strategic-city SEO landing page — /moving-<slug>. Slug is
   * looked up against ANCHOR_CITIES; pathToPage prefix-matches
   * /moving-. */
  | 'moving-city'
  /* US pricing transparency landing page. */
  | 'pricing'
  /* Provider-facing pricing settings (driver portal). */
  | 'provider-pricing-settings'
  /* Public preview of country-specific onboarding requirements. */
  | 'provider-requirements'
  /* Customer quote-approval workflow (long-distance / international /
   * complex labor briefs). Companion to the instant-booking flow. */
  | 'request-quote'
  /* Customer dispute filing + inbox. */
  | 'dispute'
  /* Institutional gateway pages — corporate / government / NGO /
   * pilot frameworks. Companion to the existing /enterprise-relocation
   * + /universities + /corporate marketing surfaces. */
  | 'government-programs'
  | 'ngo-deployment'
  | 'pilot-deployment-programs'
  /* Email-token landing for organization invites. */
  | 'accept-org-invite'
  /* Procurement-compatible institutional access layer. */
  | 'vendor-pack'
  | 'procurement-rfp'
  | 'deployment-regions'
  | 'capability-brief'
  /* Back-Office System (BOS). Single Page id covers /backoffice +
   * every /backoffice/<slug> sub-route — the BOS sub-router reads
   * the slug from window.location.pathname. Permission-gated;
   * users without a bos_user_roles row see a denial panel. */
  | 'backoffice'
  /* Brand showcase — every <FlyttGoLogo> variant + the standalone
   * favicon and apple-touch-icon rendered side by side. Public
   * route, useful for designers / partners. */
  | 'brand'
  /* Fallback for URLs that don't match any known route. */
  | 'not-found';

interface AppState {
  currentPage: Page;
  setPage: (page: Page) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'signin' | 'signup' | 'driver-signup';
  setAuthMode: (mode: 'signin' | 'signup' | 'driver-signup') => void;
  bookingData: BookingData;
  setBookingData: (data: Partial<BookingData>) => void;
  resetBooking: () => void;
}

/**
 * Structured US address — mirrors the shape returned by
 * GlobalAddressAutocomplete.onSelect (Kartverket lookup). When the
 * homepage Booking Widget produces one of these, we stash it in
 * BookingData so BookingFlow can pre-fill its address fields without
 * the customer having to re-enter anything.
 */
export type BookingCountry = 'us' | 'ca' | 'de' | 'fr' | 'gb' | 'no';

/**
 * Payment method the customer has selected on the booking widget.
 *   - 'card_full'         : pay 100% online up front
 *   - 'card_deposit_cash' : pay the country's deposit % online,
 *                           remainder in cash to the driver on completion
 *
 * Cash availability is country-scoped — see COUNTRY_PAYMENT.cashEnabled
 * in lib/constants.ts. The widget hides the cash option in markets
 * where it isn't offered.
 */
export type PaymentMethod = 'card_full' | 'card_deposit_cash';

export interface USAddressData {
  street_name: string;
  house_number: string;
  postcode: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  formatted: string;
}

export interface BookingData {
  step: number;
  /** Country the booking is being made in. Drives which national
   *  marketplace (and which address autocomplete scope) the booking
   *  flow operates against. Set by the country page hero before
   *  navigating to /book. */
  country: BookingCountry;
  pickupAddress: string; pickupLat?: number | null; pickupLng?: number | null;
  pickupPostcode?: string; pickupCity?: string;
  pickupAddressData?: USAddressData;
  dropoffAddress: string; dropoffLat?: number | null; dropoffLng?: number | null;
  dropoffPostcode?: string; dropoffCity?: string;
  dropoffAddressData?: USAddressData;
  distanceKm?: number | null; durationMinutes?: number | null;
  moveType: string; propertyType: string; bedrooms: string;
  inventory: Record<string, number>; vanType: string; helpers: number;
  additionalServices: string[]; moveDate: string; moveTime: string;
  name: string; phone: string; email: string; notes: string;
  estimatedPrice: number; estimatedVolume: number;
  /* Payment selection — see PaymentMethod above. Defaults to 'card_full';
   * the booking widget flips this to 'card_deposit_cash' when the
   * customer clicks "Pay with cash" in markets where COUNTRY_PAYMENT
   * has cashEnabled=true. */
  paymentMethod:    PaymentMethod;
  /** Resolved deposit charged online when the customer selects cash. */
  depositAmount?:   number;
  /** Resolved cash-on-delivery amount due to the driver. */
  cashDueAmount?:   number;
  /** Promo code applied at the booking widget. Stored uppercase. */
  promoCode?:       string;
  /** Discount fraction (0–1) resolved for the promo code. The booking
   *  flow + payment step use this to gross-down the final total. */
  promoDiscountPct?: number;
  /** Provider the Smart Matching Engine recommended at quote-widget
   *  submit time. The booking flow / dispatch trigger can use this
   *  as a hint for who to route to first. */
  suggestedProviderUserId?: string;
  suggestedMatchScore?:     number;
}

const defaultBooking: BookingData = {
  step: 1, country: 'us',
  pickupAddress: '', pickupLat: null, pickupLng: null,
  pickupPostcode: '', pickupCity: '', dropoffAddress: '', dropoffLat: null,
  dropoffLng: null, dropoffPostcode: '', dropoffCity: '', distanceKm: null,
  durationMinutes: null, moveType: '', propertyType: '', bedrooms: '',
  inventory: {}, vanType: '', helpers: 0, additionalServices: [],
  moveDate: '', moveTime: '', name: '', phone: '', email: '', notes: '',
  estimatedPrice: 0, estimatedVolume: 0,
  paymentMethod: 'card_full',
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  /* Seed the page state from the URL so deep links / browser refresh
   * / share links open the right view instead of always booting to
   * the home page. SSR-safe: falls back to 'home' outside the
   * browser. */
  const initialPage: Page =
    typeof window !== 'undefined' ? pathToPage(window.location.pathname) : 'home';

  const [currentPage, setCurrentPage] = useState<Page>(initialPage);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'driver-signup'>('signin');
  const [bookingData, setBookingDataState] = useState<BookingData>(defaultBooking);

  /* setPage acts as a navigation call: it updates the in-memory
   * page state AND pushes a history entry so the URL changes, the
   * back button works, and the page is shareable. Components don't
   * have to know anything about routing — they still call setPage. */
  const setPage = useCallback((page: Page) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      /* Don't rewrite the URL when showing the 404 page — the user's
       * original URL should stay in the address bar so they can copy
       * it into a bug report and so a refresh hits the same path. */
      if (page === 'not-found') return undefined;
      const path = pageToPath(page);
      const samePath = window.location.pathname === path;
      if (!samePath) {
        window.history.pushState({ page }, '', path);
      }
      /* Reset scroll on every cross-page navigation so a footer
       * link from deep on Page A lands at the top of Page B —
       * not at the equivalent scroll offset. Skip when the path
       * didn't change (in-page state updates shouldn't yank the
       * viewport). */
      if (!samePath) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
  }, []);

  /* Back / forward button handling — sync our page state from the
   * URL that the browser navigates to. We never pushState from here
   * to avoid feedback loops. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => {
      setCurrentPage(pathToPage(window.location.pathname));
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* Keep SEO meta (<title>, meta description, canonical link,
   * OpenGraph and Twitter cards) in sync with the current page so
   * browser tabs, link previews on Slack/WhatsApp/LinkedIn, and
   * search-engine snippets all pick up the right copy per route. */
  useEffect(() => {
    applyPageMeta(currentPage);
  }, [currentPage]);

  const setBookingData = (data: Partial<BookingData>) => {
    setBookingDataState(prev => ({ ...prev, ...data }));
  };

  const resetBooking = () => setBookingDataState(defaultBooking);

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setPage,
        showAuthModal,
        setShowAuthModal,
        authMode,
        setAuthMode,
        bookingData,
        setBookingData,
        resetBooking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
